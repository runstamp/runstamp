/**
 * sourceLine — tiny footnote/source/note strip at the bottom of a slide.
 *
 * Every real consulting slide carries a one-line "Source: …" or
 * "Note: …" underneath the content. Without it the bottom third of a
 * matrix or chart slide reads empty. Caller allocates a thin bottom
 * strip of the content region and hands it here.
 *
 * Visual:
 *    Source: Statistics Korea; Euromonitor; Bain analysis
 *    Note:   Excel's solver used to fit; constraints added for saturation.
 *
 * Tokens consumed:
 *   - type.caption (body style — italic when kind !== "plain")
 *   - palette.muted (default), palette.faint (when kind === "note")
 *
 * Content adaptation: compresses in discrete steps to MIN_COMPRESSION;
 * beyond that, reports `clipped`. Never paginates — a source is a
 * terminal annotation.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, TextNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import {
  applyTypeTransform,
  estimateLineHeight,
  estimateTextWidth,
} from "../util/estimateText.js";

export interface SourceLineInput {
  /** Content text (without prefix). */
  content: string;
  /** "source" → italic, prefixed "Source:"; "note" → italic, prefixed
   *  "Note:"; "plain" → no prefix, no italic. Default "source". */
  kind?: "source" | "note" | "plain";
  /** Override alignment. Default "left". */
  align?: "left" | "right";
}

const MIN_COMPRESSION = 0.75;
const COMPRESSION_STEP = 0.05;

export const sourceLine: Primitive<SourceLineInput> = (input, tokens, region) => {
  const kind = input.kind ?? "source";
  const prefix = kind === "source" ? "Source: " : kind === "note" ? "Note: " : "";
  const full = prefix + input.content;
  const caption = tokens.type.caption;
  const color = kind === "note" ? tokens.palette.faint : tokens.palette.muted;
  const italic = kind !== "plain";

  let scale = 1.0;
  let sizePt = caption.size * scale;
  let width = estimateTextWidth({
    content: full,
    family: caption.family,
    sizePt,
    letterSpacing: caption.letterSpacing * scale,
  }, tokens);
  while (width > region.width && scale > MIN_COMPRESSION - 1e-9) {
    scale = Number((scale - COMPRESSION_STEP).toFixed(2));
    sizePt = caption.size * scale;
    width = estimateTextWidth({
      content: full,
      family: caption.family,
      sizePt,
      letterSpacing: caption.letterSpacing * scale,
    }, tokens);
  }

  const lineHeightPx = estimateLineHeight(
    sizePt,
    caption.lineHeight !== undefined ? caption.lineHeight * scale : undefined,
    tokens,
    caption.family,
  );

  const node: TextNode = {
    kind: "text",
    rect: {
      left: region.left,
      top: region.top,
      width: region.width,
      height: Math.min(lineHeightPx, region.height),
    },
    content: applyTypeTransform(full, caption.transform),
    style: {
      family: caption.family,
      weight: caption.weight,
      size: sizePt,
      lineHeight: caption.lineHeight !== undefined ? caption.lineHeight * scale : undefined,
      letterSpacing: caption.letterSpacing * scale,
      italic,
      color,
      align: input.align ?? "left",
      verticalAlign: "top",
    },
    autoFit: false,
  };

  const nodes: PrimitiveNode[] = [node];
  const clipped = width > region.width;
  const overflow: PrimitiveResult["overflow"] = clipped
    ? {
        kind: "clipped",
        droppedCount: 0,
        reason: `sourceLine exceeds width even at ${MIN_COMPRESSION}× compression`,
      }
    : scale < 1.0
      ? { kind: "compressed", scale }
      : { kind: "fit" };

  return { nodes, overflow };
};
