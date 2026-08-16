/**
 * sectionTag — short left-aligned "pill" carrying a section label.
 *
 * The Bain signature tag that sits directly under the title rule, holding
 * labels like "S-curve approach", "[Back-up]", or "Phase 1". Unlike
 * sectionRibbon (LG full-width bar across the top of the slide), this is
 * a narrow content-region tag: flush to the left edge, width hugging
 * content + padding, dark fill with inverse text.
 *
 * Caller typically allocates a thin horizontal region below the title
 * block and hands it here. The pill consumes the region's left portion
 * and width is driven by content; excess width is discarded.
 *
 * Tokens consumed:
 *   - palette.muted or palette.foreground (fill), palette.accentInverse (text)
 *   - type.caption (text role; tracked-caps transform applied)
 *   - spacing.xs (internal padding)
 *
 * Content adaptation: no wrap. If label is long enough to exceed
 * region.width, compresses letter-spacing down to MIN_COMPRESSION, then
 * reports `clipped`.
 */
import type { Primitive } from "./primitive.js";
export interface SectionTagInput {
    /** Label content, e.g. "S-curve approach". Caller need not pre-upper. */
    label: string;
    /** Force fill color role. Default: "foreground" (darker tag). */
    fill?: "foreground" | "muted" | "accent";
    /** Transform override. Default "upper" — matches consulting style. */
    transform?: "none" | "upper";
}
export declare const sectionTag: Primitive<SectionTagInput>;
//# sourceMappingURL=sectionTag.d.ts.map