/**
 * groupBorder — dashed-rect outline that wraps a region group, with
 * optional bottom-right label. Used on Bain p6 to call out
 * "Traditional retail area" sections of a matrix.
 *
 * Tokens consumed:
 *   - palette.muted (default border color)
 *   - type.caption (label text role)
 */

import type { Primitive } from "./primitive.js";
import type { PrimitiveNode, TextNode, ViewNode } from "../layout/index.js";

export interface GroupBorderInput {
  /** Optional label rendered at the bottom-right corner. */
  label?: string;
  /** Border color role. */
  color?: "foreground" | "muted" | "faint" | "accent";
  /** Border width in px. */
  width?: number;
  /** Border style. */
  style?: "solid" | "dashed" | "dotted";
}

export const groupBorder: Primitive<GroupBorderInput> = (input, tokens, region) => {
  const colorRole = input.color ?? "muted";
  const color =
    colorRole === "foreground"
      ? tokens.palette.foreground
      : colorRole === "faint"
        ? tokens.palette.faint
        : colorRole === "accent"
          ? tokens.palette.accent
          : tokens.palette.muted;

  const nodes: PrimitiveNode[] = [];
  // groupBorder is an intentional overlay — it wraps content blocks by
  // design (e.g. Bain p6's "Traditional retail area" outline that boxes
  // the first two matrix columns). It must skip the absolute-layout
  // collision check, so flag decorative=true. The border still renders;
  // only the safety pass treats it as a non-content node.
  const border: ViewNode = {
    kind: "view",
    shape: "rect",
    rect: { ...region },
    border: {
      width: input.width ?? 1,
      color,
      style: input.style ?? "dashed",
    },
    decorative: true,
  };
  nodes.push(border);

  if (input.label) {
    const caption = tokens.type.caption;
    const labelW = Math.min(140, region.width * 0.4);
    const labelH = caption.size * 1.6;
    const label: TextNode = {
      kind: "text",
      rect: {
        left: region.left + region.width - labelW - 4,
        top: region.top + region.height - labelH - 2,
        width: labelW,
        height: labelH,
      },
      content: input.label,
      style: {
        family: caption.family,
        weight: caption.weight,
        size: caption.size,
        lineHeight: caption.lineHeight,
        color,
        align: "right",
        verticalAlign: "middle",
      },
      zIndex: 1,
      autoFit: false,
    };
    nodes.push(label);
  }

  return { nodes, overflow: { kind: "fit" } };
};
