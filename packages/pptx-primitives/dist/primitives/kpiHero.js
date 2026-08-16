/**
 * kpiHero — one large display number with label and optional delta.
 *
 * Visual layout (top to bottom):
 *   [LABEL]               (small caps eyebrow role, accent color, tracked)
 *   $12.4M                (massive display role, foreground)
 *   ↑ 18% YoY             (caption role, accent or muted)
 *
 * Tokens consumed:
 *   - palette.foreground (hero number)
 *   - palette.accent (label, delta when positive)
 *   - palette.muted (delta when neutral)
 *   - type.eyebrow (label)
 *   - type.display (hero number)
 *   - type.caption (delta)
 *
 * Companion to metricStack — a hero metric in the dominant left column,
 * supporting metrics stacked on the right.
 *
 * Content adaptation: the value compresses (within a bounded range) when
 * its width exceeds the region width.
 */
import { applyTypeTransform, estimateLineCount, estimateLineHeight, estimateTextWidth, } from "../util/estimateText.js";
const VALUE_MIN_COMPRESSION = 0.8;
const VALUE_COMPRESSION_STEP = 0.05;
export const kpiHero = (input, tokens, region) => {
    const nodes = [];
    // Pre-compute the full block height so we can center vertically.
    const eyebrow = tokens.type.eyebrow;
    const eyebrowHeight = estimateLineHeight(eyebrow.size, eyebrow.lineHeight, tokens, eyebrow.family);
    const display = tokens.type.display;
    // Value compression is computed upfront so blockHeight is accurate.
    let valueScale = 1.0;
    let valueWidth = estimateValueWidth(input.value, display.family, display.size, display.letterSpacing, tokens);
    while (valueWidth > region.width && valueScale > VALUE_MIN_COMPRESSION - 1e-9) {
        valueScale = Number((valueScale - VALUE_COMPRESSION_STEP).toFixed(2));
        valueWidth = estimateValueWidth(input.value, display.family, display.size * valueScale, display.letterSpacing * valueScale, tokens);
    }
    const valueSizePt = display.size * valueScale;
    const valueLineHeightPt = display.lineHeight !== undefined ? display.lineHeight * valueScale : valueSizePt * 1.05;
    const valueLineHeightPx = estimateLineHeight(valueSizePt, valueLineHeightPt, tokens, display.family);
    const caption = tokens.type.caption;
    const captionHeight = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
    const bodyRole = tokens.type.body;
    const bodyLineHeightPx = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
    const supportLines = input.support
        ? estimateLineCount({
            content: input.support,
            family: bodyRole.family,
            sizePt: bodyRole.size,
            letterSpacing: bodyRole.letterSpacing,
            width: region.width,
        }, tokens)
        : 0;
    const supportHeight = supportLines * bodyLineHeightPx;
    let blockHeight = eyebrowHeight + tokens.spacing.sm + valueLineHeightPx;
    if (input.delta)
        blockHeight += tokens.spacing.sm + captionHeight;
    if (input.support)
        blockHeight += tokens.spacing.sm + supportHeight;
    const verticalAlign = input.verticalAlign ?? "center";
    let cursor = verticalAlign === "center"
        ? region.top + Math.max(0, (region.height - blockHeight) / 2)
        : region.top;
    const labelNode = {
        kind: "text",
        rect: {
            left: region.left,
            top: cursor,
            width: region.width,
            height: eyebrowHeight,
        },
        content: applyTypeTransform(input.label, eyebrow.transform),
        style: {
            family: eyebrow.family,
            weight: eyebrow.weight,
            size: eyebrow.size,
            lineHeight: eyebrow.lineHeight,
            letterSpacing: eyebrow.letterSpacing,
            italic: eyebrow.italic,
            color: tokens.palette.accent,
            align: "left",
            verticalAlign: "top",
        },
        autoFit: false,
    };
    nodes.push(labelNode);
    cursor += eyebrowHeight + tokens.spacing.sm;
    const valueNode = {
        kind: "text",
        rect: {
            left: region.left,
            top: cursor,
            width: region.width,
            height: valueLineHeightPx,
        },
        content: applyTypeTransform(input.value, display.transform),
        style: {
            family: display.family,
            weight: display.weight,
            size: valueSizePt,
            lineHeight: valueLineHeightPt,
            letterSpacing: display.letterSpacing * valueScale,
            italic: display.italic,
            color: tokens.palette.foreground,
            align: "left",
            verticalAlign: "top",
        },
        autoFit: false,
    };
    nodes.push(valueNode);
    cursor += valueLineHeightPx;
    // Delta.
    if (input.delta) {
        cursor += tokens.spacing.sm;
        const trend = input.trend ?? "flat";
        const deltaColor = trend === "up"
            ? tokens.palette.accent
            : trend === "down"
                ? tokens.palette.muted
                : tokens.palette.faint;
        const deltaNode = {
            kind: "text",
            rect: {
                left: region.left,
                top: cursor,
                width: region.width,
                height: captionHeight,
            },
            content: applyTypeTransform(input.delta, caption.transform),
            style: {
                family: caption.family,
                weight: caption.weight,
                size: Math.max(caption.size, 11),
                lineHeight: caption.lineHeight,
                letterSpacing: caption.letterSpacing,
                italic: caption.italic,
                color: deltaColor,
                align: "left",
                verticalAlign: "top",
            },
            autoFit: false,
        };
        nodes.push(deltaNode);
        cursor += captionHeight;
    }
    // Supporting body copy below delta.
    if (input.support) {
        cursor += tokens.spacing.sm;
        const supportNode = {
            kind: "text",
            rect: {
                left: region.left,
                top: cursor,
                width: region.width,
                height: supportHeight,
            },
            content: applyTypeTransform(input.support, bodyRole.transform),
            style: {
                family: bodyRole.family,
                weight: bodyRole.weight,
                size: bodyRole.size,
                lineHeight: bodyRole.lineHeight,
                letterSpacing: bodyRole.letterSpacing,
                italic: bodyRole.italic,
                color: tokens.palette.muted,
                align: "left",
                verticalAlign: "top",
            },
            autoFit: false,
        };
        nodes.push(supportNode);
        cursor += supportHeight;
    }
    // Vertical overflow check — compare against region bottom.
    const regionBottom = region.top + region.height + 0.5;
    const overflowKind = cursor > regionBottom
        ? {
            kind: "clipped",
            droppedCount: 0,
            reason: `kpiHero content exceeds region height (${Math.round(blockHeight)}px > ${region.height}px)`,
        }
        : valueScale < 1.0
            ? { kind: "compressed", scale: valueScale }
            : { kind: "fit" };
    return { nodes, overflow: overflowKind };
};
function estimateValueWidth(value, family, sizePt, letterSpacing, tokens) {
    return estimateTextWidth({
        content: value,
        family,
        sizePt,
        letterSpacing,
        digitsOnly: /^[\d,.\s$%+\-↑↓→]+$/u.test(value),
    }, tokens);
}
//# sourceMappingURL=kpiHero.js.map