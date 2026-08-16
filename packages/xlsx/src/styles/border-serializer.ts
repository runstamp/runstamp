import type { SpreadsheetBorderEdge, SpreadsheetBorderStyle } from "../types/spreadsheet-ast.js";
import { serializeColorAttributes } from "./color.js";

export type BorderDef = SpreadsheetBorderStyle;

export const EMPTY_BORDER: BorderDef = {};

function serializeEdge(name: "left" | "right" | "top" | "bottom" | "diagonal", edge: SpreadsheetBorderEdge | undefined): string {
  if (!edge) {
    return "";
  }
  const parts = [`<${name} style="${edge.style}">`];
  if (edge.color) {
    parts.push(`<color ${serializeColorAttributes(edge.color)}/>`);
  }
  parts.push(`</${name}>`);
  return parts.join("");
}

export function serializeBorder(border: BorderDef): string {
  const diagonalUp = border.diagonal?.direction === "up" || border.diagonal?.direction === "both" ? ` diagonalUp="1"` : "";
  const diagonalDown = border.diagonal?.direction === "down" || border.diagonal?.direction === "both" ? ` diagonalDown="1"` : "";
  const left = serializeEdge("left", border.left);
  const right = serializeEdge("right", border.right);
  const top = serializeEdge("top", border.top);
  const bottom = serializeEdge("bottom", border.bottom);
  const diagonal = serializeEdge("diagonal", border.diagonal);
  if (!diagonalUp && !diagonalDown && !left && !right && !top && !bottom && !diagonal) {
    return "<border/>";
  }
  return [
    `<border${diagonalUp}${diagonalDown}>`,
    left,
    right,
    top,
    bottom,
    diagonal,
    `</border>`,
  ].join("");
}

export function serializeDxfBorder(border: BorderDef | undefined): string {
  if (!border) {
    return "";
  }
  return serializeBorder(border);
}
