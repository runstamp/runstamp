/**
 * chartBlock — thin pass-through to the engine's native chart renderer.
 *
 * Unlike waterfallBars (which we draw manually with View + Text nodes so
 * the aesthetic bends entirely to tokens), chartBlock delegates to the
 * engine's real chart pipeline — categories, series, axes, legends, the
 * whole cx:chart XML. This is necessary for line charts, scatter,
 * stacked bar, pie, etc. where manual rectangle rendering doesn't cut it.
 *
 * What this primitive adds on top of raw ChartData:
 *   - Auto-fills series colors from `palette` when caller omits them,
 *     cycling accent → muted → faint so charts are token-consistent.
 *   - Auto-fills font families from `type.body` on axes/legend/title so
 *     chart typography matches the deck.
 *
 * Callers pass a `ChartData`-shaped object (schema lives in the engine,
 * not here). Anything the caller sets explicitly wins — the primitive
 * only fills in blanks. This preserves the "open token schema" contract
 * while still giving aesthetic coherence by default.
 *
 * Content adaptation: none. Charts render at the region size they're
 * given; the engine handles its own internal layout.
 */
import type { Primitive } from "./primitive.js";
export interface ChartBlockInput {
    /** A ChartData-shaped object. Typed as `unknown` here — callers that
     *  want type safety should import ChartData from @runstamp/core and
     *  cast at the boundary. */
    chartData: unknown;
    /** Optional accessibility text. */
    altText?: string;
    /** When true, skip token-based color/font fill-in. Use when the caller
     *  has supplied a fully-specified chart and wants it rendered as-is. */
    preserveCallerStyling?: boolean;
}
export declare const chartBlock: Primitive<ChartBlockInput>;
//# sourceMappingURL=chartBlock.d.ts.map