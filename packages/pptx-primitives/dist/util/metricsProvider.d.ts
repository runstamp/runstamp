/**
 * Metrics provider seam.
 *
 * By default, primitives size text using the empirical ratio table in
 * `estimateText.ts`. Those values are conservative — they over-report
 * width by ~5% so primitives prefer to compress rather than overflow.
 * That's safe (never causes reliability failures) but suboptimal.
 *
 * Callers with real font metrics inject them through this seam:
 *
 *   import { buildFontkitMetricsProvider, attachMetricsProvider } from
 *     "@runstamp/pptx-primitives";
 *
 *   const provider = buildFontkitMetricsProvider([
 *     { family: "Lato", buffer: latoRegularBuffer },
 *     { family: "Lato", buffer: latoBoldBuffer, bold: true },
 *   ]);
 *   const tokens = resolveTokens(bundle);
 *   attachMetricsProvider(tokens, provider);
 *
 * Once attached, every estimator inside primitives that's passed `tokens`
 * picks up the provider automatically. Primitives never await; provider
 * lookup is synchronous after the one-time async font load on the caller
 * side.
 *
 * The provider is "optional, additive": when no provider exists for a
 * given family the estimators fall back to the ratio table. This keeps
 * test fixtures that don't load fonts working unchanged.
 */
import type { ResolvedTokens } from "../tokens/schema.js";
export interface GlyphMetrics {
    /** Average advance width as a fraction of sizePt at 96/72 px-per-pt.
     *  Used as the empirical-style fallback when finer callbacks aren't
     *  supplied. 0.5 = glyph avg is half its point size. */
    avgWidthRatio: number;
    /** Typographic ascender as a fraction of em (baseline → top of caps,
     *  divided by unitsPerEm). Multiply by sizePt × 96/72 for px. */
    ascenderRatio?: number;
    /** Typographic descender as a positive fraction of em. */
    descenderRatio?: number;
    /** Optional exact-width measurer. When supplied, estimators call this
     *  with the actual glyph run to compute width in **px** at the given
     *  point size. Primitives stay synchronous; the provider must precompute
     *  whatever it needs (e.g., cached fontkit Font instance). */
    measureWidthPx?: (text: string, sizePt: number) => number;
    /** Optional line-height in **px** for a given point size, derived from
     *  the font's ascent/descent/lineGap. When supplied, estimators prefer
     *  this over the empirical `sizePt * 1.2` baseline (still overridable
     *  by an explicit `lineHeightPt`). */
    lineHeightPx?: (sizePt: number) => number;
}
export type MetricsProvider = (family: string) => GlyphMetrics | null;
/** A no-op provider that always returns null, causing callers to fall back
 *  to the empirical estimator. Exported so tests can be explicit. */
export declare const NULL_METRICS_PROVIDER: MetricsProvider;
/** Associate a metrics provider with a resolved tokens object. Subsequent
 *  estimator calls passed those tokens consult the provider for real
 *  metrics. Replaces any prior association. */
export declare function attachMetricsProvider(tokens: ResolvedTokens, provider: MetricsProvider): void;
/** Retrieve the metrics provider associated with a tokens object, or null
 *  if no provider was attached. Estimators use this to enable the real-
 *  metrics path automatically. */
export declare function getMetricsProvider(tokens: ResolvedTokens): MetricsProvider | null;
/** Remove the metrics provider association (mostly useful in tests that
 *  reuse a tokens fixture across with/without-provider scenarios). */
export declare function detachMetricsProvider(tokens: ResolvedTokens): void;
//# sourceMappingURL=metricsProvider.d.ts.map