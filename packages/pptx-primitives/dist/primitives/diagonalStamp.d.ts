/**
 * diagonalStamp — rotated badge ("ILLUSTRATIVE", "PRELIMINARY", "DRAFT")
 * placed at a corner of the slide via pixel coords. Used on Bain p20 /
 * p21 to flag charts that haven't been finalized.
 *
 * Tokens consumed:
 *   - palette.muted (default text color — softer than foreground so the
 *     stamp doesn't fight the slide content)
 *   - type.eyebrow (tracked-out caps)
 */
import type { Primitive } from "./primitive.js";
export interface DiagonalStampInput {
    text: string;
    /** Rotation in degrees. Default -25 (tilted up-right). */
    rotation?: number;
    /** Color role. Default "muted". */
    color?: "muted" | "faint" | "foreground" | "accent";
}
export declare const diagonalStamp: Primitive<DiagonalStampInput>;
//# sourceMappingURL=diagonalStamp.d.ts.map