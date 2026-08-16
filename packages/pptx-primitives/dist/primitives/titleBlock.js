/**
 * titleBlock — slide title with optional eyebrow, subtitle, and rule.
 *
 * The single primitive that carries these three aesthetics from one
 * codepath, differing only in tokens:
 *
 *   Bain:     eyebrow (none, title only)
 *             title   bold sans ~30pt, black
 *             rule    "3px solid #DA291C + 1px solid #CCCCCC gap:1"
 *
 *   LG:       eyebrow ribbon nav or tracked caps, separate primitive
 *             title   stencil serif ~48pt tracked, black
 *             rule    "2px solid #000" or "none"
 *
 *   Minimal:  eyebrow small caps accent + letter-space
 *             title   sans ~28pt regular, foreground
 *             rule    "1px solid token:rule"
 *
 * Layout order (top → bottom):
 *   [eyebrow?]      (type.eyebrow role, color=palette.accent)
 *   [title]         (type.title role, color=palette.foreground)
 *   [subtitle?]     (type.body role, color=palette.muted)
 *   [rule?]         (rules.title pattern)
 *
 * Content adaptation:
 *   - Titles that wrap beyond 2 lines compress one step (0.9×) and retry.
 *     Further overflow returns `overflow.kind = "clipped"` — caller must
 *     shorten or split the title.
 *   - Eyebrow and subtitle are single-line; they either fit or don't.
 *     No compression attempted on chrome-level labels.
 */
import { emitHorizontalRule } from "../util/rule.js";
import { applyTypeTransform, estimateLineCount, estimateLineHeight, } from "../util/estimateText.js";
/** Max body lines before compression kicks in. Three lines is the norm
 *  for tracked caps editorial titles; editorial-minimal bundles can still
 *  hit two because shorter titles naturally wrap less. */
const TITLE_MAX_NATURAL_LINES = 3;
/** Compression step applied when title overflows natural line budget. */
const TITLE_COMPRESSION_STEP = 0.90;
/** Lower bound below which we stop compressing and surface overflow. */
const TITLE_MIN_COMPRESSION = 0.75;
export const titleBlock = (input, tokens, region) => {
    const nodes = [];
    let cursor = region.top;
    const eyebrowGap = tokens.spacing.sm;
    const subtitleGap = tokens.spacing.sm;
    const ruleGap = tokens.spacing.md;
    // Eyebrow.
    if (input.eyebrow) {
        const { node, consumedHeight } = emitLine(input.eyebrow, "eyebrow", tokens, tokens.palette.accent, { left: region.left, top: cursor, width: region.width });
        nodes.push(node);
        cursor += consumedHeight + eyebrowGap;
    }
    // Title — with compression retry if it blows the line budget.
    let scale = 1.0;
    let titleNodeResult = null;
    while (scale >= TITLE_MIN_COMPRESSION - 1e-9) {
        const attempt = layoutTitle(input.title, tokens, scale, {
            left: region.left,
            top: cursor,
            width: region.width,
        });
        if (attempt.lines <= TITLE_MAX_NATURAL_LINES) {
            titleNodeResult = attempt;
            break;
        }
        scale = Number((scale - (1.0 - TITLE_COMPRESSION_STEP)).toFixed(2));
    }
    let overflow = { kind: "fit" };
    if (!titleNodeResult) {
        // Render anyway at the minimum, but report clipped.
        titleNodeResult = layoutTitle(input.title, tokens, TITLE_MIN_COMPRESSION, {
            left: region.left,
            top: cursor,
            width: region.width,
        });
        overflow = {
            kind: "clipped",
            droppedCount: 0,
            reason: `title exceeded ${TITLE_MAX_NATURAL_LINES}-line budget at minimum compression`,
        };
    }
    else if (scale < 1.0) {
        overflow = { kind: "compressed", scale };
    }
    nodes.push(titleNodeResult.node);
    cursor += titleNodeResult.consumedHeight;
    // Subtitle.
    if (input.subtitle) {
        cursor += subtitleGap;
        const { node, consumedHeight } = emitLine(input.subtitle, "body", tokens, tokens.palette.muted, { left: region.left, top: cursor, width: region.width });
        nodes.push(node);
        cursor += consumedHeight;
    }
    // Rule.
    if (tokens.rules.title !== "none") {
        cursor += ruleGap;
        const ruleEmission = emitHorizontalRule(tokens.rules.title, tokens.palette, region.left, cursor, region.width);
        nodes.push(...ruleEmission.nodes);
        cursor += ruleEmission.consumedHeight;
    }
    // Overflow check against the vertical region budget.
    if (cursor > region.top + region.height + 0.5) {
        if (overflow.kind === "fit" || overflow.kind === "compressed") {
            overflow = {
                kind: "clipped",
                droppedCount: 0,
                reason: `titleBlock consumed ${Math.round(cursor - region.top)}px; region allows ${region.height}px`,
            };
        }
    }
    return { nodes, overflow };
};
function layoutTitle(content, tokens, scale, place) {
    const role = tokens.type.title;
    const sizePt = role.size * scale;
    const lineHeightPt = role.lineHeight !== undefined ? role.lineHeight * scale : sizePt * 1.2;
    const lines = estimateLineCount({
        content,
        family: role.family,
        sizePt,
        letterSpacing: role.letterSpacing,
        uppercase: role.transform === "upper",
        width: place.width,
    }, tokens);
    const lineHeightPx = estimateLineHeight(sizePt, lineHeightPt, tokens, role.family);
    const consumedHeight = lineHeightPx * lines;
    const node = {
        kind: "text",
        rect: { left: place.left, top: place.top, width: place.width, height: consumedHeight },
        content: applyTypeTransform(content, role.transform),
        style: {
            family: role.family,
            weight: role.weight,
            size: sizePt,
            lineHeight: lineHeightPt,
            letterSpacing: role.letterSpacing * scale,
            italic: role.italic,
            color: tokens.palette.foreground,
            align: "left",
            verticalAlign: "top",
        },
        autoFit: false,
    };
    return { node, consumedHeight, lines };
}
function emitLine(content, role, tokens, color, place) {
    const typeRole = tokens.type[role];
    const lineHeightPx = estimateLineHeight(typeRole.size, typeRole.lineHeight, tokens, typeRole.family);
    const height = lineHeightPx * Math.max(1, estimateLineCount({
        content,
        family: typeRole.family,
        sizePt: typeRole.size,
        letterSpacing: typeRole.letterSpacing,
        uppercase: typeRole.transform === "upper",
        width: place.width,
    }, tokens));
    const node = {
        kind: "text",
        rect: { left: place.left, top: place.top, width: place.width, height },
        content: applyTypeTransform(content, typeRole.transform),
        style: {
            family: typeRole.family,
            weight: typeRole.weight,
            size: typeRole.size,
            lineHeight: typeRole.lineHeight,
            letterSpacing: typeRole.letterSpacing,
            italic: typeRole.italic,
            color,
            align: "left",
            verticalAlign: "top",
        },
        autoFit: false,
    };
    return { node, consumedHeight: height };
}
//# sourceMappingURL=titleBlock.js.map