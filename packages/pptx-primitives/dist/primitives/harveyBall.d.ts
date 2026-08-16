/**
 * harveyBall — five-state pie indicator (0/4, 1/4, 2/4, 3/4, 4/4).
 *
 * Used on Bain p22 / p24 capability matrices. Renders as an outline
 * circle with a filled wedge spanning N quadrants, starting at 12
 * o'clock and going clockwise. The empty state is a hollow circle;
 * the full state is a solid filled circle.
 *
 * Tokens consumed:
 *   - palette.foreground (filled wedge + outline)
 *   - palette.surface (background of unfilled portion)
 */
import type { Primitive } from "./primitive.js";
export interface HarveyBallInput {
    /** Filled quadrants, 0..4. */
    filled: 0 | 1 | 2 | 3 | 4;
}
export declare const harveyBall: Primitive<HarveyBallInput>;
//# sourceMappingURL=harveyBall.d.ts.map