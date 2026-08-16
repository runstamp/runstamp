/**
 * Public color parser. Accepts the relaxed forms an LLM or hand-authored JSON
 * is likely to emit (hex strings, `rgb(...)` strings, named colors, RGB or
 * CMYK objects with mixed 0–1 vs 0–255 components) and returns the canonical
 * `PdfColor` shape with all components in the strict 0..1 PDF range.
 *
 * Addresses `docs/0428-claude-test-based-directive2.md` §"@runstamp/pdf"
 * items (1) and (2): hex must be accepted at the API boundary, and a single
 * helper must produce the canonical shape used everywhere downstream.
 */

import type { PdfColor } from "./phase4-types.js";

export type PdfColorInput =
  | string
  | { space: "rgb"; r: number; g: number; b: number }
  | { space: "cmyk"; c: number; m: number; y: number; k: number }
  | { r: number; g: number; b: number }
  | { c: number; m: number; y: number; k: number };

export class PdfColorParseError extends Error {
  readonly input: unknown;
  readonly path: string | undefined;

  constructor(message: string, input: unknown, path?: string) {
    super(path ? `${path}: ${message}` : message);
    this.name = "PdfColorParseError";
    this.input = input;
    this.path = path;
  }
}

const NAMED_COLORS: Record<string, PdfColor> = {
  black: { space: "rgb", r: 0, g: 0, b: 0 },
  white: { space: "rgb", r: 1, g: 1, b: 1 },
  red: { space: "rgb", r: 1, g: 0, b: 0 },
  green: { space: "rgb", r: 0, g: 0.5, b: 0 },
  blue: { space: "rgb", r: 0, g: 0, b: 1 },
  gray: { space: "rgb", r: 0.5, g: 0.5, b: 0.5 },
  grey: { space: "rgb", r: 0.5, g: 0.5, b: 0.5 },
  transparent: { space: "rgb", r: 1, g: 1, b: 1 },
};

function normalizeRgbComponent(value: number, label: string, path: string | undefined, input: unknown): number {
  if (!Number.isFinite(value)) {
    throw new PdfColorParseError(`${label} must be a finite number; received ${value}`, input, path);
  }
  if (value < 0 || value > 1) {
    throw new PdfColorParseError(
      `${label} must use normalized 0..1 PDF color components; received ${value}`,
      input,
      path,
    );
  }
  return value;
}

function normalizeCmykComponent(value: number, label: string, path: string | undefined, input: unknown): number {
  if (!Number.isFinite(value)) {
    throw new PdfColorParseError(`${label} must be a finite number; received ${value}`, input, path);
  }
  if (value < 0 || value > 1) {
    throw new PdfColorParseError(
      `${label} must use normalized 0..1 PDF color components; received ${value}`,
      input,
      path,
    );
  }
  return value;
}

function parseHex(input: string, path: string | undefined): PdfColor {
  const raw = input.startsWith("#") ? input.slice(1) : input;
  let r: number;
  let g: number;
  let b: number;
  if (raw.length === 3) {
    r = Number.parseInt(raw[0]! + raw[0]!, 16);
    g = Number.parseInt(raw[1]! + raw[1]!, 16);
    b = Number.parseInt(raw[2]! + raw[2]!, 16);
  } else if (raw.length === 6) {
    r = Number.parseInt(raw.slice(0, 2), 16);
    g = Number.parseInt(raw.slice(2, 4), 16);
    b = Number.parseInt(raw.slice(4, 6), 16);
  } else {
    throw new PdfColorParseError(`hex color must be #RGB or #RRGGBB; received "${input}"`, input, path);
  }
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    throw new PdfColorParseError(`hex color "${input}" contains non-hex characters`, input, path);
  }
  return { space: "rgb", r: r / 255, g: g / 255, b: b / 255 };
}

function parseRgbFunction(input: string, path: string | undefined): PdfColor {
  const match = input.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    throw new PdfColorParseError(`could not parse rgb()/rgba() color: "${input}"`, input, path);
  }
  const parts = match[1]!.split(",").map((part) => part.trim());
  if (parts.length < 3) {
    throw new PdfColorParseError(`rgb() requires 3 components; received "${input}"`, input, path);
  }
  const components = parts.slice(0, 3).map((part) => Number.parseFloat(part));
  if (components.some((value) => !Number.isFinite(value))) {
    throw new PdfColorParseError(`rgb() components must be numeric; received "${input}"`, input, path);
  }
  // CSS rgb()/rgba() components are 0..255 by convention; normalize to 0..1
  // before handing to the strict component validator.
  const [r, g, b] = components.map((value) => value / 255) as [number, number, number];
  return {
    space: "rgb",
    r: normalizeRgbComponent(r, "rgb.r", path, input),
    g: normalizeRgbComponent(g, "rgb.g", path, input),
    b: normalizeRgbComponent(b, "rgb.b", path, input),
  };
}

function parseString(input: string, path: string | undefined): PdfColor {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new PdfColorParseError("color string is empty", input, path);
  }
  if (trimmed.startsWith("#") || /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return parseHex(trimmed, path);
  }
  if (/^rgba?\(/i.test(trimmed)) {
    return parseRgbFunction(trimmed, path);
  }
  const named = NAMED_COLORS[trimmed.toLowerCase()];
  if (named) {
    return named;
  }
  throw new PdfColorParseError(
    `unknown color string "${input}"; expected hex (#RGB / #RRGGBB), rgb(...), or a named color`,
    input,
    path,
  );
}

/**
 * Parse a relaxed color input into the canonical `PdfColor` shape.
 *
 * Accepted inputs:
 *   - Hex strings: "#RGB", "#RRGGBB", "RGB", "RRGGBB"
 *   - rgb()/rgba() strings: "rgb(229, 231, 235)" / "rgba(0, 0, 0, 0.5)" (alpha is ignored)
 *   - Named colors: black, white, red, green, blue, gray
 *   - RGB object: { r, g, b } or { space: "rgb", r, g, b } (components in 0..1)
 *   - CMYK object: { c, m, y, k } or { space: "cmyk", c, m, y, k } (components in 0..1)
 *
 * @throws PdfColorParseError with a path-prefixed message
 */
export function parseColor(input: PdfColorInput, path?: string): PdfColor {
  if (typeof input === "string") {
    return parseString(input, path);
  }
  if (input === null || typeof input !== "object") {
    throw new PdfColorParseError(`expected color string or object; received ${typeof input}`, input, path);
  }

  const candidate = input as Record<string, unknown>;
  const space = typeof candidate.space === "string" ? candidate.space : undefined;

  const hasCmykKeys =
    typeof candidate.c === "number" &&
    typeof candidate.m === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.k === "number";

  const hasRgbKeys =
    typeof candidate.r === "number" &&
    typeof candidate.g === "number" &&
    typeof candidate.b === "number";

  if (space === "cmyk" || (!space && hasCmykKeys && !hasRgbKeys)) {
    if (!hasCmykKeys) {
      throw new PdfColorParseError(`cmyk color requires c, m, y, k`, input, path);
    }
    return {
      space: "cmyk",
      c: normalizeCmykComponent(candidate.c as number, "cmyk.c", path, input),
      m: normalizeCmykComponent(candidate.m as number, "cmyk.m", path, input),
      y: normalizeCmykComponent(candidate.y as number, "cmyk.y", path, input),
      k: normalizeCmykComponent(candidate.k as number, "cmyk.k", path, input),
    };
  }

  if (space === "rgb" || (!space && hasRgbKeys)) {
    if (!hasRgbKeys) {
      throw new PdfColorParseError(`rgb color requires r, g, b`, input, path);
    }
    return {
      space: "rgb",
      r: normalizeRgbComponent(candidate.r as number, "rgb.r", path, input),
      g: normalizeRgbComponent(candidate.g as number, "rgb.g", path, input),
      b: normalizeRgbComponent(candidate.b as number, "rgb.b", path, input),
    };
  }

  throw new PdfColorParseError(
    `color object missing recognizable shape; expected { space: "rgb"|"cmyk", ... } or { r, g, b } or { c, m, y, k }`,
    input,
    path,
  );
}

export function tryParseColor(input: unknown, path?: string): PdfColor | undefined {
  try {
    return parseColor(input as PdfColorInput, path);
  } catch {
    return undefined;
  }
}
