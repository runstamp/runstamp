/**
 * sourceLine — tiny footnote/source/note strip at the bottom of a slide.
 *
 * Every real consulting slide carries a one-line "Source: …" or
 * "Note: …" underneath the content. Without it the bottom third of a
 * matrix or chart slide reads empty. Caller allocates a thin bottom
 * strip of the content region and hands it here.
 *
 * Visual:
 *    Source: Statistics Korea; Euromonitor; Bain analysis
 *    Note:   Excel's solver used to fit; constraints added for saturation.
 *
 * Tokens consumed:
 *   - type.caption (body style — italic when kind !== "plain")
 *   - palette.muted (default), palette.faint (when kind === "note")
 *
 * Content adaptation: compresses in discrete steps to MIN_COMPRESSION;
 * beyond that, reports `clipped`. Never paginates — a source is a
 * terminal annotation.
 */
import type { Primitive } from "./primitive.js";
export interface SourceLineInput {
    /** Content text (without prefix). */
    content: string;
    /** "source" → italic, prefixed "Source:"; "note" → italic, prefixed
     *  "Note:"; "plain" → no prefix, no italic. Default "source". */
    kind?: "source" | "note" | "plain";
    /** Override alignment. Default "left". */
    align?: "left" | "right";
}
export declare const sourceLine: Primitive<SourceLineInput>;
//# sourceMappingURL=sourceLine.d.ts.map