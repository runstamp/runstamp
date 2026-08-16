/**
 * comparisonBand — N-column row-banded comparison.
 *
 * The "Trade-offs across go-to-market configurations" pattern: row labels
 * down the left, column values across, optional accent tick on a single
 * highlighted row, hairline dividers between rows.
 *
 * Differs from matrixTable in that:
 *   - No filled row-label strip — labels are flush text in the first
 *     column.
 *   - No fill on column headers — column headers are tracked-caps caption
 *     text with a thicker rule below.
 *   - One row may carry an `accent` flag → 2px left tick in palette.accent.
 *
 * Tokens consumed:
 *   - palette.foreground, palette.muted, palette.accent
 *   - type.caption (column headers), type.body (cell text)
 *   - rules.divider (between rows), rules.section (under header)
 *
 * Content adaptation:
 *   - Cells wrap within their column. Total height clip → paginate.
 */
import { applyTypeTransform, estimateLineCount, estimateLineHeight, } from "../util/estimateText.js";
import { emitHorizontalRule } from "../util/rule.js";
const ROW_PAD_Y = 12;
const ROW_PAD_X = 12;
export const comparisonBand = (input, tokens, region) => {
    const nodes = [];
    const colCount = input.columns.length;
    const labelRatio = input.labelColumnWidthRatio ?? 0.22;
    const labelColWidth = region.width * labelRatio;
    const valueColCount = Math.max(1, colCount - 1);
    const valueColWidth = (region.width - labelColWidth) / valueColCount;
    // Refuse to lay out when any column's inner content area would be
    // negative. Emitting nodes with negative width is a contract violation
    // (downstream renderers either clip silently or break visibly).
    if (valueColWidth - ROW_PAD_X * 2 < 0 ||
        labelColWidth - ROW_PAD_X * 2 < 0 ||
        region.height < ROW_PAD_Y * 2) {
        return {
            nodes,
            overflow: {
                kind: "clipped",
                droppedCount: input.rows.length,
                reason: `region too narrow for ${colCount}-column comparisonBand`,
            },
        };
    }
    const columnLeft = (idx) => idx === 0 ? region.left : region.left + labelColWidth + (idx - 1) * valueColWidth;
    const columnWidth = (idx) => (idx === 0 ? labelColWidth : valueColWidth);
    let cursor = region.top;
    // Header row — caption-styled tracked caps.
    const caption = tokens.type.caption;
    const headerHeight = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family) + ROW_PAD_Y;
    for (let c = 0; c < colCount; c++) {
        const headerText = input.columns[c];
        if (!headerText)
            continue;
        const node = {
            kind: "text",
            rect: {
                left: columnLeft(c) + ROW_PAD_X,
                top: cursor,
                width: columnWidth(c) - ROW_PAD_X * 2,
                height: headerHeight,
            },
            content: applyTypeTransform(headerText, caption.transform === "none" ? "upper" : caption.transform),
            style: {
                family: caption.family,
                weight: 700,
                size: Math.max(caption.size, 10),
                lineHeight: caption.lineHeight,
                letterSpacing: Math.max(caption.letterSpacing, 1.2),
                italic: caption.italic,
                color: tokens.palette.muted,
                align: "left",
                verticalAlign: "top",
            },
            autoFit: false,
        };
        nodes.push(node);
    }
    cursor += headerHeight;
    // Section rule under the header (or stronger divider).
    const headerRule = emitHorizontalRule(tokens.rules.section !== "none" ? tokens.rules.section : tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
    nodes.push(...headerRule.nodes);
    cursor += headerRule.consumedHeight + tokens.spacing.sm;
    // Body rows.
    const startIndex = input.resume?.startRowIndex ?? 0;
    for (let r = startIndex; r < input.rows.length; r++) {
        const row = input.rows[r];
        const rowHeight = computeRowHeight(row, tokens, labelColWidth, valueColWidth);
        if (cursor + rowHeight > region.top + region.height + 0.5) {
            return {
                nodes,
                overflow: {
                    kind: "paginated",
                    remaining: { startRowIndex: r },
                    continuationLabel: `continued (${input.rows.length - r} rows remaining)`,
                },
            };
        }
        // Accent tick (if highlighted)
        if (row.accent) {
            const tick = {
                kind: "view",
                shape: "rect",
                decorative: true,
                zIndex: 1,
                rect: { left: region.left, top: cursor + 4, width: 2, height: rowHeight - 8 },
                fill: tokens.palette.accent,
            };
            nodes.push(tick);
        }
        // Row label.
        const body = tokens.type.body;
        const lineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
        const labelLines = estimateLineCount({
            content: row.label,
            family: body.family,
            sizePt: body.size,
            letterSpacing: body.letterSpacing,
            width: labelColWidth - ROW_PAD_X * 2,
        }, tokens);
        const labelNode = {
            kind: "text",
            rect: {
                left: region.left + ROW_PAD_X,
                top: cursor + ROW_PAD_Y / 2,
                width: labelColWidth - ROW_PAD_X * 2,
                height: lineHeightPx * labelLines,
            },
            content: applyTypeTransform(row.label, body.transform),
            style: {
                family: body.family,
                weight: row.accent ? 700 : 500,
                size: body.size,
                lineHeight: body.lineHeight,
                letterSpacing: body.letterSpacing,
                italic: body.italic,
                color: tokens.palette.foreground,
                align: "left",
                verticalAlign: "top",
            },
            autoFit: false,
        };
        nodes.push(labelNode);
        // Value columns.
        for (let c = 0; c < row.values.length; c++) {
            const value = row.values[c];
            const colIndex = c + 1; // skip label column
            if (colIndex >= colCount)
                break;
            const lines = estimateLineCount({
                content: value,
                family: body.family,
                sizePt: body.size,
                letterSpacing: body.letterSpacing,
                width: valueColWidth - ROW_PAD_X * 2,
            }, tokens);
            const valueNode = {
                kind: "text",
                rect: {
                    left: columnLeft(colIndex) + ROW_PAD_X,
                    top: cursor + ROW_PAD_Y / 2,
                    width: valueColWidth - ROW_PAD_X * 2,
                    height: lineHeightPx * lines,
                },
                content: applyTypeTransform(value, body.transform),
                style: {
                    family: body.family,
                    weight: body.weight,
                    size: body.size,
                    lineHeight: body.lineHeight,
                    letterSpacing: body.letterSpacing,
                    italic: body.italic,
                    color: tokens.palette.foreground,
                    align: "left",
                    verticalAlign: "top",
                },
                autoFit: false,
            };
            nodes.push(valueNode);
        }
        cursor += rowHeight;
        // Divider between rows (skip after last).
        if (r < input.rows.length - 1) {
            const divider = emitHorizontalRule(tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
            nodes.push(...divider.nodes);
            cursor += divider.consumedHeight;
        }
    }
    return { nodes, overflow: { kind: "fit" } };
};
function computeRowHeight(row, tokens, labelColWidth, valueColWidth) {
    const body = tokens.type.body;
    const lineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
    let maxLines = 1;
    const labelLines = estimateLineCount({
        content: row.label,
        family: body.family,
        sizePt: body.size,
        letterSpacing: body.letterSpacing,
        width: labelColWidth - ROW_PAD_X * 2,
    }, tokens);
    if (labelLines > maxLines)
        maxLines = labelLines;
    const valueInnerWidth = valueColWidth - ROW_PAD_X * 2;
    for (const v of row.values) {
        const l = estimateLineCount({
            content: v,
            family: body.family,
            sizePt: body.size,
            letterSpacing: body.letterSpacing,
            width: valueInnerWidth,
        }, tokens);
        if (l > maxLines)
            maxLines = l;
    }
    return lineHeightPx * maxLines + ROW_PAD_Y;
}
//# sourceMappingURL=comparisonBand.js.map