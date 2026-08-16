/**
 * infoCard — structured side-label card.
 *
 * Composes textBlock + bulletList under the hood. Replaces the
 * 3–4 stacked blocks per callout that consulting decks build by hand
 * (bannerBand + bulletList + sourceLine, etc.).
 *
 * Layout:
 *   ┌─────────┬──────────────────────────┐
 *   │  side-  │  lead (optional, bold)   │
 *   │  label  │  body  (bulleted)        │
 *   │  band   │  footer (italic / plain) │
 *   └─────────┴──────────────────────────┘
 *
 * sideLabel.position = "top" puts the label band across the top instead.
 *
 * Tokens consumed (via the underlying primitives):
 *   - textBlock for sideLabel + lead + footer
 *   - bulletList for body
 *   - palette.{foreground,muted,faint,accent,surface}, type.{...}
 */
import type { Primitive } from "./primitive.js";
import type { TextRun } from "../layout/index.js";
import { type BulletItem } from "./bulletList.js";
type FillRole = "foreground" | "muted" | "faint" | "accent" | "accentSecondary" | "surface" | "none";
type BorderRole = "foreground" | "muted" | "faint" | "accent" | "rule";
export interface InfoCardInput {
    sideLabel?: {
        text: string;
        position?: "left" | "top";
        fill?: FillRole | string;
        /** Width (px) of the side band when position="left". Default 96. */
        width?: number;
        /** Height (px) of the side band when position="top". Default 32. */
        height?: number;
    };
    /** Bold lead-in line above the body. */
    lead?: string | TextRun[];
    /** Bulleted body items. Same shape as bulletList. */
    body: BulletItem[];
    footer?: {
        text: string | TextRun[];
        style?: "italic-quote" | "plain";
    };
    /** Card background fill. Default "none". */
    fill?: FillRole | string;
    /** Card border. */
    border?: {
        color?: BorderRole | string;
        width?: number;
    };
    /** Padding (px) inside the body area (lead/body/footer column). Default 8. */
    padding?: number;
    /** Gap (px) between lead/body/footer rows. Default 4. */
    gap?: number;
}
export declare const infoCard: Primitive<InfoCardInput>;
export {};
//# sourceMappingURL=infoCard.d.ts.map