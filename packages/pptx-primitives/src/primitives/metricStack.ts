/**
 * metricStack — vertical list of label/value/delta rows separated by
 * hairline dividers.
 *
 * Companion to kpiHero. Typical composition: a hero metric in the
 * dominant left column, three or four supporting metrics stacked here on
 * the right.
 *
 * Per row:
 *
 *   ┌────────────────────────────────┐
 *   │ NRR                            │  ← caption role, muted, tracked
 *   │ 118%                           │  ← title role, foreground, large
 *   │ +4 pts                         │  ← caption role, accent or muted
 *   │ ─────────────────────────────  │  ← divider rule (rules.divider)
 *   └────────────────────────────────┘
 *
 * Tokens consumed:
 *   - palette.foreground, palette.muted, palette.accent
 *   - type.caption (label, delta), type.title (value)
 *   - rules.divider (between rows; `none` skips dividers)
 *
 * Content adaptation: the value compresses per-row when its width
 * exceeds the region width. Pagination kicks in when total height
 * exceeds region.height (returns `paginated` with remaining items).
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, TextNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import {
  applyTypeTransform,
  estimateLineHeight,
  estimateTextWidth,
} from "../util/estimateText.js";
import { emitHorizontalRule } from "../util/rule.js";

export interface MetricStackInput {
  rows: Array<{
    label: string;
    value: string;
    delta?: string;
    trend?: "up" | "down" | "flat";
  }>;
  /** Pagination resume — opaque payload from previous render. */
  resume?: { startIndex: number };
}

const VALUE_MIN_COMPRESSION = 0.85;
const VALUE_COMPRESSION_STEP = 0.05;

export const metricStack: Primitive<MetricStackInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];
  let cursor = region.top;
  const startIndex = input.resume?.startIndex ?? 0;
  let placedCount = 0;
  let worstScale = 1.0;

  for (let i = startIndex; i < input.rows.length; i++) {
    const row = input.rows[i];
    const rowResult = layoutRow(row, tokens, {
      left: region.left,
      top: cursor,
      width: region.width,
    });

    // Pagination check.
    const rowEnd = cursor + rowResult.consumedHeight;
    const ruleHeightAfter =
      i < input.rows.length - 1 && tokens.rules.divider !== "none"
        ? estimateRuleHeight(tokens)
        : 0;
    if (rowEnd + ruleHeightAfter > region.top + region.height + 0.5) {
      if (placedCount === 0) {
        // Single row taller than region — degraded clip.
        nodes.push(...rowResult.nodes);
        return {
          nodes,
          overflow: {
            kind: "clipped",
            droppedCount: input.rows.length - i - 1,
            reason: `metricStack row ${i} is taller than the region; ${input.rows.length - i - 1} subsequent rows dropped`,
          },
        };
      }
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startIndex: i },
          continuationLabel: `continued (${input.rows.length - i} metrics remaining)`,
        },
      };
    }

    nodes.push(...rowResult.nodes);
    cursor = rowEnd;
    placedCount++;
    if (rowResult.scale < worstScale) worstScale = rowResult.scale;

    // Divider after every row except the last.
    if (i < input.rows.length - 1) {
      cursor += tokens.spacing.sm;
      const divider = emitHorizontalRule(
        tokens.rules.divider,
        tokens.palette,
        region.left,
        cursor,
        region.width,
      );
      nodes.push(...divider.nodes);
      cursor += divider.consumedHeight + tokens.spacing.sm;
    }
  }

  return {
    nodes,
    overflow:
      worstScale < 1.0
        ? { kind: "compressed", scale: worstScale }
        : { kind: "fit" },
  };
};

interface RowLayoutResult {
  nodes: PrimitiveNode[];
  consumedHeight: number;
  scale: number;
}

function layoutRow(
  row: MetricStackInput["rows"][number],
  tokens: ResolvedTokens,
  place: { left: number; top: number; width: number },
): RowLayoutResult {
  const nodes: PrimitiveNode[] = [];
  let cursor = place.top;

  // Label.
  const caption = tokens.type.caption;
  const labelHeight = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
  const labelNode: TextNode = {
    kind: "text",
    rect: { left: place.left, top: cursor, width: place.width, height: labelHeight },
    content: applyTypeTransform(row.label, caption.transform),
    style: {
      family: caption.family,
      weight: caption.weight,
      size: caption.size,
      lineHeight: caption.lineHeight,
      letterSpacing: caption.letterSpacing,
      italic: caption.italic,
      color: tokens.palette.muted,
      align: "left",
      verticalAlign: "top",
    },
    autoFit: false,
  };
  nodes.push(labelNode);
  cursor += labelHeight + tokens.spacing.xs;

  // Value with width-based compression.
  const valueRole = tokens.type.title;
  let scale = 1.0;
  let valueWidth = estimateTextWidth({
    content: row.value,
    family: valueRole.family,
    sizePt: valueRole.size,
    letterSpacing: valueRole.letterSpacing,
    digitsOnly: /^[\d,.\s$%+\-]+$/u.test(row.value),
  }, tokens);
  while (valueWidth > place.width && scale > VALUE_MIN_COMPRESSION - 1e-9) {
    scale = Number((scale - VALUE_COMPRESSION_STEP).toFixed(2));
    valueWidth = estimateTextWidth({
      content: row.value,
      family: valueRole.family,
      sizePt: valueRole.size * scale,
      letterSpacing: valueRole.letterSpacing * scale,
      digitsOnly: /^[\d,.\s$%+\-]+$/u.test(row.value),
    }, tokens);
  }
  const valueSizePt = valueRole.size * scale;
  const valueLineHeightPt =
    valueRole.lineHeight !== undefined ? valueRole.lineHeight * scale : valueSizePt * 1.15;
  const valueLineHeightPx = estimateLineHeight(valueSizePt, valueLineHeightPt, tokens, valueRole.family);
  const valueNode: TextNode = {
    kind: "text",
    rect: { left: place.left, top: cursor, width: place.width, height: valueLineHeightPx },
    content: applyTypeTransform(row.value, valueRole.transform),
    style: {
      family: valueRole.family,
      weight: valueRole.weight,
      size: valueSizePt,
      lineHeight: valueLineHeightPt,
      letterSpacing: valueRole.letterSpacing * scale,
      italic: valueRole.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top",
    },
    autoFit: false,
  };
  nodes.push(valueNode);
  cursor += valueLineHeightPx;

  // Delta.
  if (row.delta) {
    cursor += tokens.spacing.xs;
    const deltaCaption = tokens.type.caption;
    const deltaHeight = estimateLineHeight(deltaCaption.size, deltaCaption.lineHeight, tokens, deltaCaption.family);
    const trend = row.trend ?? "flat";
    const deltaColor =
      trend === "up"
        ? tokens.palette.accent
        : trend === "down"
          ? tokens.palette.muted
          : tokens.palette.faint;
    nodes.push({
      kind: "text",
      rect: { left: place.left, top: cursor, width: place.width, height: deltaHeight },
      content: applyTypeTransform(row.delta, deltaCaption.transform),
      style: {
        family: deltaCaption.family,
        weight: deltaCaption.weight,
        size: Math.max(deltaCaption.size, 10),
        lineHeight: deltaCaption.lineHeight,
        letterSpacing: deltaCaption.letterSpacing,
        italic: deltaCaption.italic,
        color: deltaColor,
        align: "left",
        verticalAlign: "top",
      },
      autoFit: false,
    });
    cursor += deltaHeight;
  }

  return {
    nodes,
    consumedHeight: cursor - place.top,
    scale,
  };
}

function estimateRuleHeight(tokens: ResolvedTokens): number {
  // Cheap pre-estimate: sum the px widths of segments in the divider.
  // We lean on parseRulePattern via emitHorizontalRule for the real value
  // when we actually emit; this is just a budget check.
  if (tokens.rules.divider === "none") return 0;
  const m = tokens.rules.divider.matchAll(/(\d+(?:\.\d+)?)px/gu);
  let total = 0;
  for (const match of m) total += Number(match[1]);
  return total;
}
