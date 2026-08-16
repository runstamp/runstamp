/**
 * footerChrome — footer strip shown on every content slide.
 *
 * Covers the disclaimer / project-code / watermark / page-number axes.
 * Layout order is driven by `tokens.chrome.footer.layout`, which is an
 * ordered list of segment names (possibly including "spacer" for flexible
 * whitespace). Each segment is emitted left-to-right within the footer
 * region; spacers absorb remaining width.
 *
 * Overflow: footer content cannot paginate. If content width exceeds the
 * region after compression (single step, 0.85×), the primitive returns
 * `clipped`. Compiler treats that as a reliability violation under strict
 * mode; caller shortens the disclaimer or drops a segment.
 */
import type { Primitive } from "./primitive.js";
export interface FooterChromeInput {
    /** 1-indexed slide number. */
    slideIndex: number;
    /** Total slide count. Used for "N / M" style page numbers (future). */
    totalSlides: number;
}
export declare const footerChrome: Primitive<FooterChromeInput>;
//# sourceMappingURL=footerChrome.d.ts.map