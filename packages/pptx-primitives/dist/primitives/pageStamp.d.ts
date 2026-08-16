/**
 * pageStamp — footer/header brand mark wrapping an image asset with
 * consistent positioning across all slides in a deck.
 *
 * Used wherever the brand mark needs to land in a known corner without
 * each slide composition having to repeat the image-block boilerplate.
 *
 * Falls back to a text watermark when no `src` is supplied — a light
 * type-set string in `tokens.palette.faint`.
 */
import type { Primitive } from "./primitive.js";
export interface PageStampInput {
    /** Image source: data URI, https URL, or omitted. */
    src?: string;
    /** Alt / fallback text. */
    alt?: string;
    /** Text fallback when src is omitted. */
    fallbackText?: string;
}
export declare const pageStamp: Primitive<PageStampInput>;
//# sourceMappingURL=pageStamp.d.ts.map