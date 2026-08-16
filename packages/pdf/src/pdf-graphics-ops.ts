/**
 * Low-level PDF graphics operator helpers shared between the main
 * renderer and the widget appearance builders.
 *
 * Extracted from `pdf-renderer.ts` during M4 so that
 * `src/phases/phase6-widgets.ts` can build form-widget appearance
 * streams without importing values from `pdf-renderer.ts` (which would
 * create a load-time cycle now that pdf-renderer imports widget
 * builders from phase6-widgets).
 */

import type { PdfColor } from "./phase4-types.js";
import { PDFArray } from "./pdf-objects.js";
import { formatPdfNumber } from "./font-embedding.js";

/**
 * State threaded through the renderer when emitting PDF/A output.
 *
 * `colorSpaceArray` is the `/CS0` indirect ICC-based color space the
 * renderer uses to satisfy PDF/A's "all colors must reference an ICC
 * profile" rule. The other fields are present so individual draw
 * operators can decide whether to emit color in normalized RGB
 * (PDF/A) or pass through the document-supplied color space.
 */
export interface PreparedPdfaState {
  colorSpaceArray: PDFArray;
  iccProfileBuffer: Buffer;
  outputConditionIdentifier: string;
}

export function validateColorComponent(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${label} must use normalized 0..1 PDF color components; received ${value}`);
  }
  return value;
}

export function colorComponents(color: PdfColor): number[] {
  if (color.space === "rgb") {
    return [
      validateColorComponent(color.r, "rgb.r"),
      validateColorComponent(color.g, "rgb.g"),
      validateColorComponent(color.b, "rgb.b"),
    ];
  }

  return [
    validateColorComponent(color.c, "cmyk.c"),
    validateColorComponent(color.m, "cmyk.m"),
    validateColorComponent(color.y, "cmyk.y"),
    validateColorComponent(color.k, "cmyk.k"),
  ];
}

export function colorToRgb(color: PdfColor): { b: number; g: number; r: number; space: "rgb" } {
  if (color.space === "rgb") {
    return {
      b: validateColorComponent(color.b, "rgb.b"),
      g: validateColorComponent(color.g, "rgb.g"),
      r: validateColorComponent(color.r, "rgb.r"),
      space: "rgb",
    };
  }

  const c = validateColorComponent(color.c, "cmyk.c");
  const m = validateColorComponent(color.m, "cmyk.m");
  const y = validateColorComponent(color.y, "cmyk.y");
  const k = validateColorComponent(color.k, "cmyk.k");

  return {
    b: (1 - y) * (1 - k),
    g: (1 - m) * (1 - k),
    r: (1 - c) * (1 - k),
    space: "rgb",
  };
}

export function buildColorOperators(color: PdfColor, mode: "fill" | "stroke", pdfa?: PreparedPdfaState): string[] {
  if (pdfa) {
    const rgb = colorToRgb(color);
    const values = [rgb.r, rgb.g, rgb.b].map(formatPdfNumber);
    return [
      `/CS0 ${mode === "fill" ? "cs" : "CS"}`,
      `${values.join(" ")} ${mode === "fill" ? "scn" : "SCN"}`,
    ];
  }
  const values = colorComponents(color).map(formatPdfNumber);
  if (color.space === "rgb") {
    return [`${values.join(" ")} ${mode === "fill" ? "rg" : "RG"}`];
  }
  return [`${values.join(" ")} ${mode === "fill" ? "k" : "K"}`];
}

export function buildRectPath(x: number, y: number, width: number, height: number): string {
  return `${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`;
}

export function buildRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const clamped = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (clamped === 0) {
    return buildRectPath(x, y, width, height);
  }

  const right = x + width;
  const top = y + height;
  const kappa = 0.5522847498307936;
  const control = clamped * kappa;

  return [
    `${formatPdfNumber(x + clamped)} ${formatPdfNumber(y)} m`,
    `${formatPdfNumber(right - clamped)} ${formatPdfNumber(y)} l`,
    `${formatPdfNumber(right - clamped + control)} ${formatPdfNumber(y)} ${formatPdfNumber(right)} ${formatPdfNumber(y + clamped - control)} ${formatPdfNumber(right)} ${formatPdfNumber(y + clamped)} c`,
    `${formatPdfNumber(right)} ${formatPdfNumber(top - clamped)} l`,
    `${formatPdfNumber(right)} ${formatPdfNumber(top - clamped + control)} ${formatPdfNumber(right - clamped + control)} ${formatPdfNumber(top)} ${formatPdfNumber(right - clamped)} ${formatPdfNumber(top)} c`,
    `${formatPdfNumber(x + clamped)} ${formatPdfNumber(top)} l`,
    `${formatPdfNumber(x + clamped - control)} ${formatPdfNumber(top)} ${formatPdfNumber(x)} ${formatPdfNumber(top - clamped + control)} ${formatPdfNumber(x)} ${formatPdfNumber(top - clamped)} c`,
    `${formatPdfNumber(x)} ${formatPdfNumber(y + clamped)} l`,
    `${formatPdfNumber(x)} ${formatPdfNumber(y + clamped - control)} ${formatPdfNumber(x + clamped - control)} ${formatPdfNumber(y)} ${formatPdfNumber(x + clamped)} ${formatPdfNumber(y)} c`,
  ].join("\n");
}
