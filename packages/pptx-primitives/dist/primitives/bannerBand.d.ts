/**
 * bannerBand — horizontal solid-fill band carrying display-style text.
 * Used on LG p7 (the simpler banners) and other section-divider plates.
 *
 * Renders as a filled rect with optional skew angle (parallelogram
 * variant) and centered text. Skew is applied via the engine's
 * "parallelogram" preset shape rather than per-shape skew transforms.
 *
 * Tokens consumed:
 *   - palette.foreground / accent (fill)
 *   - palette.accentInverse (text)
 *   - type.display or type.title (text role)
 */
import type { Primitive } from "./primitive.js";
export interface BannerBandInput {
    text: string;
    /** Type role for the text. Default "title". */
    role?: "display" | "title" | "body" | "eyebrow";
    /** Fill color role. Default "foreground". */
    fill?: "foreground" | "muted" | "accent" | "accentSecondary";
    /** When true, render as a parallelogram. */
    parallelogram?: boolean;
}
export declare const bannerBand: Primitive<BannerBandInput>;
//# sourceMappingURL=bannerBand.d.ts.map