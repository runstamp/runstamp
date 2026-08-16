/**
 * groupBorder — dashed-rect outline that wraps a region group, with
 * optional bottom-right label. Used on Bain p6 to call out
 * "Traditional retail area" sections of a matrix.
 *
 * Tokens consumed:
 *   - palette.muted (default border color)
 *   - type.caption (label text role)
 */
import type { Primitive } from "./primitive.js";
export interface GroupBorderInput {
    /** Optional label rendered at the bottom-right corner. */
    label?: string;
    /** Border color role. */
    color?: "foreground" | "muted" | "faint" | "accent";
    /** Border width in px. */
    width?: number;
    /** Border style. */
    style?: "solid" | "dashed" | "dotted";
}
export declare const groupBorder: Primitive<GroupBorderInput>;
//# sourceMappingURL=groupBorder.d.ts.map