/**
 * bulletList — depth-aware list with token-driven marker styling.
 *
 * Reads ornament.bullet for marker choice (filledDot / openDot / enDash /
 * square / chevron / none), marker color role, marker gap, indent per
 * nested level, and a separate nestedMarker for level 2+.
 *
 * This is Bain's bread-and-butter. Bain items = { marker: filledDot,
 * color: accent, nestedMarker: enDash, color muted }. A minimal token
 * bundle yields small dark dots on black. LG-shaped bundles typically
 * disable bullets entirely (`marker: "none"`) — in which case list items
 * render as unmarked paragraphs with indent-only hierarchy.
 *
 * Content adaptation:
 *   - Items wrap naturally within the region width.
 *   - Total height exceeding the region paginates: remaining items are
 *     returned via overflow.remaining for the compiler to place on a
 *     continuation slide.
 *   - No compression; if a single item is too tall alone, it clips
 *     (callers should split items before hitting this primitive).
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { BulletConfig, PrimitiveNode, Rect, TextNode, ViewNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import { estimateLineCount, estimateLineHeight, applyTypeTransform } from "../util/estimateText.js";

export interface BulletListInput {
  items: BulletItem[];
  /** Optional opaque continuation payload from a prior paginated render. */
  resume?: { startIndex: number };
}

export interface BulletItem {
  text: string;
  /** 1 = top-level, 2 = nested. Clamped to [1, 2] for now. */
  level?: number;
}

type ResolvedMarker = ResolvedTokens["ornament"]["bullet"]["marker"];

export const bulletList: Primitive<BulletListInput> = (input, tokens, region) => {
  const { bullet } = tokens.ornament;
  const body = tokens.type.body;
  const nodes: PrimitiveNode[] = [];

  const startIndex = input.resume?.startIndex ?? 0;
  const betweenItemGap = tokens.spacing.sm;
  let cursor = region.top;
  let placed = startIndex;

  for (let i = startIndex; i < input.items.length; i++) {
    const item = input.items[i];
    const level = Math.min(2, Math.max(1, item.level ?? 1));
    const indent = (level - 1) * bullet.indent;
    const markerStyle: ResolvedMarker = level === 1 ? bullet.marker : bullet.nestedMarker;
    const nativeBullet = tokenBulletConfig(bullet, markerStyle, i + 1);
    const textLeft = nativeBullet
      ? region.left
      : region.left + indent + markerWidth(markerStyle, body.size) + bullet.gap;
    const textWidth = region.width - (textLeft - region.left);
    const lines = estimateLineCount({
      content: item.text,
      family: body.family,
      sizePt: body.size,
      letterSpacing: body.letterSpacing,
      width: textWidth,
    }, tokens);
    const lineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
    const itemHeight = Math.max(lineHeightPx, lineHeightPx * lines);

    // Will this item still fit?
    if (cursor + itemHeight > region.top + region.height + 0.5) {
      // Paginate: hand remaining items back to the compiler.
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startIndex: i },
          continuationLabel: `continued (${input.items.length - i} remaining)`,
        },
      };
    }

    // Marker
    if (markerStyle !== "none" && !nativeBullet) {
      nodes.push(
        makeMarker(markerStyle, {
          left: region.left + indent,
          top: cursor,
          size: body.size,
          lineHeight: lineHeightPx,
          color: resolveMarkerColor(bullet.color, tokens),
          sizeRatio: bullet.sizeRatio,
        }),
      );
    }

    // Item text
    const textNode: TextNode = {
      kind: "text",
      rect: { left: textLeft, top: cursor, width: textWidth, height: itemHeight },
      style: {
        family: body.family,
        weight: body.weight,
        size: body.size,
        lineHeight: body.lineHeight,
        letterSpacing: body.letterSpacing,
        italic: body.italic,
        color: level === 1 ? tokens.palette.foreground : tokens.palette.muted,
        align: "left",
        verticalAlign: "top",
      },
      autoFit: false,
    };
    if (nativeBullet) {
      textNode.paragraphs = [{
        runs: [{ text: applyTypeTransform(item.text, body.transform) }],
        level: level - 1,
        marginLeft: bullet.indent + bullet.gap,
        hangingIndent: bullet.indent,
        bullet: nativeBullet,
      }];
    } else {
      textNode.content = applyTypeTransform(item.text, body.transform);
    }
    nodes.push(textNode);
    cursor += itemHeight + betweenItemGap;
    placed++;
  }

  return {
    nodes,
    overflow: placed === input.items.length ? { kind: "fit" } : { kind: "fit" },
  };
};

// ---------------------------------------------------------------------------
// Marker rendering
// ---------------------------------------------------------------------------

function markerWidth(marker: ResolvedMarker, bodySize: number): number {
  switch (marker) {
    case "none": return 0;
    case "autoNum": return 0;
    case "enDash": return bodySize * 0.9;
    case "chevron": return bodySize * 0.8;
    case "square":
    case "filledDot":
    case "openDot":
    default: return bodySize * 0.7;
  }
}

function tokenBulletConfig(
  bullet: ResolvedTokens["ornament"]["bullet"],
  marker: ResolvedMarker,
  startAt: number,
): BulletConfig | undefined {
  if (marker !== "autoNum") return undefined;
  return {
    type: "autoNum",
    scheme: bullet.scheme ?? "arabicPeriod",
    startAt,
  };
}

function resolveMarkerColor(
  role: ResolvedTokens["ornament"]["bullet"]["color"],
  tokens: ResolvedTokens,
): string {
  switch (role) {
    case "foreground": return tokens.palette.foreground;
    case "muted": return tokens.palette.muted;
    case "faint": return tokens.palette.faint;
    case "accent": return tokens.palette.accent;
  }
}

interface MarkerPlacement {
  left: number;
  top: number;
  size: number;
  lineHeight: number;
  color: string;
  sizeRatio: number;
}

function makeMarker(style: ResolvedMarker, p: MarkerPlacement): PrimitiveNode {
  const markerSize = p.size * p.sizeRatio;
  // Center the marker vertically on the first text line's cap height.
  const centerY = p.top + p.lineHeight * 0.55;

  switch (style) {
    case "filledDot": {
      const d = markerSize * 0.5;
      const node: ViewNode = {
        kind: "view",
        shape: "ellipse",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        fill: p.color,
      };
      return node;
    }
    case "openDot": {
      const d = markerSize * 0.6;
      const node: ViewNode = {
        kind: "view",
        shape: "ellipse",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        border: { width: 1, color: p.color, style: "solid" },
      };
      return node;
    }
    case "square": {
      const d = markerSize * 0.45;
      const node: ViewNode = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        fill: p.color,
      };
      return node;
    }
    case "enDash": {
      // Thin horizontal rule at cap height.
      const w = markerSize * 0.8;
      const h = Math.max(1, p.size * 0.08);
      const node: ViewNode = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY - h / 2, width: w, height: h },
        fill: p.color,
      };
      return node;
    }
    case "chevron": {
      // Render as a ›-glyph in body type so fonts handle it.
      const h = p.lineHeight;
      const node: TextNode = {
        kind: "text",
        rect: { left: p.left, top: p.top, width: markerSize, height: h },
        content: "›",
        style: {
          family: "Helvetica Neue",
          weight: 600,
          size: p.size,
          letterSpacing: 0,
          color: p.color,
          align: "left",
          verticalAlign: "top",
        },
        autoFit: false,
      };
      return node;
    }
    default: {
      // Unreachable; return a zero-size decorative node.
      const node: ViewNode = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY, width: 0, height: 0 },
      };
      return node;
    }
  }
}
