/**
 * calloutBox — rounded rect holding a text body, with optional pointer
 * to a target (pixel coords). Used on Bain p10 / p19 / p21 for analyst
 * quotes, sidebar notes, and "important" annotations.
 *
 * The box itself is a rounded rect (preset shape "roundRect"). The
 * pointer, when supplied, is rendered as a separate connector emitted
 * by the caller — calloutBox keeps its scope tight: just the box +
 * its inner text. Callers wanting the pointer pair the box with a
 * connectorLine block.
 *
 * Tokens consumed:
 *   - palette.surface (default fill), palette.faint (default border)
 *   - palette.foreground (default text color)
 *   - type.body (text role)
 *   - spacing.sm (internal padding)
 */
import type { Primitive } from "./primitive.js";
import type { TextRun } from "../layout/index.js";
export interface CalloutBoxInput {
    /** Box content. String is treated as a single paragraph; rich runs
     *  preserve in-paragraph emphasis. */
    content: string | TextRun[];
    /** Color role for the box fill. */
    fill?: "surface" | "muted" | "faint" | "accent";
    /** Color role for the border. Defaults to "foreground" 1px hairline. */
    borderColor?: "foreground" | "muted" | "faint" | "accent";
    /** Border width (px). 0 disables the border. */
    borderWidth?: number;
    /** Type role override. Defaults to "body". */
    role?: "body" | "caption" | "eyebrow";
    /** Surface shape. Default `"rect"` (sharp corners). Pass `"roundRect"`
     *  to opt into rounded corners — the prior default. */
    shape?: "rect" | "roundRect";
}
export declare const calloutBox: Primitive<CalloutBoxInput>;
//# sourceMappingURL=calloutBox.d.ts.map