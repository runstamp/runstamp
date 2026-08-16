/**
 * matrixTable — row-labeled, column-headered grid with per-cell content.
 *
 * The single primitive Bain decks lean on for ~60% of slides. Examples:
 * "Korean market outlook summary" page (3 row-strips × 1 content column,
 * each cell a bulleted micro-list); "Commerce market category" page
 * (3 row-strips × 3 column-headers grid, each cell short text).
 *
 * Visual structure:
 *
 *   ┌────────────┬─────────┬─────────┬─────────┐  ← header row (optional)
 *   │ rowLabelHdr│ col1    │ col2    │ col3    │
 *   ├────────────┼─────────┼─────────┼─────────┤  ← header underline rule
 *   │            │  cell   │  cell   │  cell   │
 *   │  ROW LABEL │  cell   │  cell   │  cell   │
 *   │  STRIP     │  cell   │  cell   │  cell   │
 *   ├────────────┼─────────┼─────────┼─────────┤  ← divider
 *   │  ROW LABEL │  cell   │  cell   │  cell   │
 *   └────────────┴─────────┴─────────┴─────────┘
 *
 * Tokens consumed:
 *   - palette.foreground, palette.muted, palette.surface, palette.accent
 *   - type.title (header text), type.body (cell text), type.caption (row label)
 *   - rules.divider for row-separator pattern
 *   - rules.section for header underline (or rules.divider if none)
 *   - spacing.* for cell padding
 *
 * Bundle expressions:
 *   - Bain: row labels in charcoal-filled strips with white bold text;
 *     column headers in blue or charcoal fill; thin gray divider hairlines.
 *   - LG (rare): no fills, italic serif row labels, black hairlines only.
 *   - Minimal: no fills, foreground row labels, hairline rules only.
 *
 * Token gates that change appearance:
 *   - `rowLabelStyle`: "filled" (strip with inverse text) or "plain"
 *     (just text + accent tick on the left). The primitive picks "filled"
 *     when the bundle's `palette.muted` is dark enough to fill against
 *     `palette.accentInverse`; "plain" otherwise.
 *
 * Content adaptation:
 *   - Cell text wraps to multiple lines as needed within fixed cell rect.
 *   - Row heights default to content-natural height. Callers can set
 *     `minRowHeight`, `rowHeight`, or `distributeRows` when the table
 *     should occupy a larger visual band.
 *   - When totalHeight exceeds region.height, paginates: returns
 *     `overflow.kind = "paginated"` with `remaining = { startRowIndex }`.
 *   - Single oversized cell (one cell taller than region) clips with
 *     ellipsis in the last visible row (degraded mode).
 */
import { emitHorizontalRule } from "../util/rule.js";
import { applyTypeTransform, estimateLineCount, estimateLineHeight, estimateTextWidth, flattenRuns, } from "../util/estimateText.js";
function isTextRunArray(value) {
    return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null && "text" in value[0];
}
function isParagraphArray(value) {
    return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null && "runs" in value[0];
}
function flattenLabel(label, transform) {
    if (typeof label === "string")
        return applyTypeTransform(label, transform);
    if (isParagraphArray(label)) {
        const text = label.map((p) => flattenRuns(p.runs)).join(" ");
        return applyTypeTransform(text, transform);
    }
    if (isTextRunArray(label)) {
        return applyTypeTransform(flattenRuns(label), transform);
    }
    return "";
}
function resolveLabelFillColor(role, tokens) {
    switch (role) {
        case "foreground": return tokens.palette.foreground;
        case "faint": return tokens.palette.faint;
        case "accent": return tokens.palette.accent;
        case "muted":
        default: return tokens.palette.muted;
    }
}
// Cell padding. Real Bain rows are dense — we keep inner padding tight.
const HEADER_PAD = 6;
export const matrixTable = (input, tokens, region) => {
    const nodes = [];
    const colCount = input.columnHeaders?.length ?? Math.max(1, ...input.rows.map((r) => r.cells.length + 1));
    const labelRatio = input.labelColumnWidthRatio ?? 0.20;
    const labelWidth = input.rowLabelWidth ?? Math.max(120, region.width * labelRatio);
    // Decide row-label treatment: "filled" only when palette has enough
    // contrast for inverse text against the accent (or muted) fill.
    const labelStyle = input.rowLabelStyle ?? (looksFillable(tokens) ? "filled" : "plain");
    const dataColCount = colCount - 1;
    const dataAreaWidth = region.width - labelWidth;
    const cellGapX = 0; // tables are flush; rule emission separates cells
    // Refuse to lay out when label width consumes the region or per-cell
    // content area would be negative. Negative-width nodes are a contract
    // violation downstream.
    const perDataColWidth = dataColCount > 0 ? dataAreaWidth / dataColCount : 0;
    if (dataAreaWidth <= 0 ||
        perDataColWidth - HEADER_PAD * 2 < 0 ||
        labelWidth - HEADER_PAD * 2 < 0) {
        return {
            nodes,
            overflow: {
                kind: "clipped",
                droppedCount: input.rows.length,
                reason: `region too narrow for ${colCount}-column matrixTable`,
            },
        };
    }
    const dataColLayout = [];
    // Honor explicit per-column weights when supplied. Length-mismatched
    // colW falls back to equal distribution rather than throwing — a
    // partial weight array is more likely a typo than a deliberate
    // override worth blocking the entire render on.
    const useWeights = Array.isArray(input.colW) && input.colW.length === dataColCount && dataColCount > 0;
    if (useWeights) {
        const weights = input.colW;
        const sumWeights = weights.reduce((a, b) => a + b, 0);
        let runningLeft = region.left + labelWidth;
        for (let i = 0; i < dataColCount; i++) {
            const colWidth = (dataAreaWidth * weights[i]) / sumWeights;
            dataColLayout.push({
                left: runningLeft,
                width: colWidth - cellGapX,
            });
            runningLeft += colWidth;
        }
    }
    else {
        for (let i = 0; i < dataColCount; i++) {
            dataColLayout.push({
                left: region.left + labelWidth + (dataAreaWidth / dataColCount) * i,
                width: dataAreaWidth / dataColCount - cellGapX,
            });
        }
    }
    let cursor = region.top;
    // ---- Header row ----
    if (input.columnHeaders && input.columnHeaders.length > 0) {
        const headerHeight = estimateLineHeight(tokens.type.title.size, tokens.type.title.lineHeight, tokens, tokens.type.title.family) + HEADER_PAD * 2;
        // Row-label-column header (top-left cell): typically empty in Bain
        // matrices; render as plain text if provided.
        const rowLabelHeader = input.columnHeaders[0];
        if (rowLabelHeader) {
            nodes.push(makeHeaderText(rowLabelHeader, tokens, {
                left: region.left + HEADER_PAD,
                top: cursor + HEADER_PAD,
                width: labelWidth - HEADER_PAD * 2,
                height: headerHeight - HEADER_PAD * 2,
            }));
        }
        // Data column headers — fill with accent when filled style is active,
        // otherwise plain text + bottom rule. Per-column override via
        // columnHeaderFills lets callers vary the fill per column (Bain p6:
        // first two cols accentSecondary, third col muted).
        for (let i = 0; i < dataColCount; i++) {
            const col = dataColLayout[i];
            const text = input.columnHeaders[i + 1];
            const overrideRole = input.columnHeaderFills?.[i + 1] ?? null;
            const fillColor = overrideRole === "foreground" ? tokens.palette.foreground
                : overrideRole === "muted" ? tokens.palette.muted
                    : overrideRole === "accentSecondary" ? (tokens.palette.accentSecondary ?? tokens.palette.accent)
                        : tokens.palette.accent;
            if (labelStyle === "filled") {
                const fill = {
                    kind: "view",
                    shape: "rect",
                    decorative: true,
                    zIndex: 0,
                    rect: { left: col.left, top: cursor, width: col.width, height: headerHeight },
                    fill: fillColor,
                };
                nodes.push(fill);
            }
            if (text) {
                const textNode = makeHeaderText(text, tokens, {
                    left: col.left + HEADER_PAD,
                    top: cursor + HEADER_PAD,
                    width: col.width - HEADER_PAD * 2,
                    height: headerHeight - HEADER_PAD * 2,
                });
                if (labelStyle === "filled") {
                    textNode.style.color = tokens.palette.accentInverse;
                    textNode.style.align = "center";
                    textNode.zIndex = 1;
                }
                nodes.push(textNode);
            }
        }
        cursor += headerHeight;
        // Header underline rule (only when headers are not filled — filled
        // headers don't need a rule; plain headers do for separation).
        if (labelStyle === "plain") {
            const ruleEmission = emitHorizontalRule(tokens.rules.section !== "none" ? tokens.rules.section : tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
            nodes.push(...ruleEmission.nodes);
            cursor += ruleEmission.consumedHeight;
        }
    }
    // ---- Body rows ----
    const startIndex = input.resume?.startRowIndex ?? 0;
    const rowHeightPlan = planBodyRowHeights(input, tokens, labelWidth, dataColLayout, startIndex, cursor, region);
    let placedRowCount = 0;
    for (let r = startIndex; r < input.rows.length; r++) {
        const row = input.rows[r];
        const rowHeight = rowHeightPlan.get(r) ?? computePlannedRowHeight(row, input, tokens, labelWidth, dataColLayout);
        if (process.env.RUNSTAMP_DEBUG_MATRIX) {
            // eslint-disable-next-line no-console
            console.error(`[matrixTable] row ${r} "${row.label}" height=${rowHeight} cursor=${cursor} limit=${region.top + region.height}`);
        }
        if (cursor + rowHeight > region.top + region.height + 0.5) {
            // Pagination — handing remaining rows back to the compiler.
            return {
                nodes,
                overflow: {
                    kind: "paginated",
                    remaining: { startRowIndex: r },
                    continuationLabel: `continued (${input.rows.length - r} rows remaining)`,
                },
            };
        }
        // Row label strip — per-row labelFill override drives the dark/mid/
        // light hierarchy seen on Bain p5. Default "muted" preserves the old
        // visual behavior for tables that don't pass a labelFill.
        if (labelStyle === "filled") {
            const fill = {
                kind: "view",
                shape: "rect",
                decorative: true,
                zIndex: 0,
                rect: { left: region.left, top: cursor, width: labelWidth, height: rowHeight },
                fill: resolveLabelFillColor(row.labelFill ?? "muted", tokens),
            };
            nodes.push(fill);
        }
        {
            const rotation = input.rowLabelRotation ?? 0;
            const isVertical = rotation === 90 || rotation === -90;
            // The strip rect is the strip itself, axis-aligned — no frame-dim
            // swap, no `decorative` escape hatch. Rotation is conveyed via
            // `textDirection: "vertical"` (OOXML vert270), which keeps the
            // shape's bounding box honest and lets the text body wrap with
            // budget = rect.height (the strip's long axis post-rotation).
            const labelRect = {
                left: region.left + HEADER_PAD,
                top: cursor + HEADER_PAD,
                width: labelWidth - HEADER_PAD * 2,
                height: rowHeight - HEADER_PAD * 2,
            };
            nodes.push(makeRowLabel(row.label, tokens, labelRect, labelStyle, isVertical));
        }
        // Optional accent tick (drawn over the label strip for "plain" style)
        if (row.accent) {
            const tick = {
                kind: "view",
                shape: "rect",
                decorative: true,
                zIndex: labelStyle === "filled" ? 2 : 1,
                rect: { left: region.left, top: cursor + 4, width: 2, height: rowHeight - 8 },
                fill: tokens.palette.accent,
            };
            nodes.push(tick);
        }
        // Data cells
        for (let c = 0; c < dataColCount; c++) {
            const col = dataColLayout[c];
            const cellContent = row.cells[c];
            if (cellContent === undefined || cellContent === null)
                continue;
            nodes.push(...makeCellContent(cellContent, tokens, {
                left: col.left + HEADER_PAD,
                top: cursor + HEADER_PAD,
                width: col.width - HEADER_PAD * 2,
                height: rowHeight - HEADER_PAD * 2,
            }, input.wrapPolicy ?? "wrap"));
        }
        cursor += rowHeight;
        placedRowCount++;
        // Divider between rows (skip after last row)
        if (r < input.rows.length - 1) {
            const ruleEmission = emitHorizontalRule(tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
            nodes.push(...ruleEmission.nodes);
            cursor += ruleEmission.consumedHeight;
        }
    }
    return {
        nodes,
        overflow: { kind: "fit" },
    };
};
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dividerHeight(tokens, region) {
    return emitHorizontalRule(tokens.rules.divider, tokens.palette, region.left, region.top, region.width).consumedHeight;
}
function computePlannedRowHeight(row, input, tokens, labelWidth, cols) {
    const natural = computeRowHeight(row, tokens, labelWidth, cols, input.rowLabelRotation ?? 0);
    return Math.max(natural, input.rowHeight ?? 0, input.minRowHeight ?? 0);
}
function planBodyRowHeights(input, tokens, labelWidth, cols, startIndex, bodyTop, region) {
    const planned = new Map();
    const rows = input.rows.slice(startIndex);
    if (rows.length === 0)
        return planned;
    for (let index = 0; index < rows.length; index++) {
        const absoluteIndex = startIndex + index;
        planned.set(absoluteIndex, computePlannedRowHeight(rows[index], input, tokens, labelWidth, cols));
    }
    if (!input.distributeRows)
        return planned;
    const dividersTotal = Math.max(0, rows.length - 1) * dividerHeight(tokens, region);
    const available = region.top + region.height - bodyTop - dividersTotal;
    const current = Array.from(planned.values()).reduce((sum, height) => sum + height, 0);
    const extra = available - current;
    if (extra <= 0)
        return planned;
    const addPerRow = extra / rows.length;
    for (const [index, height] of planned.entries()) {
        planned.set(index, height + addPerRow);
    }
    return planned;
}
function looksFillable(tokens) {
    // A bundle is "fillable" (filled row labels look right) when its accent
    // is dark enough that white text reads on it. Cheap luminance check.
    return luminance(tokens.palette.accent) < 0.55;
}
function luminance(hex) {
    const m = hex.match(/^#([0-9a-fA-F]{6})/u);
    if (!m)
        return 0.5;
    const v = parseInt(m[1], 16);
    const r = (v >> 16) & 0xff;
    const g = (v >> 8) & 0xff;
    const b = v & 0xff;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function makeHeaderText(content, tokens, rect) {
    const role = tokens.type.title;
    return {
        kind: "text",
        rect,
        content: applyTypeTransform(content, role.transform),
        style: {
            family: role.family,
            weight: role.weight,
            size: Math.min(role.size, 14), // header text is smaller than slide titles
            lineHeight: role.lineHeight !== undefined ? Math.min(role.lineHeight, 18) : undefined,
            letterSpacing: role.letterSpacing,
            italic: role.italic,
            color: tokens.palette.foreground,
            align: "left",
            verticalAlign: "middle",
        },
        autoFit: false,
    };
}
function makeRowLabel(content, tokens, rect, labelStyle, isVertical) {
    const role = tokens.type.caption;
    // The 11pt readability floor only applies to horizontal labels where
    // the strip is wide enough; vertical labels run in a deliberately
    // narrow strip and use the bundle's caption size as-is.
    const sizePt = isVertical ? role.size : Math.max(role.size, 11);
    const lineHeightPt = role.lineHeight !== undefined
        ? (isVertical ? role.lineHeight : Math.max(role.lineHeight, 14))
        : undefined;
    const node = {
        kind: "text",
        zIndex: labelStyle === "filled" ? 1 : undefined,
        rect,
        style: {
            family: role.family,
            weight: 700,
            size: sizePt,
            lineHeight: lineHeightPt,
            letterSpacing: role.letterSpacing,
            italic: role.italic,
            color: labelStyle === "filled" ? tokens.palette.accentInverse : tokens.palette.foreground,
            align: isVertical ? "center" : "left",
            verticalAlign: "middle",
            ...(isVertical ? { textDirection: "vertical" } : {}),
        },
        autoFit: false,
    };
    if (typeof content === "string") {
        node.content = applyTypeTransform(content, role.transform);
    }
    else if (isParagraphArray(content)) {
        node.paragraphs = content;
    }
    else if (isTextRunArray(content)) {
        node.runs = content;
    }
    else {
        node.content = "";
    }
    return node;
}
/**
 * Truncate `text` so its rendered width fits within `width` px and append
 * "…". Returns the original string when no truncation is needed. Uses a
 * binary search on character count so we don't pay O(n) per cell.
 */
function truncateToWidth(text, width, family, sizePt, letterSpacing, tokens) {
    const fullWidth = estimateTextWidth({ content: text, family, sizePt, letterSpacing }, tokens);
    if (fullWidth <= width)
        return text;
    const ellipsis = "…";
    const ellipsisWidth = estimateTextWidth({ content: ellipsis, family, sizePt, letterSpacing }, tokens);
    const budget = Math.max(0, width - ellipsisWidth);
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        const w = estimateTextWidth({ content: text.slice(0, mid), family, sizePt, letterSpacing }, tokens);
        if (w <= budget)
            lo = mid;
        else
            hi = mid - 1;
    }
    if (lo <= 0)
        return ellipsis;
    return text.slice(0, lo).trimEnd() + ellipsis;
}
/**
 * Reduce font size in 0.5pt steps from `baseSizePt` down to `floorPt`
 * until `text` fits in `width` on a single line. Returns the chosen size
 * (>= floor); when even at floor the text doesn't fit, returns floor and
 * the caller falls back to ellipsis-style trimming.
 */
function shrinkToFit(text, width, family, baseSizePt, letterSpacing, tokens, floorPt = 8) {
    if (estimateTextWidth({ content: text, family, sizePt: baseSizePt, letterSpacing }, tokens) <= width) {
        return baseSizePt;
    }
    let size = baseSizePt;
    while (size > floorPt) {
        size = Math.max(floorPt, size - 0.5);
        const w = estimateTextWidth({ content: text, family, sizePt: size, letterSpacing }, tokens);
        if (w <= width)
            return size;
    }
    return floorPt;
}
function makeCellContent(content, tokens, rect, wrapPolicy = "wrap") {
    const role = tokens.type.body;
    const lineHeightPx = estimateLineHeight(role.size, role.lineHeight, tokens, role.family);
    if (typeof content === "string") {
        let displayText = applyTypeTransform(content, role.transform);
        let displaySize = role.size;
        if (wrapPolicy === "ellipsis") {
            displayText = truncateToWidth(displayText, rect.width, role.family, role.size, role.letterSpacing, tokens);
        }
        else if (wrapPolicy === "shrink") {
            displaySize = shrinkToFit(displayText, rect.width, role.family, role.size, role.letterSpacing, tokens);
            // If even at floor the text still overflows, also clip with ellipsis
            // so we never bleed past the column boundary.
            const w = estimateTextWidth({ content: displayText, family: role.family, sizePt: displaySize, letterSpacing: role.letterSpacing }, tokens);
            if (w > rect.width) {
                displayText = truncateToWidth(displayText, rect.width, role.family, displaySize, role.letterSpacing, tokens);
            }
        }
        return [
            {
                kind: "text",
                rect,
                content: displayText,
                style: {
                    family: role.family,
                    weight: role.weight,
                    size: displaySize,
                    lineHeight: role.lineHeight,
                    letterSpacing: role.letterSpacing,
                    italic: role.italic,
                    color: tokens.palette.foreground,
                    align: "left",
                    verticalAlign: "top",
                },
                autoFit: false,
            },
        ];
    }
    // Paragraph[] check must precede TextRun[] — both are arrays-of-objects;
    // Paragraph has `runs`, TextRun has `text`. Order matters for the
    // discriminator.
    if (isParagraphArray(content)) {
        // wrapPolicy intentionally ignored for paragraph cells: the author
        // already structured the content as multi-line, so wrap is correct.
        return [
            {
                kind: "text",
                rect,
                paragraphs: content,
                style: {
                    family: role.family,
                    weight: role.weight,
                    size: role.size,
                    lineHeight: role.lineHeight,
                    letterSpacing: role.letterSpacing,
                    italic: role.italic,
                    color: tokens.palette.foreground,
                    align: "left",
                    verticalAlign: "top",
                },
                autoFit: false,
            },
        ];
    }
    if (isTextRunArray(content)) {
        // Rich-runs cell — emit a single TextNode carrying the runs array.
        // Type transform is applied per-run (callers passing "long-term"
        // copy with a token role configured for "upper" still get caps).
        let transformedRuns = role.transform === "upper"
            ? content.map((r) => ({ ...r, text: r.text.toUpperCase() }))
            : role.transform === "lower"
                ? content.map((r) => ({ ...r, text: r.text.toLowerCase() }))
                : content;
        let displaySize = role.size;
        if (wrapPolicy === "ellipsis" || wrapPolicy === "shrink") {
            const concatText = transformedRuns.map((r) => r.text).join("");
            if (wrapPolicy === "shrink") {
                displaySize = shrinkToFit(concatText, rect.width, role.family, role.size, role.letterSpacing, tokens);
            }
            const fitWidth = estimateTextWidth({ content: concatText, family: role.family, sizePt: displaySize, letterSpacing: role.letterSpacing }, tokens);
            if (fitWidth > rect.width) {
                // Truncate the LAST run only — preserves bold lead-in formatting
                // and only loses tail characters that wouldn't have fit anyway.
                const truncated = truncateToWidth(concatText, rect.width, role.family, displaySize, role.letterSpacing, tokens);
                // Walk runs left→right, replacing tail-run text with the slice of
                // `truncated` that remains after the preceding runs are emitted.
                const out = [];
                let consumed = 0;
                for (const run of transformedRuns) {
                    const remaining = truncated.length - consumed;
                    if (remaining <= 0)
                        break;
                    if (run.text.length <= remaining) {
                        out.push(run);
                        consumed += run.text.length;
                    }
                    else {
                        out.push({ ...run, text: truncated.slice(consumed) });
                        consumed = truncated.length;
                        break;
                    }
                }
                transformedRuns = out;
            }
        }
        return [
            {
                kind: "text",
                rect,
                runs: transformedRuns,
                style: {
                    family: role.family,
                    weight: role.weight,
                    size: displaySize,
                    lineHeight: role.lineHeight,
                    letterSpacing: role.letterSpacing,
                    italic: role.italic,
                    color: tokens.palette.foreground,
                    align: "left",
                    verticalAlign: "top",
                },
                autoFit: false,
            },
        ];
    }
    // Array → emit a vertical stack of sub-text nodes (one per item),
    // separated by a small gap. Used for matrix cells that contain a list.
    const nodes = [];
    let y = rect.top;
    const itemGap = tokens.spacing.xs;
    for (const line of content) {
        // Measure including the rendered "• " prefix; under-measuring here
        // is what leaves bullet 2 sitting on bullet 1's wrapped tail.
        const lines = estimateLineCount({
            content: `• ${line}`,
            family: role.family,
            sizePt: role.size,
            letterSpacing: role.letterSpacing,
            width: rect.width,
        }, tokens);
        const h = lineHeightPx * lines;
        nodes.push({
            kind: "text",
            rect: { left: rect.left, top: y, width: rect.width, height: h },
            content: `• ${applyTypeTransform(line, role.transform)}`,
            style: {
                family: role.family,
                weight: role.weight,
                size: role.size,
                lineHeight: role.lineHeight,
                letterSpacing: role.letterSpacing,
                italic: role.italic,
                color: tokens.palette.foreground,
                align: "left",
                verticalAlign: "top",
            },
            autoFit: false,
        });
        y += h + itemGap;
        if (y > rect.top + rect.height)
            break;
    }
    return nodes;
}
function computeRowHeight(row, tokens, labelWidth, cols, labelRotation = 0) {
    const role = tokens.type.body;
    const lineHeightPx = estimateLineHeight(role.size, role.lineHeight, tokens, role.family);
    const isVertical = labelRotation === 90 || labelRotation === -90;
    const labelSize = isVertical
        ? tokens.type.caption.size
        : Math.max(tokens.type.caption.size, 11);
    const labelLineHeightPx = estimateLineHeight(labelSize, tokens.type.caption.lineHeight, tokens, tokens.type.caption.family);
    // Flatten label content (string / runs / paragraphs) to a single string
    // for measurement. Multi-paragraph labels are rare on row strips; when
    // present, we sum the paragraph wrap heights instead.
    const labelText = flattenLabel(row.label, tokens.type.caption.transform);
    const labelParas = isParagraphArray(row.label) ? row.label : null;
    let labelHeight;
    if (isVertical) {
        // Vertical labels (vert270): wrap budget is the strip's long axis
        // (= rowHeight after rotation). The strip's narrow dim (labelWidth)
        // accommodates `floor(labelWidth/lineHeight)` stacked vertical lines
        // — so a long label can wrap to 2+ vertical lines and the strip's
        // required vertical run shrinks to ~textW/maxLines.
        const textW = estimateTextWidth({
            content: labelText,
            family: tokens.type.caption.family,
            sizePt: labelSize,
            letterSpacing: tokens.type.caption.letterSpacing,
        }, tokens);
        const linesAvailable = Math.max(1, Math.floor((labelWidth - HEADER_PAD * 2) / labelLineHeightPx));
        labelHeight = Math.ceil(textW / linesAvailable) + HEADER_PAD * 2;
    }
    else if (labelParas) {
        let total = HEADER_PAD * 2;
        for (const para of labelParas) {
            const text = flattenRuns(para.runs);
            const lines = text.length === 0 ? 1 : estimateLineCount({
                content: text,
                family: tokens.type.caption.family,
                sizePt: labelSize,
                letterSpacing: tokens.type.caption.letterSpacing,
                width: labelWidth - HEADER_PAD * 2,
            }, tokens);
            total += labelLineHeightPx * lines + (para.spaceAfter ?? 0);
        }
        labelHeight = total;
    }
    else {
        const labelLines = estimateLineCount({
            content: labelText,
            family: tokens.type.caption.family,
            sizePt: labelSize,
            letterSpacing: tokens.type.caption.letterSpacing,
            width: labelWidth - HEADER_PAD * 2,
        }, tokens);
        labelHeight = labelLineHeightPx * labelLines + HEADER_PAD * 2;
    }
    // Data cell height
    let cellMaxHeight = 0;
    row.cells.forEach((cell, ci) => {
        const col = cols[ci];
        if (!col)
            return;
        const innerWidth = col.width - HEADER_PAD * 2;
        if (typeof cell === "string") {
            const lines = estimateLineCount({
                content: cell,
                family: role.family,
                sizePt: role.size,
                letterSpacing: role.letterSpacing,
                width: innerWidth,
            }, tokens);
            cellMaxHeight = Math.max(cellMaxHeight, lineHeightPx * lines + HEADER_PAD * 2);
        }
        else if (isParagraphArray(cell)) {
            let total = HEADER_PAD * 2;
            for (const para of cell) {
                // Width consumed by left-margin + level-derived auto-indent. Prefer
                // explicit `indent`/`marginLeft` over the level heuristic so we don't
                // double-count when both are set.
                const explicitIndent = para.indent ?? para.marginLeft;
                const indentPx = explicitIndent !== undefined
                    ? explicitIndent
                    : Math.max(0, (para.level ?? 0) * 14);
                const wrapWidth = Math.max(20, innerWidth - indentPx);
                const text = flattenRuns(para.runs);
                const lines = text.length === 0 ? 1 : estimateLineCount({
                    content: text,
                    family: role.family,
                    sizePt: role.size,
                    letterSpacing: role.letterSpacing,
                    width: wrapWidth,
                }, tokens);
                total += lineHeightPx * lines + (para.spaceAfter ?? 0);
            }
            cellMaxHeight = Math.max(cellMaxHeight, total);
        }
        else if (isTextRunArray(cell)) {
            // Rich-runs cell — measure as the flattened paragraph at the body
            // role's base size. Per-run fontSize overrides aren't tracked here;
            // matrixTable's height estimator over-estimates rather than under
            // for safety, and rich runs typically vary weight only.
            const lines = estimateLineCount({
                content: flattenRuns(cell),
                family: role.family,
                sizePt: role.size,
                letterSpacing: role.letterSpacing,
                width: innerWidth,
            }, tokens);
            cellMaxHeight = Math.max(cellMaxHeight, lineHeightPx * lines + HEADER_PAD * 2);
        }
        else if (Array.isArray(cell)) {
            const itemGap = tokens.spacing.xs;
            let total = HEADER_PAD * 2;
            for (const line of cell) {
                const lines = estimateLineCount({
                    content: `• ${line}`,
                    family: role.family,
                    sizePt: role.size,
                    letterSpacing: role.letterSpacing,
                    width: innerWidth,
                }, tokens);
                total += lineHeightPx * lines + itemGap;
            }
            cellMaxHeight = Math.max(cellMaxHeight, total);
        }
    });
    // Floor on row height for visual consistency.
    const minHeight = lineHeightPx + HEADER_PAD * 2;
    return Math.max(minHeight, labelHeight, cellMaxHeight);
}
//# sourceMappingURL=matrixTable.js.map