/**
 * footerChrome — footer strip shown on every content slide.
 *
 * Covers the disclaimer / project-code / watermark / page-number axes.
 * Layout order is driven by `tokens.chrome.footer.layout`, which is an
 * ordered list of segment names (possibly including "spacer" for flexible
 * whitespace). Each segment is emitted left-to-right within the footer
 * region; spacers absorb remaining width.
 *
 * Overflow: footer content cannot paginate. If content width exceeds the
 * region after compression (single step, 0.85×), the primitive returns
 * `clipped`. Compiler treats that as a reliability violation under strict
 * mode; caller shortens the disclaimer or drops a segment.
 */
import { emitHorizontalRule } from "../util/rule.js";
import { estimateTextWidth, applyTypeTransform } from "../util/estimateText.js";
/** Minimum compression; below this the primitive gives up and clips.
 *  Real consulting-deck footers run at 6–7pt — i.e. ~0.6–0.7× of a 10pt
 *  default caption. The floor is 0.55 to cover the long-disclaimer +
 *  project-code + page-numeral case that Bain runs across a 16:9 footer.
 *  Below that, content is genuinely too long for the slide width. */
const MIN_COMPRESSION = 0.55;
const COMPRESSION_STEP = 0.05;
export const footerChrome = (input, tokens, region) => {
    const { footer } = tokens.chrome;
    if (!footer.enabled)
        return { nodes: [], overflow: { kind: "fit" } };
    // Try at natural size first; step down in COMPRESSION_STEP increments
    // until content fits or we reach MIN_COMPRESSION. This is the primitive's
    // adaptation policy: compress-within-bound, then escalate.
    let scale = 1.0;
    while (scale >= MIN_COMPRESSION - 1e-9) {
        const attempt = layoutFooter(input, tokens, region, scale);
        if (attempt.ok) {
            return {
                nodes: attempt.nodes,
                overflow: scale === 1.0
                    ? { kind: "fit" }
                    : { kind: "compressed", scale },
            };
        }
        scale = Number((scale - COMPRESSION_STEP).toFixed(2));
    }
    // Still doesn't fit — render at MIN_COMPRESSION with clip reporting.
    const fallback = layoutFooter(input, tokens, region, MIN_COMPRESSION);
    return {
        nodes: fallback.nodes,
        overflow: {
            kind: "clipped",
            droppedCount: fallback.clippedCount,
            reason: `footer content exceeded width even at ${MIN_COMPRESSION}× compression`,
        },
    };
};
function layoutFooter(input, tokens, region, scale) {
    const { footer } = tokens.chrome;
    const nodes = [];
    const ruleEmission = emitHorizontalRule(footer.topRule, tokens.palette, region.left, region.top, region.width);
    nodes.push(...ruleEmission.nodes);
    const contentTop = region.top + ruleEmission.consumedHeight;
    const contentHeight = region.height - ruleEmission.consumedHeight;
    const segments = footer.layout
        .map((name) => renderSegment(name, input, tokens, scale))
        .filter((seg) => seg !== null);
    const fixedWidth = segments
        .filter((s) => s.kind !== "spacer")
        .reduce((acc, s) => acc + s.measuredWidth, 0);
    const spacerCount = segments.filter((s) => s.kind === "spacer").length;
    const gap = 12;
    const gapsTotal = Math.max(0, segments.length - 1) * gap;
    const availableForSpacers = region.width - fixedWidth - gapsTotal;
    if (availableForSpacers < 0) {
        return { ok: false, nodes, clippedCount: 1 };
    }
    const spacerWidth = spacerCount > 0 ? availableForSpacers / spacerCount : 0;
    const regionRight = region.left + region.width;
    let x = region.left;
    let clipped = 0;
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const w = seg.kind === "spacer" ? spacerWidth : seg.measuredWidth;
        if (x + w > regionRight + 0.5) {
            clipped++;
            continue;
        }
        if (seg.kind !== "spacer") {
            // Clamp left so emitted rect right never exceeds region right; the
            // accumulated x can drift by floating-point ε after width/spacer
            // arithmetic, which trips OUT_OF_BOUNDS without visual change.
            const left = Math.min(x, regionRight - w);
            nodes.push(seg.build({
                left,
                top: contentTop,
                width: w,
                height: contentHeight,
            }));
        }
        x += w;
        if (i < segments.length - 1)
            x += gap;
    }
    return { ok: clipped === 0, nodes, clippedCount: clipped };
}
function renderSegment(name, input, tokens, scale) {
    switch (name) {
        case "spacer":
            return { kind: "spacer", measuredWidth: 0, build: null };
        case "disclaimer":
            return tokens.chrome.footer.disclaimer
                ? makeTextSegment(tokens.chrome.footer.disclaimer, tokens, "left", scale)
                : null;
        case "projectCode":
            return tokens.chrome.footer.projectCode
                ? makeTextSegment(tokens.chrome.footer.projectCode, tokens, "left", scale)
                : null;
        case "watermark":
            return tokens.chrome.footer.watermark
                ? makeWatermarkSegment(tokens.chrome.footer.watermark, tokens, scale)
                : null;
        case "pageNumber":
            return tokens.ornament.pageNumber.style === "none"
                ? null
                : makePageNumberSegment(input.slideIndex, tokens, scale);
        default:
            return null;
    }
}
function scaledCaption(tokens, scale) {
    const caption = tokens.type.caption;
    return {
        ...caption,
        size: caption.size * scale,
        lineHeight: caption.lineHeight !== undefined ? caption.lineHeight * scale : undefined,
        letterSpacing: caption.letterSpacing * scale,
    };
}
function makeTextSegment(content, tokens, align, scale) {
    const caption = scaledCaption(tokens, scale);
    const measuredWidth = estimateTextWidth({
        content,
        family: caption.family,
        sizePt: caption.size,
        letterSpacing: caption.letterSpacing,
        uppercase: caption.transform === "upper",
    }, tokens);
    return {
        kind: "text",
        measuredWidth,
        build: (rect) => ({
            kind: "text",
            rect,
            content: applyTypeTransform(content, caption.transform),
            style: {
                family: caption.family,
                weight: caption.weight,
                size: caption.size,
                lineHeight: caption.lineHeight,
                letterSpacing: caption.letterSpacing,
                italic: caption.italic,
                color: tokens.palette.muted,
                align,
                verticalAlign: "middle",
            },
            autoFit: false,
        }),
    };
}
function makeWatermarkSegment(value, tokens, scale) {
    const isImage = value.startsWith("data:") || /^https?:\/\//u.test(value);
    if (!isImage)
        return makeTextSegment(value, tokens, "right", scale);
    const measuredWidth = 80 * scale;
    return {
        kind: "watermarkImage",
        measuredWidth,
        build: (rect) => ({
            kind: "image",
            rect,
            src: value,
            alt: "watermark",
            opacity: 1.0,
            decorative: true,
        }),
    };
}
function makePageNumberSegment(index, tokens, scale) {
    const { style, prefix } = tokens.ornament.pageNumber;
    const label = `${prefix}${index}`;
    const caption = scaledCaption(tokens, scale);
    const textWidth = estimateTextWidth({
        content: label,
        family: caption.family,
        sizePt: caption.size,
        letterSpacing: caption.letterSpacing,
        digitsOnly: /^\d+$/u.test(label),
    }, tokens);
    if (style === "plain") {
        return {
            kind: "pageNumber",
            measuredWidth: textWidth,
            build: (rect) => ({
                kind: "text",
                rect,
                content: applyTypeTransform(label, caption.transform),
                style: {
                    family: caption.family,
                    weight: caption.weight,
                    size: caption.size,
                    letterSpacing: caption.letterSpacing,
                    italic: caption.italic,
                    color: tokens.palette.muted,
                    align: "right",
                    verticalAlign: "middle",
                },
                autoFit: false,
            }),
        };
    }
    if (style === "circledAccent") {
        const diameter = Math.max(caption.size + 8, 18 * scale);
        return {
            kind: "pageNumber",
            measuredWidth: diameter,
            build: (rect) => makeCircledAccentNumber(rect, label, diameter, tokens, scale),
        };
    }
    const side = Math.max(caption.size + 6, 18 * scale);
    return {
        kind: "pageNumber",
        measuredWidth: side,
        build: (rect) => makeBoxedAccentNumber(rect, label, side, tokens, scale),
    };
}
// ---------------------------------------------------------------------------
// Node constructors
// ---------------------------------------------------------------------------
function makeCircledAccentNumber(rect, label, diameter, tokens, scale) {
    const cx = rect.left + rect.width - diameter;
    const cy = rect.top + (rect.height - diameter) / 2;
    const text = {
        kind: "text",
        rect: { left: 0, top: 0, width: diameter, height: diameter },
        content: label,
        style: {
            family: tokens.type.caption.family,
            weight: 700,
            size: tokens.type.caption.size * scale,
            letterSpacing: 0,
            color: tokens.palette.accentInverse,
            align: "center",
            verticalAlign: "middle",
        },
        autoFit: false,
    };
    return {
        kind: "view",
        shape: "ellipse",
        rect: { left: cx, top: cy, width: diameter, height: diameter },
        fill: resolveColorRole(tokens.ornament.pageNumber.style === "circledAccent" ? "accent" : "foreground", tokens),
        children: [text],
        decorative: false,
    };
}
function makeBoxedAccentNumber(rect, label, side, tokens, scale) {
    const x = rect.left + rect.width - side;
    const y = rect.top + (rect.height - side) / 2;
    const text = {
        kind: "text",
        rect: { left: 0, top: 0, width: side, height: side },
        content: label,
        style: {
            family: tokens.type.caption.family,
            weight: 700,
            size: tokens.type.caption.size * scale,
            letterSpacing: 0,
            color: tokens.palette.accentInverse,
            align: "center",
            verticalAlign: "middle",
        },
        autoFit: false,
    };
    return {
        kind: "view",
        shape: "rect",
        rect: { left: x, top: y, width: side, height: side },
        fill: resolveColorRole("accent", tokens),
        children: [text],
    };
}
function resolveColorRole(role, tokens) {
    if (role === "surface")
        return tokens.canvas.surface;
    return tokens.palette[role];
}
//# sourceMappingURL=footerChrome.js.map