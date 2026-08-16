/**
 * tocTiles — table-of-contents / phase-decomposition tile row.
 *
 * LG's "STEP 1 / STEP 2" table-of-contents pattern: a small number of
 * large tiles across the slide, each carrying an accent numeral (or
 * phase tag), a title, and a short description. Optionally headed by
 * a photographic band — but the photo belongs to imageBleed in a
 * separate region; this primitive renders only the tile content below
 * the image.
 *
 * Contrast with tombstoneStack:
 *   - tombstoneStack: dense grid (4+ cols, many rows), outline borders,
 *     used for logos / case lists.
 *   - tocTiles: sparse rail (typically 2–4 tiles), no borders, large
 *     accent numerals, used for agenda / phase breakdown / TOC.
 *
 * Visual (3-column):
 *
 *   ╔════════╗   ╔════════╗   ╔════════╗
 *   ║   1    ║   ║   2    ║   ║   3    ║   ← big accent numeral
 *   ║────────║   ║────────║   ║────────║   ← rules.divider hairline
 *   ║ Title  ║   ║ Title  ║   ║ Title  ║
 *   ║ body   ║   ║ body   ║   ║ body   ║
 *   ╚════════╝   ╚════════╝   ╚════════╝
 *
 * Tokens consumed:
 *   - palette.accent (numeral), palette.foreground (title), palette.muted (body)
 *   - type.display (numeral — scaled down), type.title (tile title), type.body
 *   - rules.divider (hairline between numeral and title)
 *   - spacing.sm (gaps)
 *
 * Content adaptation:
 *   - No pagination: TOC is always a single-slide pattern. If content
 *     exceeds region height, reports `clipped` with dropped count.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, Rect, TextNode } from "../layout/index.js";
import { emitHorizontalRule } from "../util/rule.js";
import {
  applyTypeTransform,
  estimateLineCount,
  estimateLineHeight,
} from "../util/estimateText.js";

export interface TocTilesInput {
  tiles: Array<{
    /** Either a number (1, 2, 3 …) or a short tag ("I", "A", "Phase 1"). */
    marker: string | number;
    /** Tile title. */
    title: string;
    /** Optional body copy. Wraps. */
    body?: string;
  }>;
  /** Column count. Defaults to tiles.length (one column per tile). */
  columns?: number;
  /** Column gap in px. Default spacing.md. */
  columnGap?: number;
  /** Numeral display size in pt. Default 56. */
  markerSizePt?: number;
}

export const tocTiles: Primitive<TocTilesInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];
  if (input.tiles.length === 0) return { nodes, overflow: { kind: "fit" } };

  const cols = Math.max(1, input.columns ?? input.tiles.length);
  const colGap = input.columnGap ?? tokens.spacing.md;
  const tileWidth = (region.width - colGap * (cols - 1)) / cols;

  const markerSize = input.markerSizePt ?? 56;
  const markerLineHeight = estimateLineHeight(markerSize, markerSize * 1.0, tokens, tokens.type.display.family);
  const titleRole = tokens.type.title;
  const titleLineHeightPx = estimateLineHeight(titleRole.size, titleRole.lineHeight, tokens, titleRole.family);
  const bodyRole = tokens.type.body;
  const bodyLineHeightPx = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);

  let droppedCount = 0;

  // Compute per-tile content heights so we can vertically center the
  // block within region. A tile's content runs from marker → rule →
  // title → (optional) body.
  const perRowHeight = region.height / Math.ceil(input.tiles.length / cols);
  const maxContentHeight = input.tiles.reduce((max, tile) => {
    const titleLines = estimateLineCount({
      content: tile.title,
      family: titleRole.family,
      sizePt: Math.min(titleRole.size, 18),
      letterSpacing: titleRole.letterSpacing,
      width: tileWidth,
    }, tokens);
    const bodyLines = tile.body
      ? estimateLineCount({
          content: tile.body,
          family: bodyRole.family,
          sizePt: bodyRole.size,
          letterSpacing: bodyRole.letterSpacing,
          width: tileWidth,
        }, tokens)
      : 0;
    const content =
      markerLineHeight +
      tokens.spacing.sm +
      1 /* rule height approx */ +
      tokens.spacing.sm +
      titleLineHeightPx * titleLines +
      (bodyLines > 0 ? tokens.spacing.xs + bodyLineHeightPx * bodyLines : 0);
    return Math.max(max, content);
  }, 0);
  const verticalOffset = Math.max(0, (perRowHeight - maxContentHeight) / 2);

  for (let i = 0; i < input.tiles.length; i++) {
    const tile = input.tiles[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const tileLeft = region.left + col * (tileWidth + colGap);
    const tileTop = region.top + row * perRowHeight + verticalOffset;

    // Marker numeral.
    const markerText = String(tile.marker);
    const markerNode: TextNode = {
      kind: "text",
      rect: {
        left: tileLeft,
        top: tileTop,
        width: tileWidth,
        height: markerLineHeight,
      },
      content: markerText,
      style: {
        family: tokens.type.display.family,
        weight: tokens.type.display.weight,
        size: markerSize,
        lineHeight: markerSize * 1.0,
        letterSpacing: 0,
        italic: false,
        color: tokens.palette.accent,
        align: "center",
        verticalAlign: "top",
      },
      autoFit: false,
    };
    nodes.push(markerNode);

    let cursor = tileTop + markerLineHeight + tokens.spacing.sm;

    // Hairline rule beneath numeral.
    const rule = emitHorizontalRule(
      tokens.rules.divider,
      tokens.palette,
      tileLeft + tileWidth * 0.15,
      cursor,
      tileWidth * 0.7,
    );
    nodes.push(...rule.nodes);
    cursor += rule.consumedHeight + tokens.spacing.sm;

    // Title.
    const titleLines = estimateLineCount({
      content: tile.title,
      family: titleRole.family,
      sizePt: Math.min(titleRole.size, 18),
      letterSpacing: titleRole.letterSpacing,
      width: tileWidth,
    }, tokens);
    const titleHeight = titleLineHeightPx * titleLines;
    const titleNode: TextNode = {
      kind: "text",
      rect: {
        left: tileLeft,
        top: cursor,
        width: tileWidth,
        height: titleHeight,
      },
      content: applyTypeTransform(tile.title, titleRole.transform),
      style: {
        family: titleRole.family,
        weight: titleRole.weight,
        size: Math.min(titleRole.size, 18),
        lineHeight: titleRole.lineHeight,
        letterSpacing: titleRole.letterSpacing,
        italic: titleRole.italic,
        color: tokens.palette.foreground,
        align: "center",
        verticalAlign: "top",
      },
      autoFit: false,
    };
    nodes.push(titleNode);
    cursor += titleHeight;

    // Body.
    if (tile.body) {
      cursor += tokens.spacing.xs;
      const bodyLines = estimateLineCount({
        content: tile.body,
        family: bodyRole.family,
        sizePt: bodyRole.size,
        letterSpacing: bodyRole.letterSpacing,
        width: tileWidth,
      }, tokens);
      const bodyHeight = bodyLineHeightPx * bodyLines;
      const bottomLimit = tileTop + perRowHeight;
      if (cursor + bodyHeight > bottomLimit + 0.5) {
        droppedCount++;
      } else {
        nodes.push({
          kind: "text",
          rect: {
            left: tileLeft,
            top: cursor,
            width: tileWidth,
            height: bodyHeight,
          },
          content: applyTypeTransform(tile.body, bodyRole.transform),
          style: {
            family: bodyRole.family,
            weight: bodyRole.weight,
            size: bodyRole.size,
            lineHeight: bodyRole.lineHeight,
            letterSpacing: bodyRole.letterSpacing,
            italic: bodyRole.italic,
            color: tokens.palette.muted,
            align: "center",
            verticalAlign: "top",
          },
          autoFit: false,
        });
      }
    }
  }

  const overflow: PrimitiveResult["overflow"] = droppedCount > 0
    ? {
        kind: "clipped",
        droppedCount,
        reason: `${droppedCount} tile bodies exceeded region.height`,
      }
    : { kind: "fit" };
  return { nodes, overflow };
};
