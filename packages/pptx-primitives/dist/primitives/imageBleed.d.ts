/**
 * imageBleed — photography-first content. Full / half / quarter / inline.
 *
 * Reads photo.enabled, photo.defaultBleed, photo.scrim, photo.scrimOpacity.
 * When photo.enabled = false, the primitive degrades gracefully:
 *   - If the input supplies `fallbackText`, it emits a text block instead.
 *   - Otherwise it emits nothing (caller is responsible for laying out
 *     something else in the vacated region).
 *
 * The `bleed` input overrides the token default, letting a single slide
 * opt for a full-bleed hero while the bundle defaults to half-bleed.
 *
 * Scrim: an optional flat translucent overlay for text-over-image
 * legibility. Scrim opacity is a token; direction ("light" / "dark") is
 * the overlay color. No gradient scrims — a deliberate ban (see memory
 * `feedback_aesthetic_bans`).
 *
 * Content adaptation: none. The image fills its region; callers size the
 * region.
 */
import type { Primitive } from "./primitive.js";
import type { Rect } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
export interface ImageBleedInput {
    /** Image src: data: URI or https:// URL. */
    src?: string;
    /** Alt text for a11y. */
    alt?: string;
    /** Crop as fractions [0–1] of the source image. */
    crop?: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /** Override the token default bleed for this one slide. */
    bleed?: ResolvedTokens["photo"]["defaultBleed"];
    /** When photo.enabled = false, emit this text centered in the region. */
    fallbackText?: string;
    /** Optional text to place over the image (paired with a scrim). */
    overlay?: {
        text: string;
        role?: keyof ResolvedTokens["type"];
        align?: "left" | "center" | "right";
        verticalAlign?: "top" | "middle" | "bottom";
    };
}
export declare const imageBleed: Primitive<ImageBleedInput>;
export declare function regionForBleed(bleed: ResolvedTokens["photo"]["defaultBleed"], slide: {
    width: number;
    height: number;
}, margin: number): Rect;
//# sourceMappingURL=imageBleed.d.ts.map