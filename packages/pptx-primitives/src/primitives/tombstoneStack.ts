/**
 * tombstoneStack — grid of thin-bordered tiles, each carrying a brand /
 * case name + short description.
 *
 * Consulting and editorial decks both use this pattern:
 *   - Bain: "past client engagements" rail across the bottom of a slide,
 *     each tile with company name bolded and one-line description.
 *   - LG: logo tombstones for design partners, each tile with a small
 *     monochrome thumbnail above the partner name.
 *
 * Visual structure (3-column × 2-row example):
 *
 *   ┌────────┐  ┌────────┐  ┌────────┐
 *   │ [logo] │  │ [logo] │  │ [logo] │
 *   │ Name   │  │ Name   │  │ Name   │
 *   │ body…  │  │ body…  │  │ body…  │
 *   └────────┘  └────────┘  └────────┘
 *   ┌────────┐  ┌────────┐  ┌────────┐
 *   │ ...    │  │ ...    │  │ ...    │
 *   └────────┘  └────────┘  └────────┘
 *
 * Tokens consumed:
 *   - palette.foreground (title), palette.muted (body), palette.rule (border)
 *   - type.caption (title role), type.body (body role)
 *   - spacing.sm (tile padding), spacing.xs (gap between rows)
 *
 * Content adaptation:
 *   - Tiles wrap to row grid based on `columns`.
 *   - When rows don't fit vertically, paginates with
 *     `remaining.startTileIndex`.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, Rect, TextNode, ViewNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import {
  applyTypeTransform,
  estimateLineCount,
  estimateLineHeight,
} from "../util/estimateText.js";

export interface TombstoneStackInput {
  tiles: Array<{
    /** Optional logo / thumbnail image URL (data: or https:). */
    logo?: string;
    /** Bolded tile title (e.g., brand name). */
    title: string;
    /** Optional body copy beneath the title. Wraps. */
    body?: string;
    /** Optional accent: highlights the tile with a left-edge accent bar. */
    accent?: boolean;
  }>;
  /** Column count. Default 4. */
  columns?: number;
  /** Row gap in px. Default spacing.sm. */
  rowGap?: number;
  /** Column gap in px. Default spacing.sm. */
  columnGap?: number;
  /** Logo block height in px. Default 36. Set 0 to disable logo row. */
  logoHeight?: number;
  /** Pagination resume. */
  resume?: { startTileIndex: number };
  /** Compact mode: tighter internal padding, smaller tiles. Recommended
   *  for dense case-list rails (8+ tiles). Default false (roomier
   *  spacing that reads more editorial). */
  compact?: boolean;
}

export const tombstoneStack: Primitive<TombstoneStackInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];
  if (input.tiles.length === 0) return { nodes, overflow: { kind: "fit" } };

  const cols = Math.max(1, input.columns ?? 4);
  const rowGap = input.rowGap ?? tokens.spacing.sm;
  const colGap = input.columnGap ?? tokens.spacing.sm;
  const logoHeight = input.logoHeight ?? 36;
  const TILE_PAD = input.compact ? 6 : 8;
  const tileWidth = (region.width - colGap * (cols - 1)) / cols;

  // Refuse to lay out when each tile's inner content area would be
  // negative — emitting nodes with negative dimensions is a contract
  // violation downstream renderers cannot handle cleanly.
  if (tileWidth - TILE_PAD * 2 <= 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: input.tiles.length,
        reason: `region too narrow for ${cols}-column tombstoneStack`,
      },
    };
  }

  // Uniform tile height — tallest tile among all drives row height so the
  // grid reads rectangular. (Mismatched heights look sloppy for tombstones.)
  const bodyRole = tokens.type.body;
  const captionRole = tokens.type.caption;
  const titleLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  const bodyLineHeight = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);

  const tileBodyWidth = tileWidth - TILE_PAD * 2;
  let maxTileContentHeight = 0;
  for (const tile of input.tiles) {
    const titleLines = estimateLineCount({
      content: tile.title,
      family: captionRole.family,
      sizePt: Math.max(captionRole.size, 11),
      letterSpacing: captionRole.letterSpacing,
      width: tileBodyWidth,
    }, tokens);
    const bodyLines = tile.body
      ? estimateLineCount({
          content: tile.body,
          family: bodyRole.family,
          sizePt: bodyRole.size,
          letterSpacing: bodyRole.letterSpacing,
          width: tileBodyWidth,
        }, tokens)
      : 0;
    const content =
      (logoHeight > 0 ? logoHeight + tokens.spacing.xs : 0) +
      titleLineHeight * titleLines +
      (bodyLines > 0 ? tokens.spacing.xs + bodyLineHeight * bodyLines : 0);
    if (content > maxTileContentHeight) maxTileContentHeight = content;
  }
  const tileHeight = maxTileContentHeight + TILE_PAD * 2;

  const startIndex = input.resume?.startTileIndex ?? 0;
  const rowsPerPage = Math.max(1, Math.floor((region.height + rowGap) / (tileHeight + rowGap)));
  const tilesPerPage = rowsPerPage * cols;

  for (let i = 0; i < tilesPerPage; i++) {
    const tileIndex = startIndex + i;
    if (tileIndex >= input.tiles.length) break;
    const tile = input.tiles[tileIndex];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const tileRect: Rect = {
      left: region.left + col * (tileWidth + colGap),
      top: region.top + row * (tileHeight + rowGap),
      width: tileWidth,
      height: tileHeight,
    };

    // Border (no fill — Bain tombstones are outline-only).
    const border: ViewNode = {
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: tileRect,
      border: { width: 1, color: tokens.palette.rule, style: "solid" },
    };
    nodes.push(border);

    // Accent left-edge bar.
    if (tile.accent) {
      const tick: ViewNode = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 1,
        rect: { left: tileRect.left, top: tileRect.top, width: 2, height: tileRect.height },
        fill: tokens.palette.accent,
      };
      nodes.push(tick);
    }

    let cursor = tileRect.top + TILE_PAD;

    // Optional logo.
    if (logoHeight > 0 && tile.logo) {
      nodes.push({
        kind: "image",
        zIndex: 1,
        rect: {
          left: tileRect.left + TILE_PAD,
          top: cursor,
          width: tileBodyWidth,
          height: logoHeight,
        },
        src: tile.logo,
        alt: tile.title,
        decorative: false,
      });
      cursor += logoHeight + tokens.spacing.xs;
    } else if (logoHeight > 0) {
      // Reserve the logo slot even when no logo, so titles across the row align.
      cursor += logoHeight + tokens.spacing.xs;
    }

    // Title.
    const titleLines = estimateLineCount({
      content: tile.title,
      family: captionRole.family,
      sizePt: Math.max(captionRole.size, 11),
      letterSpacing: captionRole.letterSpacing,
      width: tileBodyWidth,
    }, tokens);
    const titleNode: TextNode = {
      kind: "text",
      zIndex: 1,
      rect: {
        left: tileRect.left + TILE_PAD,
        top: cursor,
        width: tileBodyWidth,
        height: titleLineHeight * titleLines,
      },
      content: applyTypeTransform(tile.title, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: 700,
        size: Math.max(captionRole.size, 11),
        lineHeight: captionRole.lineHeight,
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: tokens.palette.foreground,
        align: "left",
        verticalAlign: "top",
      },
      autoFit: false,
    };
    nodes.push(titleNode);
    cursor += titleLineHeight * titleLines;

    // Body.
    if (tile.body) {
      cursor += tokens.spacing.xs;
      const bodyLines = estimateLineCount({
        content: tile.body,
        family: bodyRole.family,
        sizePt: bodyRole.size,
        letterSpacing: bodyRole.letterSpacing,
        width: tileBodyWidth,
      }, tokens);
      const bodyNode: TextNode = {
        kind: "text",
        zIndex: 1,
        rect: {
          left: tileRect.left + TILE_PAD,
          top: cursor,
          width: tileBodyWidth,
          height: bodyLineHeight * bodyLines,
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
          align: "left",
          verticalAlign: "top",
        },
        autoFit: false,
      };
      nodes.push(bodyNode);
    }
  }

  const placedCount = Math.min(tilesPerPage, input.tiles.length - startIndex);
  const remaining = input.tiles.length - (startIndex + placedCount);

  const overflow: PrimitiveResult["overflow"] = remaining > 0
    ? {
        kind: "paginated",
        remaining: { startTileIndex: startIndex + placedCount },
        continuationLabel: `${remaining} tiles remaining`,
      }
    : { kind: "fit" };

  return { nodes, overflow };
};
