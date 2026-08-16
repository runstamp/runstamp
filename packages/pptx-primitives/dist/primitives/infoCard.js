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
import { textBlock } from "./textBlock.js";
import { bulletList } from "./bulletList.js";
import { estimateLineCount, estimateLineHeight, } from "../util/estimateText.js";
const DEFAULT_SIDE_WIDTH = 96;
const DEFAULT_TOP_HEIGHT = 32;
const DEFAULT_PADDING = 8;
const DEFAULT_GAP = 4;
export const infoCard = (input, tokens, region) => {
    const nodes = [];
    const padding = input.padding ?? DEFAULT_PADDING;
    const gap = input.gap ?? DEFAULT_GAP;
    // Card surface (fill / border) — only emit if either is set.
    if (input.fill && input.fill !== "none") {
        const surface = textBlock({
            content: "",
            fill: input.fill,
            border: input.border,
            insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }, tokens, region);
        nodes.push(...surface.nodes);
    }
    else if (input.border) {
        const surface = textBlock({
            content: "",
            border: input.border,
            insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }, tokens, region);
        nodes.push(...surface.nodes);
    }
    // Carve out the side-label slice.
    const labelPos = input.sideLabel?.position ?? "left";
    let bodyRect = { ...region };
    if (input.sideLabel) {
        if (labelPos === "left") {
            const w = input.sideLabel.width ?? DEFAULT_SIDE_WIDTH;
            const labelRect = {
                left: region.left,
                top: region.top,
                width: Math.min(w, region.width),
                height: region.height,
            };
            bodyRect = {
                left: region.left + labelRect.width,
                top: region.top,
                width: Math.max(0, region.width - labelRect.width),
                height: region.height,
            };
            const label = textBlock({
                content: input.sideLabel.text,
                role: "body",
                fill: input.sideLabel.fill ?? "muted",
                align: "center",
                verticalAlign: "middle",
                insets: { top: 8, right: 8, bottom: 8, left: 8 },
            }, tokens, labelRect);
            nodes.push(...label.nodes);
        }
        else {
            const h = input.sideLabel.height ?? DEFAULT_TOP_HEIGHT;
            const labelRect = {
                left: region.left,
                top: region.top,
                width: region.width,
                height: Math.min(h, region.height),
            };
            bodyRect = {
                left: region.left,
                top: region.top + labelRect.height,
                width: region.width,
                height: Math.max(0, region.height - labelRect.height),
            };
            const label = textBlock({
                content: input.sideLabel.text,
                role: "body",
                fill: input.sideLabel.fill ?? "muted",
                align: "left",
                verticalAlign: "middle",
                insets: { top: 6, right: 12, bottom: 6, left: 12 },
            }, tokens, labelRect);
            nodes.push(...label.nodes);
        }
    }
    // Inner column: padded, stacking lead → body → footer.
    const innerRect = {
        left: bodyRect.left + padding,
        top: bodyRect.top + padding,
        width: Math.max(0, bodyRect.width - padding * 2),
        height: Math.max(0, bodyRect.height - padding * 2),
    };
    // Measure lead / footer to leave the rest for body.
    let cursor = innerRect.top;
    const remainingHeight = () => Math.max(0, innerRect.top + innerRect.height - cursor);
    if (input.lead) {
        const bodyType = tokens.type.body;
        const leadText = typeof input.lead === "string"
            ? input.lead
            : input.lead.map((r) => r.text).join("");
        const lines = estimateLineCount({
            content: leadText,
            family: bodyType.family,
            sizePt: bodyType.size,
            letterSpacing: bodyType.letterSpacing,
            width: innerRect.width,
        }, tokens);
        const lineHeight = estimateLineHeight(bodyType.size, bodyType.lineHeight, tokens, bodyType.family);
        const leadHeight = Math.max(lineHeight, lineHeight * lines);
        const leadRect = {
            left: innerRect.left,
            top: cursor,
            width: innerRect.width,
            height: Math.min(leadHeight, remainingHeight()),
        };
        const leadResult = textBlock({
            content: input.lead,
            role: "body",
            weight: 700,
            align: "left",
            verticalAlign: "top",
        }, tokens, leadRect);
        nodes.push(...leadResult.nodes);
        cursor += leadRect.height + gap;
    }
    // Footer height (measured from bottom).
    let footerHeight = 0;
    if (input.footer) {
        const captionType = tokens.type.caption;
        const footerText = typeof input.footer.text === "string"
            ? input.footer.text
            : input.footer.text.map((r) => r.text).join("");
        const lines = estimateLineCount({
            content: footerText,
            family: captionType.family,
            sizePt: captionType.size,
            letterSpacing: captionType.letterSpacing,
            width: innerRect.width,
        }, tokens);
        const lineHeight = estimateLineHeight(captionType.size, captionType.lineHeight, tokens, captionType.family);
        footerHeight = Math.max(lineHeight, lineHeight * lines);
    }
    // Body region — between cursor (after lead) and footer.
    const bodyAvailable = Math.max(0, remainingHeight() - (footerHeight > 0 ? footerHeight + gap : 0));
    const bodyTopRect = {
        left: innerRect.left,
        top: cursor,
        width: innerRect.width,
        height: bodyAvailable,
    };
    const bodyResult = bulletList({ items: input.body }, tokens, bodyTopRect);
    nodes.push(...bodyResult.nodes);
    cursor = bodyTopRect.top + bodyTopRect.height + (footerHeight > 0 ? gap : 0);
    if (input.footer) {
        const footerRect = {
            left: innerRect.left,
            top: cursor,
            width: innerRect.width,
            height: footerHeight,
        };
        const isQuote = (input.footer.style ?? "plain") === "italic-quote";
        const footerResult = textBlock({
            content: input.footer.text,
            role: "caption",
            italic: isQuote ? true : undefined,
            color: "muted",
            align: "left",
            verticalAlign: "top",
        }, tokens, footerRect);
        nodes.push(...footerResult.nodes);
    }
    const overflow = bodyResult.overflow.kind === "paginated"
        ? bodyResult.overflow
        : { kind: "fit" };
    return { nodes, overflow };
};
//# sourceMappingURL=infoCard.js.map