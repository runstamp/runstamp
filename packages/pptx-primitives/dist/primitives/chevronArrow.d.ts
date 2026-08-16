/**
 * chevronArrow — standalone preset-geometry chevron pointing left or
 * right. Used as a between-section pointer on Bain p13.
 *
 * Tokens consumed:
 *   - palette.accent (default fill)
 *   - palette.accentInverse (default text color)
 *   - type.eyebrow (text role)
 */
import type { Primitive } from "./primitive.js";
export interface ChevronArrowInput {
    /** Direction the chevron points. Default "right". */
    direction?: "left" | "right";
    /** Optional label inside the chevron. */
    label?: string;
    /** Fill color role. Default "accent". */
    fill?: "accent" | "foreground" | "muted";
}
export declare const chevronArrow: Primitive<ChevronArrowInput>;
//# sourceMappingURL=chevronArrow.d.ts.map