/**
 * titleBlock — slide title with optional eyebrow, subtitle, and rule.
 *
 * The single primitive that carries these three aesthetics from one
 * codepath, differing only in tokens:
 *
 *   Bain:     eyebrow (none, title only)
 *             title   bold sans ~30pt, black
 *             rule    "3px solid #DA291C + 1px solid #CCCCCC gap:1"
 *
 *   LG:       eyebrow ribbon nav or tracked caps, separate primitive
 *             title   stencil serif ~48pt tracked, black
 *             rule    "2px solid #000" or "none"
 *
 *   Minimal:  eyebrow small caps accent + letter-space
 *             title   sans ~28pt regular, foreground
 *             rule    "1px solid token:rule"
 *
 * Layout order (top → bottom):
 *   [eyebrow?]      (type.eyebrow role, color=palette.accent)
 *   [title]         (type.title role, color=palette.foreground)
 *   [subtitle?]     (type.body role, color=palette.muted)
 *   [rule?]         (rules.title pattern)
 *
 * Content adaptation:
 *   - Titles that wrap beyond 2 lines compress one step (0.9×) and retry.
 *     Further overflow returns `overflow.kind = "clipped"` — caller must
 *     shorten or split the title.
 *   - Eyebrow and subtitle are single-line; they either fit or don't.
 *     No compression attempted on chrome-level labels.
 */
import type { Primitive } from "./primitive.js";
export interface TitleBlockInput {
    /** Slide title. Load-bearing. */
    title: string;
    /** Optional small-caps/tracked eyebrow above the title. */
    eyebrow?: string;
    /** Optional body-sized subtitle below the title. */
    subtitle?: string;
}
export declare const titleBlock: Primitive<TitleBlockInput>;
//# sourceMappingURL=titleBlock.d.ts.map