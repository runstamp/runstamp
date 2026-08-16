/**
 * chevronArrow — standalone preset-geometry chevron pointing left or
 * right. Used as a between-section pointer on Bain p13.
 *
 * Tokens consumed:
 *   - palette.accent (default fill)
 *   - palette.accentInverse (default text color)
 *   - type.eyebrow (text role)
 */

import type { Primitive } from "./primitive.js";
import type { PrimitiveNode, TextNode, ViewNode } from "../layout/index.js";

export interface ChevronArrowInput {
  /** Direction the chevron points. Default "right". */
  direction?: "left" | "right";
  /** Optional label inside the chevron. */
  label?: string;
  /** Fill color role. Default "accent". */
  fill?: "accent" | "foreground" | "muted";
}

export const chevronArrow: Primitive<ChevronArrowInput> = (input, tokens, region) => {
  const direction = input.direction ?? "right";
  const fillRole = input.fill ?? "accent";
  const fill =
    fillRole === "foreground"
      ? tokens.palette.foreground
      : fillRole === "muted"
        ? tokens.palette.muted
        : tokens.palette.accent;

  const nodes: PrimitiveNode[] = [];

  const shape: ViewNode = {
    kind: "view",
    // DrawingML preset names. "chevron" points right; "leftArrow" points
    // left. We use rightArrow / leftArrow for clearer semantics —
    // chevron's adjustment defaults vary across renderers.
    shape: direction === "right" ? "rightArrow" : "leftArrow",
    rect: { ...region },
    fill,
    decorative: false,
  };
  nodes.push(shape);

  if (input.label) {
    const eyebrow = tokens.type.eyebrow;
    const label: TextNode = {
      kind: "text",
      rect: { ...region },
      content: eyebrow.transform === "upper" ? input.label.toUpperCase() : input.label,
      style: {
        family: eyebrow.family,
        weight: eyebrow.weight,
        size: eyebrow.size,
        lineHeight: eyebrow.lineHeight,
        letterSpacing: eyebrow.letterSpacing,
        italic: eyebrow.italic,
        color: tokens.palette.accentInverse,
        align: "center",
        verticalAlign: "middle",
      },
      zIndex: 1,
      autoFit: false,
    };
    nodes.push(label);
  }

  return { nodes, overflow: { kind: "fit" } };
};
