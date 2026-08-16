/**
 * numberedChip — small filled square (or circle) holding an index number.
 * Used on Bain p14 / p19 as a step counter or "1/2/3" sequence marker.
 *
 * Tokens consumed:
 *   - palette.foreground (default fill)
 *   - palette.accentInverse (text color)
 *   - type.caption (text role)
 */

import type { Primitive } from "./primitive.js";
import type { PrimitiveNode, Rect, TextNode, ViewNode } from "../layout/index.js";

export interface NumberedChipInput {
  index: number;
  /** Chip shape. Default "rect". */
  shape?: "rect" | "ellipse" | "roundRect";
  /** Fill color role. Default "foreground". */
  fill?: "foreground" | "muted" | "accent";
  /** Optional prefix/suffix around the number ("Step 1", "1." etc.). */
  prefix?: string;
  suffix?: string;
  /** Fixed chip size in px. Anchors inside the supplied region. */
  size?: number;
  /** Fixed chip width/height in px when non-square chips are needed. */
  width?: number;
  height?: number;
  /** Where a fixed-size chip sits within the supplied region. Default top-left. */
  anchor?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "center";
}

function resolveChipRect(input: NumberedChipInput, region: Rect): Rect {
  const width = input.width ?? input.size ?? region.width;
  const height = input.height ?? input.size ?? region.height;
  const anchor = input.anchor ?? "topLeft";
  const left = anchor === "topRight" || anchor === "bottomRight"
    ? region.left + region.width - width
    : anchor === "center"
      ? region.left + (region.width - width) / 2
      : region.left;
  const top = anchor === "bottomLeft" || anchor === "bottomRight"
    ? region.top + region.height - height
    : anchor === "center"
      ? region.top + (region.height - height) / 2
      : region.top;
  return { left, top, width, height };
}

export const numberedChip: Primitive<NumberedChipInput> = (input, tokens, region) => {
  const shape = input.shape ?? "rect";
  const fillRole = input.fill ?? "foreground";
  const fill =
    fillRole === "muted"
      ? tokens.palette.muted
      : fillRole === "accent"
        ? tokens.palette.accent
        : tokens.palette.foreground;
  const caption = tokens.type.caption;

  const text = `${input.prefix ?? ""}${input.index}${input.suffix ?? ""}`;
  const rect = resolveChipRect(input, region);

  const chip: ViewNode = {
    kind: "view",
    shape,
    rect,
    fill,
    decorative: false,
  };
  const label: TextNode = {
    kind: "text",
    rect,
    content: text,
    style: {
      family: caption.family,
      weight: 700,
      size: caption.size,
      lineHeight: caption.lineHeight,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle",
    },
    zIndex: 1,
    autoFit: false,
  };

  return {
    nodes: [chip, label],
    overflow: { kind: "fit" },
  };
};
