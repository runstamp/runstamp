/**
 * Fontkit-backed metrics provider.
 *
 * Built once per render from the caller's font buffers. Returns a
 * synchronous `MetricsProvider` closure that primitives can consult during
 * layout. The async work (parsing fonts) happens before primitives run;
 * the provider itself never awaits.
 *
 * Conventions:
 *   - One entry per (family, style). Bold/italic variants are separate
 *     entries flagged via the `bold`/`italic` booleans. The default
 *     resolution always picks the regular weight; callers requesting bold
 *     metrics for layout purposes (heavy titles inflate widths) can pass
 *     a `weight: "bold"` row whose `family` matches what
 *     `tokens.type.X.family` references.
 *   - Multiple buffers for the same family are merged: regular metrics
 *     win for the `avgWidthRatio` baseline; the regular face also drives
 *     `lineHeightPx`. Width measurements always select the closest face
 *     to the requested run (treated as regular here — Phase 5 doesn't
 *     yet expose the requested weight to the provider; reserved for
 *     when primitives forward style hints).
 *
 * The `avgWidthRatio` derived here uses the OS/2 table's `xAvgCharWidth`
 * when available, otherwise samples a representative ASCII string. Both
 * fall back gracefully — the provider never throws on a malformed font;
 * it returns `null` for unknown families and lets the empirical table
 * take over.
 */
import type { MetricsProvider } from "./metricsProvider.js";
export interface FontkitFontEntry {
    /** Family name as referenced by `tokens.type.X.family`. */
    family: string;
    /** Decoded font file bytes (.ttf, .otf, .woff, .woff2 acceptable to
     *  fontkit). Pass `Buffer` or `Uint8Array`. */
    buffer: Buffer | Uint8Array;
    /** True if this buffer is the bold face. Default false. */
    bold?: boolean;
    /** True if this buffer is the italic face. Default false. */
    italic?: boolean;
}
/**
 * Build a synchronous `MetricsProvider` from a list of font buffers.
 *
 * The function does the parsing work eagerly — `fontkit.create()` is
 * synchronous given a buffer — so the returned provider has zero async
 * surface. Callers responsible for buffer I/O should fetch / read fonts
 * before calling.
 *
 * Multiple entries for the same family are accepted; the regular face
 * (no `bold` and no `italic`) is preferred for the family's glyph
 * metrics. If only a non-regular face is supplied, that one is used.
 */
export declare function buildFontkitMetricsProvider(fonts: FontkitFontEntry[]): MetricsProvider;
//# sourceMappingURL=fontkitProvider.d.ts.map