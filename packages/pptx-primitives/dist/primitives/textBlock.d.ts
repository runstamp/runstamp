/**
 * textBlock — neutral text container.
 *
 * The foundational primitive for "render some text in a region", without
 * the opinions baked into the specialized text primitives:
 *   - sourceLine forces italic + muted color + footnote prefix
 *   - bannerBand always renders a filled band with inverse-on-accent text
 *   - calloutBox always emits a rounded rect surface
 *
 * textBlock has none of those defaults. Pick the role; pick whether you
 * want a fill, border, or insets; supply text as string / runs / paragraphs.
 * Everything is opt-in.
 *
 * Tokens consumed:
 *   - type.{display,title,body,caption,eyebrow}
 *   - palette.{foreground,muted,faint,accent,accentInverse,accentSecondary}
 *   - canvas.surface
 */
import type { Primitive } from "./primitive.js";
import type { Paragraph, TextRun } from "../layout/types.js";
type Role = "display" | "title" | "body" | "caption" | "eyebrow";
type FillRole = "foreground" | "muted" | "faint" | "accent" | "accentSecondary" | "surface" | "none";
type ColorRole = "foreground" | "muted" | "faint" | "accent" | "accentInverse" | "accentSecondary";
type BorderRole = "foreground" | "muted" | "faint" | "accent" | "rule";
export interface TextBlockInput {
    /** Text content. Three forms:
     *   - string         → single paragraph; "\n" splits to paragraphs
     *   - TextRun[]      → single paragraph with rich runs
     *   - Paragraph[]    → full multi-paragraph form
     */
    content: string | TextRun[] | Paragraph[];
    /** Type role. Default "body". */
    role?: Role;
    /** Fill color: role keyword or hex. Default "none" (no rect emitted). */
    fill?: FillRole | string;
    /** Border. Width 0 disables. */
    border?: {
        color?: BorderRole | string;
        width?: number;
        style?: "solid" | "dashed" | "dotted";
    };
    /** Insets (px). Default 0 with no fill, 8 with fill. */
    insets?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    /** Text horizontal alignment. Default "left". */
    align?: "left" | "center" | "right";
    /** Text vertical alignment within container. Default "top". */
    verticalAlign?: "top" | "middle" | "bottom";
    /** Text color: role keyword or hex. Default = role-appropriate
     *  (accentInverse on filled bands, foreground otherwise). */
    color?: ColorRole | string;
    /** Italic override (default = role italic). */
    italic?: boolean;
    /** Font weight override (default = role weight). */
    weight?: number;
    /** Font size override in pt (default = role size). */
    size?: number;
    /** Line-height override in pt (default = role lineHeight). Required when
     *  bumping `size` well above the role default — without it, the role's
     *  lineHeight clips tall glyphs and trips TEXT_CLIP. */
    lineHeight?: number;
    /** Rotation in degrees (applied to the text frame). */
    rotation?: number;
}
export declare const textBlock: Primitive<TextBlockInput>;
export {};
//# sourceMappingURL=textBlock.d.ts.map