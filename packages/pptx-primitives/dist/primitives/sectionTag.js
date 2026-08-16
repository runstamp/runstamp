/**
 * sectionTag — short left-aligned "pill" carrying a section label.
 *
 * The Bain signature tag that sits directly under the title rule, holding
 * labels like "S-curve approach", "[Back-up]", or "Phase 1". Unlike
 * sectionRibbon (LG full-width bar across the top of the slide), this is
 * a narrow content-region tag: flush to the left edge, width hugging
 * content + padding, dark fill with inverse text.
 *
 * Caller typically allocates a thin horizontal region below the title
 * block and hands it here. The pill consumes the region's left portion
 * and width is driven by content; excess width is discarded.
 *
 * Tokens consumed:
 *   - palette.muted or palette.foreground (fill), palette.accentInverse (text)
 *   - type.caption (text role; tracked-caps transform applied)
 *   - spacing.xs (internal padding)
 *
 * Content adaptation: no wrap. If label is long enough to exceed
 * region.width, compresses letter-spacing down to MIN_COMPRESSION, then
 * reports `clipped`.
 */
import { applyTypeTransform, estimateLineHeight, estimateTextWidth, } from "../util/estimateText.js";
const PAD_X = 10;
const PAD_Y = 4;
const MIN_COMPRESSION = 0.85;
export const sectionTag = (input, tokens, region) => {
    const caption = tokens.type.caption;
    const fillRole = input.fill ?? "foreground";
    const fill = fillRole === "foreground"
        ? tokens.palette.foreground
        : fillRole === "muted"
            ? tokens.palette.muted
            : tokens.palette.accent;
    const textColor = tokens.palette.accentInverse;
    const transform = input.transform ?? "upper";
    const rendered = transform === "upper" ? input.label.toUpperCase() : input.label;
    let scale = 1.0;
    let textWidth = estimateTextWidth({
        content: rendered,
        family: caption.family,
        sizePt: caption.size,
        letterSpacing: Math.max(caption.letterSpacing, 1.0) * scale,
        uppercase: transform === "upper",
    }, tokens);
    while (textWidth + PAD_X * 2 > region.width && scale > MIN_COMPRESSION - 1e-9) {
        scale = Number((scale - 0.05).toFixed(2));
        textWidth = estimateTextWidth({
            content: rendered,
            family: caption.family,
            sizePt: caption.size,
            letterSpacing: Math.max(caption.letterSpacing, 1.0) * scale,
            uppercase: transform === "upper",
        }, tokens);
    }
    const clipped = textWidth + PAD_X * 2 > region.width;
    const pillWidth = Math.min(textWidth + PAD_X * 2, region.width);
    const lineHeightPx = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
    const pillHeight = Math.min(region.height, lineHeightPx + PAD_Y * 2);
    const bar = {
        kind: "view",
        shape: "rect",
        decorative: false,
        zIndex: 0,
        rect: {
            left: region.left,
            top: region.top,
            width: pillWidth,
            height: pillHeight,
        },
        fill,
    };
    const label = {
        kind: "text",
        zIndex: 1,
        rect: {
            left: region.left + PAD_X,
            top: region.top,
            width: pillWidth - PAD_X * 2,
            height: pillHeight,
        },
        content: applyTypeTransform(input.label, transform),
        style: {
            family: caption.family,
            weight: 700,
            size: caption.size,
            lineHeight: caption.lineHeight,
            letterSpacing: Math.max(caption.letterSpacing, 1.0) * scale,
            italic: caption.italic,
            color: textColor,
            align: "left",
            verticalAlign: "middle",
        },
        autoFit: false,
    };
    const nodes = [bar, label];
    const overflow = clipped
        ? {
            kind: "clipped",
            droppedCount: 0,
            reason: `sectionTag exceeds region.width even at ${MIN_COMPRESSION}× compression`,
        }
        : scale < 1.0
            ? { kind: "compressed", scale }
            : { kind: "fit" };
    return { nodes, overflow };
};
//# sourceMappingURL=sectionTag.js.map