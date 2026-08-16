/**
 * Shared text-width + text-height estimators.
 *
 * Primitives use these to size content before committing coordinates to
 * the AST. The estimates are conservative (tend to over-estimate) so that
 * layouts that pass estimate-based checks also pass the engine's real
 * metric pass. This is the cheap first-pass substitute for calling into
 * the engine's font metrics.
 *
 * Two paths:
 *   1. **Empirical** — `WIDTH_RATIO_BY_FAMILY` lookup × char count, plus a
 *      simple word-break line counter. Always available, no font I/O.
 *   2. **Real metrics** — when a `MetricsProvider` is wired up (either
 *      passed explicitly or attached to the resolved tokens via
 *      `attachMetricsProvider`), the estimators delegate to the
 *      provider's `measureWidthPx` / `lineHeightPx` callbacks. This is
 *      what fontkit-backed callers use to get exact glyph-advance width
 *      and font-derived line heights instead of family heuristics.
 *
 * Each estimator accepts a `MetricsProvider | ResolvedTokens | null`
 * second arg. Passing tokens directly is the common case — primitives
 * already have them — and the helper looks up the attached provider via
 * `getMetricsProvider`. Passing a provider explicitly is for tests or
 * non-tokens callers.
 */
import type { ResolvedTokens } from "../tokens/schema.js";
import type { TextRun } from "../layout/types.js";
import { type MetricsProvider } from "./metricsProvider.js";
/** A `MetricsProvider`, a `ResolvedTokens` (with attached provider), or
 *  null. Estimators normalize whichever the caller passes. */
export type MetricsSource = MetricsProvider | ResolvedTokens | null | undefined;
export interface TextMeasureInput {
    content: string;
    family: string;
    sizePt: number;
    letterSpacing?: number;
    /** True for uppercase content; widens the average ratio slightly. */
    uppercase?: boolean;
    /** True when the content is all digits; tabular figures are narrower than
     *  the average, letters are wider. Callers know which case applies. */
    digitsOnly?: boolean;
}
/** Estimated rendered width in px.
 *
 * When the metrics source provides `measureWidthPx`, the result is the
 * font's actual glyph-advance sum (plus letter-spacing tracking). Otherwise
 * the empirical ratio table is used. */
export declare function estimateTextWidth(input: TextMeasureInput, source?: MetricsSource): number;
/**
 * Estimated rendered line height in **pixels** for a single line.
 *
 * Resolution order:
 *   1. Explicit `lineHeightPt` (caller override, always wins).
 *   2. Provider's `lineHeightPx(sizePt)` when available.
 *   3. Heuristic `sizePt * 1.2`.
 *
 * The input `lineHeightPt` (and the token schema) is in points (PPTX
 * convention); slide-space rects are in pixels.
 */
export declare function estimateLineHeight(sizePt: number, lineHeightPt?: number, source?: MetricsSource, family?: string): number;
/**
 * Rough line-breaking estimator. Returns the number of lines a content
 * string will consume inside a `width` (px) container at the given font
 * metrics. Breaks only at whitespace; does not hyphenate.
 *
 * When a provider supplies `measureWidthPx`, individual word widths are
 * computed by the font; otherwise the empirical ratio table is used.
 * Either way the algorithm is the same — only the per-word width source
 * changes.
 */
export declare function estimateLineCount(input: TextMeasureInput & {
    width: number;
}, source?: MetricsSource): number;
/**
 * Convenience: measure a string using a resolved type role. The provider
 * (when present) is read from the tokens via WeakMap lookup, so a single
 * `attachMetricsProvider(tokens, provider)` call upstream upgrades every
 * `measureByRole` call site automatically.
 */
export declare function measureByRole(content: string, role: keyof ResolvedTokens["type"], tokens: ResolvedTokens, opts?: {
    width?: number;
}): {
    width: number;
    lines: number;
    lineHeight: number;
};
/** Collapse a run array to a flat string for empirical estimators that
 *  don't care about per-run styling (e.g., line-count counters that just
 *  need the character stream). Run breaks add no whitespace. */
export declare function flattenRuns(runs: TextRun[]): string;
/** Sum estimated widths across a run array. Each run's font/size override
 *  is applied; runs without overrides fall through to the base TextNode
 *  style. Used by primitives that emit `runs: TextRun[]` and need to
 *  size their rect against the actual glyph stream. */
export declare function estimateRunsWidth(runs: TextRun[], base: {
    family: string;
    sizePt: number;
    letterSpacing?: number;
    uppercase?: boolean;
}, source?: MetricsSource): number;
/**
 * Apply a type role's `transform` to text content.
 */
export declare function applyTypeTransform(content: string, transform: ResolvedTokens["type"]["display"]["transform"]): string;
//# sourceMappingURL=estimateText.d.ts.map