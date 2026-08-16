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
/** A no-op provider that always returns null, causing callers to fall back
 *  to the empirical estimator. Exported so tests can be explicit. */
export const NULL_METRICS_PROVIDER = () => null;
// ---------------------------------------------------------------------------
// Tokens-attached provider
// ---------------------------------------------------------------------------
//
// Resolved tokens are zod-validated and frozen-shaped, so we can't add a
// non-serializable function field to them directly. Instead we keep a
// WeakMap from the tokens object to the provider. Estimators look up the
// provider when handed a tokens object; primitives don't change shape.
const TOKEN_PROVIDERS = new WeakMap();
/** Associate a metrics provider with a resolved tokens object. Subsequent
 *  estimator calls passed those tokens consult the provider for real
 *  metrics. Replaces any prior association. */
export function attachMetricsProvider(tokens, provider) {
    TOKEN_PROVIDERS.set(tokens, provider);
}
/** Retrieve the metrics provider associated with a tokens object, or null
 *  if no provider was attached. Estimators use this to enable the real-
 *  metrics path automatically. */
export function getMetricsProvider(tokens) {
    return TOKEN_PROVIDERS.get(tokens) ?? null;
}
/** Remove the metrics provider association (mostly useful in tests that
 *  reuse a tokens fixture across with/without-provider scenarios). */
export function detachMetricsProvider(tokens) {
    TOKEN_PROVIDERS.delete(tokens);
}
//# sourceMappingURL=metricsProvider.js.map