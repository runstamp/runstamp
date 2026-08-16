/**
 * Phase 2 (legacy flat pages) normalization.
 *
 * Converts the loose `PdfDocumentPhase2` shape — pages with `text` /
 * `texts` / `graphics` arrays and a meta block — into a strict
 * `NormalizedPdfDocument` ready for `renderPdfPages`. Performs all
 * runtime validation that the Zod schema would catch in strict mode,
 * but throws structured `PdfError("SCHEMA_REJECTED")` errors carrying
 * the failing JSON path in `details.path`.
 *
 * Extracted from `engine.ts` during M3.b. No behavior changes.
 */

import type { PdfDocumentPhase2, PdfMetaPhase1, PdfTextPhase1 } from "./engine.js";
import { PdfError } from "./errors.js";
import type { PdfEmbeddedFontInput, PdfFontInput } from "./font-embedding.js";
import type { PdfFill, PdfGraphic, PdfStrokeStyle } from "./phase4-types.js";
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_TEXT_X,
  DEFAULT_TEXT_Y,
} from "./phase-helpers.js";

export interface NormalizedPdfText {
  direction: "auto" | "ltr" | "rtl";
  font: PdfFontInput;
  fallbackFonts?: PdfEmbeddedFontInput[];
  fontSize: number;
  value: string;
  x: number;
  y: number;
}

export interface NormalizedPdfPage {
  graphics: PdfGraphic[];
  height: number;
  texts: NormalizedPdfText[];
  width: number;
}

export interface NormalizedPdfDocument {
  meta: PdfMetaPhase1;
  pages: NormalizedPdfPage[];
}

function schemaError(message: string, path: string, extra?: Record<string, unknown>): PdfError {
  return new PdfError("SCHEMA_REJECTED", message, { path, ...extra });
}

function assertFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw schemaError(`${label} must be a finite number`, label);
  }
  return value;
}

function assertPositiveFiniteNumber(value: unknown, label: string): number {
  const numeric = assertFiniteNumber(value, label);
  if (numeric <= 0) {
    throw schemaError(`${label} must be greater than zero`, label);
  }
  return numeric;
}

function assertNonNegativeFiniteNumber(value: unknown, label: string): number {
  const numeric = assertFiniteNumber(value, label);
  if (numeric < 0) {
    throw schemaError(`${label} must be greater than or equal to zero`, label);
  }
  return numeric;
}

function assertOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw schemaError(`${label} must be a string`, label);
  }
  return value;
}

function normalizeFont(font: PdfFontInput | undefined, label: string): PdfFontInput {
  const resolved = font ?? DEFAULT_FONT;
  if (typeof resolved === "string") {
    if (resolved !== DEFAULT_FONT) {
      throw schemaError(`${label} must be "${DEFAULT_FONT}" or an embedded font descriptor`, label);
    }
    return resolved;
  }

  if (typeof resolved.family !== "string" || resolved.family.trim().length === 0) {
    throw schemaError(`${label}.family must be a non-empty string`, `${label}.family`);
  }
  if (!["string", "object"].includes(typeof resolved.source) || resolved.source === null) {
    throw schemaError(`${label}.source must be a file path, Buffer, or Uint8Array`, `${label}.source`);
  }
  if (resolved.postscriptName !== undefined && typeof resolved.postscriptName !== "string") {
    throw schemaError(`${label}.postscriptName must be a string`, `${label}.postscriptName`);
  }
  return resolved;
}

function normalizeFallbackFonts(fonts: PdfEmbeddedFontInput[] | undefined, label: string): PdfEmbeddedFontInput[] | undefined {
  if (fonts === undefined) {
    return undefined;
  }
  if (!Array.isArray(fonts)) {
    throw schemaError(`${label} must be an array of embedded font descriptors`, label);
  }
  return fonts.map((font, index) => {
    const normalized = normalizeFont(font, `${label}[${index}]`);
    if (typeof normalized === "string") {
      throw schemaError(`${label}[${index}] must be an embedded font descriptor`, `${label}[${index}]`);
    }
    return normalized;
  });
}

function normalizeText(input: PdfTextPhase1, label: string): NormalizedPdfText {
  if (!input || typeof input !== "object") {
    throw schemaError(`${label} must be an object`, label);
  }

  const value = assertOptionalString(input.value, `${label}.value`);
  if (!value || value.length === 0) {
    throw schemaError(`${label}.value must be a non-empty string`, `${label}.value`);
  }

  const direction = input.direction ?? "auto";
  if (!["auto", "ltr", "rtl"].includes(direction)) {
    throw schemaError(`${label}.direction must be "auto", "ltr", or "rtl"`, `${label}.direction`);
  }

  return {
    direction,
    fallbackFonts: normalizeFallbackFonts(input.fallbackFonts, `${label}.fallbackFonts`),
    font: normalizeFont(input.font, `${label}.font`),
    fontSize: input.fontSize === undefined ? DEFAULT_FONT_SIZE : assertPositiveFiniteNumber(input.fontSize, `${label}.fontSize`),
    value,
    x: input.x === undefined ? DEFAULT_TEXT_X : assertNonNegativeFiniteNumber(input.x, `${label}.x`),
    y: input.y === undefined ? DEFAULT_TEXT_Y : assertNonNegativeFiniteNumber(input.y, `${label}.y`),
  };
}

function normalizeStroke(stroke: PdfStrokeStyle | undefined, label: string): void {
  if (!stroke) {
    return;
  }
  if (stroke.width !== undefined) {
    assertPositiveFiniteNumber(stroke.width, `${label}.width`);
  }
  if (stroke.opacity !== undefined) {
    assertFiniteNumber(stroke.opacity, `${label}.opacity`);
  }
  if (stroke.dash !== undefined) {
    stroke.dash.forEach((value, index) => assertPositiveFiniteNumber(value, `${label}.dash[${index}]`));
  }
}

function normalizeFill(fill: PdfFill | undefined, label: string): void {
  if (!fill) {
    return;
  }
  if (fill.opacity !== undefined) {
    assertFiniteNumber(fill.opacity, `${label}.opacity`);
  }
  if (fill.space === "linear-gradient") {
    fill.stops.forEach((stop, index) => {
      assertFiniteNumber(stop.offset, `${label}.stops[${index}].offset`);
    });
  }
  if (fill.space === "radial-gradient") {
    fill.stops.forEach((stop, index) => {
      assertFiniteNumber(stop.offset, `${label}.stops[${index}].offset`);
    });
  }
}

function normalizeGraphic(graphic: PdfGraphic, label: string): PdfGraphic {
  switch (graphic.type) {
    case "rect":
      assertNonNegativeFiniteNumber(graphic.x, `${label}.x`);
      assertNonNegativeFiniteNumber(graphic.y, `${label}.y`);
      assertPositiveFiniteNumber(graphic.width, `${label}.width`);
      assertPositiveFiniteNumber(graphic.height, `${label}.height`);
      if (graphic.radius !== undefined) {
        assertNonNegativeFiniteNumber(graphic.radius, `${label}.radius`);
      }
      normalizeFill(graphic.fill, `${label}.fill`);
      normalizeStroke(graphic.stroke, `${label}.stroke`);
      return graphic;
    case "line":
      assertFiniteNumber(graphic.x1, `${label}.x1`);
      assertFiniteNumber(graphic.y1, `${label}.y1`);
      assertFiniteNumber(graphic.x2, `${label}.x2`);
      assertFiniteNumber(graphic.y2, `${label}.y2`);
      normalizeStroke(graphic.stroke, `${label}.stroke`);
      return graphic;
    case "path":
      if (typeof graphic.d !== "string" || graphic.d.trim().length === 0) {
        throw schemaError(`${label}.d must be a non-empty SVG path string`, `${label}.d`);
      }
      if (graphic.x !== undefined) {
        assertFiniteNumber(graphic.x, `${label}.x`);
      }
      if (graphic.y !== undefined) {
        assertFiniteNumber(graphic.y, `${label}.y`);
      }
      if (graphic.scaleX !== undefined) {
        assertPositiveFiniteNumber(graphic.scaleX, `${label}.scaleX`);
      }
      if (graphic.scaleY !== undefined) {
        assertPositiveFiniteNumber(graphic.scaleY, `${label}.scaleY`);
      }
      normalizeFill(graphic.fill, `${label}.fill`);
      normalizeStroke(graphic.stroke, `${label}.stroke`);
      return graphic;
    case "image":
      assertNonNegativeFiniteNumber(graphic.x, `${label}.x`);
      assertNonNegativeFiniteNumber(graphic.y, `${label}.y`);
      assertPositiveFiniteNumber(graphic.width, `${label}.width`);
      assertPositiveFiniteNumber(graphic.height, `${label}.height`);
      if (graphic.opacity !== undefined) {
        assertFiniteNumber(graphic.opacity, `${label}.opacity`);
      }
      if (!["string", "object"].includes(typeof graphic.source) || graphic.source === null) {
        throw schemaError(`${label}.source must be a file path, Buffer, or Uint8Array`, `${label}.source`);
      }
      return graphic;
    case "svg":
      assertNonNegativeFiniteNumber(graphic.x, `${label}.x`);
      assertNonNegativeFiniteNumber(graphic.y, `${label}.y`);
      assertPositiveFiniteNumber(graphic.width, `${label}.width`);
      assertPositiveFiniteNumber(graphic.height, `${label}.height`);
      if (graphic.opacity !== undefined) {
        assertFiniteNumber(graphic.opacity, `${label}.opacity`);
      }
      if (!["string", "object"].includes(typeof graphic.source) || graphic.source === null) {
        throw schemaError(`${label}.source must be a string, Buffer, or Uint8Array`, `${label}.source`);
      }
      return graphic;
    default:
      throw schemaError(`${label}.type is unsupported`, `${label}.type`, { received: (graphic as { type?: unknown }).type });
  }
}

export function normalizeDocument(document: PdfDocumentPhase2): NormalizedPdfDocument {
  if (!document || typeof document !== "object") {
    throw schemaError("PdfEngine.render requires a PDF document object", "");
  }

  if (!Array.isArray(document.pages) || document.pages.length === 0) {
    throw schemaError("PdfEngine.render requires at least one page", "pages");
  }

  const pages = document.pages.map((page, pageIndex) => {
    if (!page || typeof page !== "object") {
      throw schemaError(`pages[${pageIndex}] must be an object`, `pages[${pageIndex}]`);
    }

    const textsInput = page.texts ?? (page.text ? [page.text] : []);
    const graphicsInput = page.graphics ?? [];

    if ((!Array.isArray(textsInput) || textsInput.length === 0) && (!Array.isArray(graphicsInput) || graphicsInput.length === 0)) {
      throw schemaError(`pages[${pageIndex}] must define text, texts, or graphics`, `pages[${pageIndex}]`);
    }

    return {
      graphics: graphicsInput.map((graphic, graphicIndex) => normalizeGraphic(graphic, `pages[${pageIndex}].graphics[${graphicIndex}]`)),
      height: page.height === undefined ? DEFAULT_PAGE_HEIGHT : assertPositiveFiniteNumber(page.height, `pages[${pageIndex}].height`),
      texts: textsInput.map((text, textIndex) => normalizeText(text, `pages[${pageIndex}].texts[${textIndex}]`)),
      width: page.width === undefined ? DEFAULT_PAGE_WIDTH : assertPositiveFiniteNumber(page.width, `pages[${pageIndex}].width`),
    };
  });

  return {
    meta: {
      author: assertOptionalString(document.meta?.author, "meta.author"),
      creationDate: document.meta?.creationDate instanceof Date ? document.meta.creationDate : assertOptionalString(document.meta?.creationDate, "meta.creationDate"),
      creator: assertOptionalString(document.meta?.creator, "meta.creator"),
      keywords: document.meta?.keywords?.map((keyword, index) => assertOptionalString(keyword, `meta.keywords[${index}]`)) as string[] | undefined,
      modDate: document.meta?.modDate instanceof Date ? document.meta.modDate : assertOptionalString(document.meta?.modDate, "meta.modDate"),
      producer: assertOptionalString(document.meta?.producer, "meta.producer"),
      subject: assertOptionalString(document.meta?.subject, "meta.subject"),
      title: assertOptionalString(document.meta?.title, "meta.title"),
    },
    pages,
  };
}
