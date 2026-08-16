/**
 * bulletList — depth-aware list with token-driven marker styling.
 *
 * Reads ornament.bullet for marker choice (filledDot / openDot / enDash /
 * square / chevron / none), marker color role, marker gap, indent per
 * nested level, and a separate nestedMarker for level 2+.
 *
 * This is Bain's bread-and-butter. Bain items = { marker: filledDot,
 * color: accent, nestedMarker: enDash, color muted }. A minimal token
 * bundle yields small dark dots on black. LG-shaped bundles typically
 * disable bullets entirely (`marker: "none"`) — in which case list items
 * render as unmarked paragraphs with indent-only hierarchy.
 *
 * Content adaptation:
 *   - Items wrap naturally within the region width.
 *   - Total height exceeding the region paginates: remaining items are
 *     returned via overflow.remaining for the compiler to place on a
 *     continuation slide.
 *   - No compression; if a single item is too tall alone, it clips
 *     (callers should split items before hitting this primitive).
 */
import type { Primitive } from "./primitive.js";
export interface BulletListInput {
    items: BulletItem[];
    /** Optional opaque continuation payload from a prior paginated render. */
    resume?: {
        startIndex: number;
    };
}
export interface BulletItem {
    text: string;
    /** 1 = top-level, 2 = nested. Clamped to [1, 2] for now. */
    level?: number;
}
export declare const bulletList: Primitive<BulletListInput>;
//# sourceMappingURL=bulletList.d.ts.map