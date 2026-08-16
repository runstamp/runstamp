/**
 * sectionRibbon — optional full-width header bar with a tracked-caps label.
 *
 * LG's load-bearing element: the thin black bar across the top of every
 * non-title content slide, carrying "INTRODUCTION" / "PHASE 1 — MACRO &
 * MICRO TREND ANALYSIS" tracked wide across the middle.
 *
 * When `chrome.headerRibbon.enabled = false` (Bain and minimal bundles),
 * the primitive returns an empty result — so the same composition can be
 * used across ribbon-ful and ribbon-less bundles without branching.
 *
 * The ribbon owns a fixed height from the top of the slide; the caller
 * passes that region explicitly (typically `{left: 0, top: 0, width:
 * slide.width, height: chrome.headerRibbon.height}`). The ribbon does not
 * reach into the slide layout budget — that's the compiler's job.
 */
import type { Primitive } from "./primitive.js";
export interface SectionRibbonInput {
    /** Label placed inside the ribbon. Typically uppercased by the token
     *  transform; callers don't need to pre-upper. */
    label: string;
}
export declare const sectionRibbon: Primitive<SectionRibbonInput>;
//# sourceMappingURL=sectionRibbon.d.ts.map