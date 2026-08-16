/**
 * calloutBox — rounded rect holding a text body, with optional pointer
 * to a target (pixel coords). Used on Bain p10 / p19 / p21 for analyst
 * quotes, sidebar notes, and "important" annotations.
 *
 * The box itself is a rounded rect (preset shape "roundRect"). The
 * pointer, when supplied, is rendered as a separate connector emitted
 * by the caller — calloutBox keeps its scope tight: just the box +
 * its inner text. Callers wanting the pointer pair the box with a
 * connectorLine block.
 *
 * Tokens consumed:
 *   - palette.surface (default fill), palette.faint (default border)
 *   - palette.foreground (default text color)
 *   - type.body (text role)
 *   - spacing.sm (internal padding)
 */

import type { Primitive } from "./primitive.js";
import type { PrimitiveNode, TextNode, TextRun, ViewNode } from "../layout/index.js";

export interface CalloutBoxInput {
  /** Box content. String is treated as a single paragraph; rich runs
   *  preserve in-paragraph emphasis. */
  content: string | TextRun[];
  /** Color role for the box fill. */
  fill?: "surface" | "muted" | "faint" | "accent";
  /** Color role for the border. Defaults to "foreground" 1px hairline. */
  borderColor?: "foreground" | "muted" | "faint" | "accent";
  /** Border width (px). 0 disables the border. */
  borderWidth?: number;
  /** Type role override. Defaults to "body". */
  role?: "body" | "caption" | "eyebrow";
  /** Surface shape. Default `"rect"` (sharp corners). Pass `"roundRect"`
   *  to opt into rounded corners — the prior default. */
  shape?: "rect" | "roundRect";
}

const PADDING = 12;

function resolveColor(
  role: "foreground" | "muted" | "faint" | "accent" | "surface" | undefined,
  tokens: import("../tokens/schema.js").ResolvedTokens,
): string {
  switch (role) {
    case "foreground": return tokens.palette.foreground;
    case "muted":      return tokens.palette.muted;
    case "faint":      return tokens.palette.faint;
    case "accent":     return tokens.palette.accent;
    case "surface":    return tokens.canvas.surface;
    default:           return tokens.canvas.surface;
  }
}

export const calloutBox: Primitive<CalloutBoxInput> = (input, tokens, region) => {
  const role = tokens.type[input.role ?? "body"];
  const fill = resolveColor(input.fill ?? "surface", tokens);
  const borderColor = input.borderWidth === 0
    ? undefined
    : resolveColor(input.borderColor ?? "foreground", tokens);
  const borderWidth = input.borderWidth ?? 1;

  const nodes: PrimitiveNode[] = [];

  const box: ViewNode = {
    kind: "view",
    shape: input.shape ?? "rect",
    rect: { ...region },
    fill,
    ...(borderColor && borderWidth > 0
      ? { border: { width: borderWidth, color: borderColor, style: "solid" } }
      : {}),
    decorative: false,
    zIndex: 0,
  };
  nodes.push(box);

  const textRect = {
    left: region.left + PADDING,
    top: region.top + PADDING,
    width: Math.max(0, region.width - PADDING * 2),
    height: Math.max(0, region.height - PADDING * 2),
  };

  const textNode: TextNode = {
    kind: "text",
    rect: textRect,
    style: {
      family: role.family,
      weight: role.weight,
      size: role.size,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top",
    },
    zIndex: 1,
    autoFit: false,
  };
  if (typeof input.content === "string") {
    textNode.content = input.content;
  } else {
    textNode.runs = input.content;
  }
  nodes.push(textNode);

  return { nodes, overflow: { kind: "fit" } };
};
