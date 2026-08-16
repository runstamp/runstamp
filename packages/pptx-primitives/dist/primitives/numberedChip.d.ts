/**
 * numberedChip — small filled square (or circle) holding an index number.
 * Used on Bain p14 / p19 as a step counter or "1/2/3" sequence marker.
 *
 * Tokens consumed:
 *   - palette.foreground (default fill)
 *   - palette.accentInverse (text color)
 *   - type.caption (text role)
 */
import type { Primitive } from "./primitive.js";
export interface NumberedChipInput {
    index: number;
    /** Chip shape. Default "rect". */
    shape?: "rect" | "ellipse" | "roundRect";
    /** Fill color role. Default "foreground". */
    fill?: "foreground" | "muted" | "accent";
    /** Optional prefix/suffix around the number ("Step 1", "1." etc.). */
    prefix?: string;
    suffix?: string;
    /** Fixed chip size in px. Anchors inside the supplied region. */
    size?: number;
    /** Fixed chip width/height in px when non-square chips are needed. */
    width?: number;
    height?: number;
    /** Where a fixed-size chip sits within the supplied region. Default top-left. */
    anchor?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "center";
}
export declare const numberedChip: Primitive<NumberedChipInput>;
//# sourceMappingURL=numberedChip.d.ts.map