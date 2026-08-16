import type { SpreadsheetFillStyle } from "../types/spreadsheet-ast.js";
import { serializeColorAttributes } from "./color.js";

export interface FillDef extends SpreadsheetFillStyle {
  type: "solid" | "pattern";
}

export const NONE_FILL: FillDef = { type: "pattern", patternType: "none" };
export const GRAY125_FILL: FillDef = { type: "pattern", patternType: "gray125" };

export function serializeFill(fill: FillDef): string {
  if (fill.patternType === "none" || fill.patternType === "gray125") {
    return `<fill><patternFill patternType="${fill.patternType}"/></fill>`;
  }

  const patternType = fill.patternType ?? (fill.type === "pattern" ? "darkGray" : "solid");
  const parts: string[] = [`<fill><patternFill patternType="${patternType}">`];
  if (fill.fgColor) {
    parts.push(`<fgColor ${serializeColorAttributes(fill.fgColor)}/>`);
  }
  if (fill.type !== "solid" && fill.bgColor) {
    parts.push(`<bgColor ${serializeColorAttributes(fill.bgColor)}/>`);
  }
  parts.push("</patternFill></fill>");
  return parts.join("");
}

export function serializeDxfFill(fill: FillDef | undefined): string {
  if (!fill?.fgColor && !fill?.bgColor) {
    return "";
  }

  const color = fill.bgColor ?? fill.fgColor;
  if (!color) {
    return "";
  }

  return `<fill><patternFill><bgColor ${serializeColorAttributes(color)}/></patternFill></fill>`;
}
