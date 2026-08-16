/**
 * stepTimeline — horizontal rail with N step markers.
 *
 * LG signature: a horizontal hairline across the slide with circled
 * numerals along it, month labels above, descriptive titles below. Bain
 * occasionally uses a simpler dot-and-rail timeline for project plans.
 *
 *      MAY              JUNE             JULY
 *       ●                 ●                ●     ← marker (token-driven shape)
 *  ─────│─────────────────│────────────────│──── ← rail (rules.divider)
 *
 *  Launch packaging  Expand bench    Open channel
 *  refresh           for larger      pilot
 *  ...               deals
 *
 * Tokens consumed:
 *   - palette.accent (markers, label color), palette.foreground, palette.muted
 *   - type.eyebrow (month label above), type.title (step label below),
 *     type.body (description)
 *   - rules.divider (rail), ornament.stepMarker (circleNumeric / serifCircled / plain)
 *   - spacing.* for vertical separation
 *
 * Content adaptation:
 *   - Step labels wrap within their column (region.width / N).
 *   - Description compresses; if total height > region.height the timeline
 *     truncates description (clipped) — never paginates a timeline.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, TextNode, ViewNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import {
  applyTypeTransform,
  estimateLineCount,
  estimateLineHeight,
} from "../util/estimateText.js";
import { emitHorizontalRule } from "../util/rule.js";

export interface StepTimelineInput {
  steps: Array<{
    /** Tag above the step (date, "MAY", "Q1", "STEP 1"). */
    tag: string;
    /** Headline label below the marker. */
    label: string;
    /** Optional description below the label. */
    description?: string;
  }>;
}

/** Minimum gap between the tag/label edge and the marker edge.
 *  Below this the validator's overlap check (>120 px²) trips for wide
 *  tag rects that sit close to a 32px circled marker. */
const MARKER_BREATHING_ROOM = 4;
/** Vertical padding from rail to the nearest tag/label edge. Computed
 *  per-render below — for circled markers we need at least the marker
 *  radius plus breathing room; for plain dots a smaller fixed pad is fine. */
const PLAIN_DOT_RADIUS = 5;
const CIRCLED_MARKER_RADIUS = 16;

export const stepTimeline: Primitive<StepTimelineInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];
  const stepCount = input.steps.length;
  if (stepCount === 0) return { nodes, overflow: { kind: "fit" } };

  const colWidth = region.width / stepCount;
  const railY = region.top + region.height * 0.30;
  const markerStyle = tokens.ornament.stepMarker.style;
  const markerRadius = markerStyle === "circleNumeric" || markerStyle === "serifCircled"
    ? CIRCLED_MARKER_RADIUS
    : PLAIN_DOT_RADIUS;
  const railVerticalPadding = markerRadius + MARKER_BREATHING_ROOM;

  // Rail.
  const rule = emitHorizontalRule(
    tokens.rules.divider !== "none" ? tokens.rules.divider : "1px solid token:rule",
    tokens.palette,
    region.left,
    railY,
    region.width,
  );
  nodes.push(...rule.nodes);

  // Pre-compute label heights across all columns so descriptions baseline-align.
  const titleRole = tokens.type.title;
  const titleSize = Math.min(titleRole.size, 22);
  const titleLineHeight = titleRole.lineHeight !== undefined ? Math.min(titleRole.lineHeight, 28) : undefined;
  const labelLineHeightPx = estimateLineHeight(titleSize, titleLineHeight, tokens, titleRole.family);
  const labelLineCounts = input.steps.map((s) =>
    estimateLineCount({
      content: s.label,
      family: titleRole.family,
      sizePt: titleSize,
      letterSpacing: titleRole.letterSpacing,
      width: colWidth * 0.9,
    }, tokens),
  );
  const maxLabelLines = Math.max(1, ...labelLineCounts);
  const labelTop = railY + railVerticalPadding + 8;
  const maxLabelHeight = labelLineHeightPx * maxLabelLines;
  const descTop = labelTop + maxLabelHeight + tokens.spacing.xs;

  for (let i = 0; i < stepCount; i++) {
    const step = input.steps[i];
    const colCenterX = region.left + (i + 0.5) * colWidth;

    // Tag above (eyebrow).
    const eyebrow = tokens.type.eyebrow;
    const tagHeight = estimateLineHeight(eyebrow.size, eyebrow.lineHeight, tokens, eyebrow.family);
    const tagNode: TextNode = {
      kind: "text",
      rect: {
        left: colCenterX - colWidth * 0.45,
        top: railY - railVerticalPadding - tagHeight,
        width: colWidth * 0.9,
        height: tagHeight,
      },
      content: applyTypeTransform(step.tag, eyebrow.transform),
      style: {
        family: eyebrow.family,
        weight: eyebrow.weight,
        size: eyebrow.size,
        lineHeight: eyebrow.lineHeight,
        letterSpacing: eyebrow.letterSpacing,
        italic: eyebrow.italic,
        color: tokens.palette.accent,
        align: "center",
        verticalAlign: "bottom",
      },
      autoFit: false,
    };
    nodes.push(tagNode);

    // Marker.
    nodes.push(...makeStepMarker(i + 1, colCenterX, railY, tokens));

    // Label — allocated shared max-height block so descriptions below baseline-align.
    const labelNode: TextNode = {
      kind: "text",
      rect: {
        left: colCenterX - colWidth * 0.45,
        top: labelTop,
        width: colWidth * 0.9,
        height: maxLabelHeight,
      },
      content: applyTypeTransform(step.label, titleRole.transform),
      style: {
        family: titleRole.family,
        weight: titleRole.weight,
        size: titleSize,
        lineHeight: titleLineHeight,
        letterSpacing: titleRole.letterSpacing,
        italic: titleRole.italic,
        color: tokens.palette.foreground,
        align: "center",
        verticalAlign: "top",
      },
      autoFit: false,
    };
    nodes.push(labelNode);

    // Description below the shared label baseline.
    if (step.description) {
      const body = tokens.type.body;
      const descLineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
      const descLines = estimateLineCount({
        content: step.description,
        family: body.family,
        sizePt: body.size,
        letterSpacing: body.letterSpacing,
        width: colWidth * 0.9,
      }, tokens);
      const descHeight = descLineHeightPx * descLines;
      if (descTop + descHeight <= region.top + region.height + 0.5) {
        nodes.push({
          kind: "text",
          rect: {
            left: colCenterX - colWidth * 0.45,
            top: descTop,
            width: colWidth * 0.9,
            height: descHeight,
          },
          content: applyTypeTransform(step.description, body.transform),
          style: {
            family: body.family,
            weight: body.weight,
            size: body.size,
            lineHeight: body.lineHeight,
            letterSpacing: body.letterSpacing,
            italic: body.italic,
            color: tokens.palette.muted,
            align: "center",
            verticalAlign: "top",
          },
          autoFit: false,
        });
      }
    }
  }

  return { nodes, overflow: { kind: "fit" } };
};

function makeStepMarker(
  index: number,
  cx: number,
  cy: number,
  tokens: ResolvedTokens,
): PrimitiveNode[] {
  const style = tokens.ornament.stepMarker.style;
  const fillRole = tokens.ornament.stepMarker.fill;
  const fill = resolveOrnamentFill(fillRole, tokens);

  if (style === "none" || style === "plain") {
    const r = 5;
    const dot: ViewNode = {
      kind: "view",
      shape: "ellipse",
      decorative: true,
      zIndex: 2,
      rect: { left: cx - r, top: cy - r, width: r * 2, height: r * 2 },
      fill,
    };
    return [dot];
  }

  // circleNumeric / serifCircled — filled circle with numeric label inside.
  const diameter = 32;
  const circle: ViewNode = {
    kind: "view",
    shape: "ellipse",
    decorative: false,
    zIndex: 2,
    rect: { left: cx - diameter / 2, top: cy - diameter / 2, width: diameter, height: diameter },
    fill,
  };
  const label: TextNode = {
    kind: "text",
    zIndex: 3,
    rect: { left: cx - diameter / 2, top: cy - diameter / 2, width: diameter, height: diameter },
    content: String(index),
    style: {
      family: style === "serifCircled" ? "Georgia" : tokens.type.title.family,
      weight: 700,
      size: 16,
      letterSpacing: 0,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle",
    },
    autoFit: false,
  };
  return [circle, label];
}

function resolveOrnamentFill(
  role: ResolvedTokens["ornament"]["stepMarker"]["fill"],
  tokens: ResolvedTokens,
): string {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "accent":
      return tokens.palette.accent;
    case "muted":
      return tokens.palette.muted;
    case "surface":
      return tokens.canvas.surface;
  }
}
