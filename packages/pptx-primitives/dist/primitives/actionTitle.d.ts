/**
 * actionTitle — eyebrow + 1–2 line action title.
 *
 * The McKinsey-style action title pattern: a short uppercase eyebrow at the
 * top, followed by a 1–2 line declarative title carrying the slide's main
 * insight. Composes the existing sectionTag + textBlock primitives so the
 * caller doesn't have to manually wire two regions.
 *
 * Layout:
 *   - sectionTag occupies the top ~25% of the region (typically 1 grid row).
 *   - textBlock occupies the remaining ~75% (typically 2 grid rows) with
 *     `role: "title"`, `weight: 500`. Caller can override the title size.
 *
 * Designed for full-width regions (`colSpan: 12`, `rowSpan: 3`) but works at
 * any size — the eyebrow takes a fixed pixel band and the title gets the
 * rest. Returns `clipped` if either child clips.
 */
import type { Primitive } from "./primitive.js";
export interface ActionTitleInput {
    /** Optional eyebrow label (rendered as upper-cased pill). Omit for title-only. */
    eyebrow?: string;
    /** The action title sentence. May wrap to 2 lines. */
    title: string;
    /** Override the title font size. Default 22pt. */
    titleSize?: number;
    /** Override the title font weight. Default 500. */
    titleWeight?: number;
}
export declare const actionTitle: Primitive<ActionTitleInput>;
//# sourceMappingURL=actionTitle.d.ts.map