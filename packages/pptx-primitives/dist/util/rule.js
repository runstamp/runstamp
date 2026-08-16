/**
 * Shared helper: emit PrimitiveNode[] for a parsed rule pattern as stacked
 * horizontal hairlines at a given (left, top, width).
 *
 * Used by titleBlock, sectionRibbon, footerChrome, and any other primitive
 * that hosts rule patterns. Returns [] for `"none"` patterns so callers can
 * always splice the result unconditionally.
 */
import { parseRulePattern } from "../tokens/rulePattern.js";
export function emitHorizontalRule(pattern, palette, left, top, width) {
    const parsed = parseRulePattern(pattern, palette);
    if (!parsed)
        return { nodes: [], consumedHeight: 0 };
    const nodes = [];
    let y = top;
    for (let i = 0; i < parsed.lines.length; i++) {
        const line = parsed.lines[i];
        const node = {
            kind: "view",
            shape: "rect",
            decorative: true,
            rect: { left, top: y, width, height: line.width },
            fill: line.color,
        };
        nodes.push(node);
        y += line.width;
        if (i < parsed.lines.length - 1)
            y += parsed.gap;
    }
    return { nodes, consumedHeight: parsed.totalHeight };
}
//# sourceMappingURL=rule.js.map