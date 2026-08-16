/**
 * Shared helper: emit PrimitiveNode[] for a parsed rule pattern as stacked
 * horizontal hairlines at a given (left, top, width).
 *
 * Used by titleBlock, sectionRibbon, footerChrome, and any other primitive
 * that hosts rule patterns. Returns [] for `"none"` patterns so callers can
 * always splice the result unconditionally.
 */

import type { PrimitiveNode, ViewNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import { parseRulePattern } from "../tokens/rulePattern.js";

export interface RuleEmissionResult {
  nodes: PrimitiveNode[];
  /** Total height consumed (px). 0 if pattern is `none`. */
  consumedHeight: number;
}

export function emitHorizontalRule(
  pattern: string,
  palette: ResolvedTokens["palette"],
  left: number,
  top: number,
  width: number,
): RuleEmissionResult {
  const parsed = parseRulePattern(pattern, palette);
  if (!parsed) return { nodes: [], consumedHeight: 0 };
  const nodes: PrimitiveNode[] = [];
  let y = top;
  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i];
    const node: ViewNode = {
      kind: "view",
      shape: "rect",
      decorative: true,
      rect: { left, top: y, width, height: line.width },
      fill: line.color,
    };
    nodes.push(node);
    y += line.width;
    if (i < parsed.lines.length - 1) y += parsed.gap;
  }
  return { nodes, consumedHeight: parsed.totalHeight };
}
