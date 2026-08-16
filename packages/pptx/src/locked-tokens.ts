// src/locked-tokens.ts — Optional pre-render brand-palette enforcement.
//
// When EngineRenderOptions.lockedBrandPalette is provided, the engine
// walks the PaperDocument before rendering and throws a PaperError with
// code "LOCKED_TOKEN_VIOLATION" on the first off-palette color or font.
//
// The check is opt-in: callers that don't pass lockedBrandPalette get the
// default tolerant behavior (any color/font is allowed).

import { PaperError } from "./errors.js";
import type { PaperDocument, PaperNode, PaperSlide } from "./types/ast.js";

export interface LockedBrandPalette {
  /** Allowed colors as 6-char uppercase hex without leading '#'. */
  allowedColors: ReadonlySet<string>;
  /** Allowed font family names. Substring/prefix matching is applied. */
  allowedFonts: ReadonlySet<string>;
}

const HEX_RE = /#?([0-9A-Fa-f]{6})/;

function normalizeHex(input: string): string | undefined {
  const m = HEX_RE.exec(input);
  return m ? m[1].toUpperCase() : undefined;
}

function colorAllowed(value: string, palette: LockedBrandPalette): boolean {
  const hex = normalizeHex(value);
  if (!hex) return true; // unparseable string — out of scope, not a violation
  return palette.allowedColors.has(hex);
}

function fontAllowed(value: string, palette: LockedBrandPalette): boolean {
  if (palette.allowedFonts.has(value)) return true;
  for (const f of palette.allowedFonts) {
    if (value === f || value.startsWith(f) || f.startsWith(value)) return true;
  }
  return false;
}

function fail(
  message: string,
  opts: { slideIndex: number; field: string; value: string },
): never {
  throw new PaperError(message, {
    code: "LOCKED_TOKEN_VIOLATION",
    phase: "validation",
    slideIndex: opts.slideIndex,
    path: opts.field.split("."),
    issues: [{ path: opts.field, message, received: opts.value }],
    remediation: `Replace "${opts.value}" with a value from the brand kit, or remove the lockedBrandPalette option to skip this check.`,
  });
}

function checkStyleColors(
  style: Record<string, unknown> | undefined,
  slideIndex: number,
  palette: LockedBrandPalette,
  ctx: string,
): void {
  if (!style) return;
  for (const key of ["color", "backgroundColor", "borderColor"]) {
    const v = style[key];
    if (typeof v === "string" && !colorAllowed(v, palette)) {
      fail(
        `Locked-token violation on slide ${slideIndex}: ${ctx}.${key} = "${v}" is not in the allowed palette`,
        { slideIndex, field: `${ctx}.${key}`, value: v },
      );
    }
  }
  // `fill` may be a string or an object {type, color, stops}.
  const fill = style.fill;
  if (typeof fill === "string" && !colorAllowed(fill, palette)) {
    fail(
      `Locked-token violation on slide ${slideIndex}: ${ctx}.fill = "${fill}" is not in the allowed palette`,
      { slideIndex, field: `${ctx}.fill`, value: fill },
    );
  } else if (fill && typeof fill === "object") {
    const f = fill as { color?: unknown; stops?: Array<{ color?: unknown }> };
    if (typeof f.color === "string" && !colorAllowed(f.color, palette)) {
      fail(
        `Locked-token violation on slide ${slideIndex}: ${ctx}.fill.color = "${f.color}" is not in the allowed palette`,
        { slideIndex, field: `${ctx}.fill.color`, value: f.color },
      );
    }
    for (const [i, stop] of (f.stops ?? []).entries()) {
      if (typeof stop?.color === "string" && !colorAllowed(stop.color, palette)) {
        fail(
          `Locked-token violation on slide ${slideIndex}: ${ctx}.fill.stops[${i}].color = "${stop.color}" is not in the allowed palette`,
          { slideIndex, field: `${ctx}.fill.stops[${i}].color`, value: stop.color },
        );
      }
    }
  }
}

function checkStyleFont(
  style: Record<string, unknown> | undefined,
  slideIndex: number,
  palette: LockedBrandPalette,
  ctx: string,
): void {
  if (!style) return;
  const v = style.fontFamily;
  if (typeof v === "string" && !fontAllowed(v, palette)) {
    fail(
      `Locked-token violation on slide ${slideIndex}: ${ctx}.fontFamily = "${v}" is not in the allowed font set`,
      { slideIndex, field: `${ctx}.fontFamily`, value: v },
    );
  }
}

function checkNode(
  node: PaperNode,
  slideIndex: number,
  palette: LockedBrandPalette,
  ctx: string,
): void {
  const style = (node as { style?: Record<string, unknown> }).style;
  checkStyleColors(style, slideIndex, palette, ctx);
  checkStyleFont(style, slideIndex, palette, ctx);

  const textStyle = (node as { textStyle?: Record<string, unknown> }).textStyle;
  checkStyleColors(textStyle, slideIndex, palette, `${ctx}.textStyle`);
  checkStyleFont(textStyle, slideIndex, palette, `${ctx}.textStyle`);

  const t = (node as { type: string }).type;
  if (t === "Table") {
    const td = (node as any).tableData;
    for (const [r, row] of (td?.rows ?? []).entries()) {
      for (const [c, cell] of (row?.cells ?? []).entries()) {
        checkStyleColors(cell?.style, slideIndex, palette, `${ctx}.table[${r}][${c}]`);
        checkStyleFont(cell?.style, slideIndex, palette, `${ctx}.table[${r}][${c}]`);
      }
    }
  } else if (t === "Chart") {
    const cd = (node as any).chartData;
    for (const [i, s] of (cd?.series ?? []).entries()) {
      if (typeof s?.color === "string" && !colorAllowed(s.color, palette)) {
        fail(
          `Locked-token violation on slide ${slideIndex}: ${ctx}.chart.series[${i}].color = "${s.color}" is not in the allowed palette`,
          { slideIndex, field: `${ctx}.chart.series[${i}].color`, value: s.color },
        );
      }
    }
  } else if (t === "Text") {
    for (const p of (node as any).paragraphs ?? []) {
      for (const [ri, r] of (p?.runs ?? []).entries()) {
        checkStyleColors(r?.style, slideIndex, palette, `${ctx}.run[${ri}]`);
        checkStyleFont(r?.style, slideIndex, palette, `${ctx}.run[${ri}]`);
      }
    }
  }
}

function checkSlide(
  slide: PaperSlide,
  index: number,
  palette: LockedBrandPalette,
): void {
  const bg = (slide as any).background;
  if (bg?.type === "solid" && typeof bg.color === "string" && !colorAllowed(bg.color, palette)) {
    fail(
      `Locked-token violation on slide ${index}: background = "${bg.color}" is not in the allowed palette`,
      { slideIndex: index, field: "slide.background", value: bg.color },
    );
  }
  if (bg?.type === "gradient") {
    for (const [i, stop] of (bg.stops ?? []).entries()) {
      if (typeof stop?.color === "string" && !colorAllowed(stop.color, palette)) {
        fail(
          `Locked-token violation on slide ${index}: gradient stop[${i}] = "${stop.color}" is not in the allowed palette`,
          { slideIndex: index, field: `slide.background.stop[${i}]`, value: stop.color },
        );
      }
    }
  }
  for (const [i, child] of (slide.children ?? []).entries()) {
    checkNode(child, index, palette, `node[${i}]`);
  }
}

export function enforceLockedBrandPalette(
  doc: PaperDocument,
  palette: LockedBrandPalette,
): void {
  for (const [i, slide] of doc.slides.entries()) {
    checkSlide(slide, i + 1, palette);
  }
}
