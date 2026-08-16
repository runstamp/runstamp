// src/typography/segmentCache.ts — Phase A+B: UAX#14 segmentation + HarfBuzz/fontkit shaping
import { getLogger } from "../logger.js";

// See ../bidi.ts comment for why the triple-slash reference is needed here.
/// <reference path="../linebreak.d.ts" />
import LineBreaker from "linebreak";
import type { PaperText, TextRun, TextStyle } from "../types/ast.js";
import { getFontOrNull, isSubstitutedFont, boldFontKey, italicFontKey, boldItalicFontKey } from "./fontCache.js";
import { segmentByFont, classifyScript, type ScriptClass } from "./fontFallback.js";
import { shapeSegmentWidth } from "./shaper.js";
import { isLiteBundle } from "../engineMode.js";
import { splitBidiText } from "./bidi.js";
import type { ResolvedFontIdentity } from "./fontRegistry.js";

// Width correction factors for measurement accuracy.
// These INTENTIONALLY stack with the constraint reduction in measureBridge.ts:
//   Phase B (here): widths inflated by 5% for substituted/bold fonts
//   Phase C (measureBridge): constraint reduced by 2% for substituted, 0.5% for native
// Net effect: substituted bold = +10% width, -2% constraint ≈ +12% total buffer.
// This matches empirical HarfBuzz-vs-PowerPoint divergence measurements.
const SUBSTITUTION_WIDTH_FACTOR = 1.05; // 5% safety margin for substituted fonts
const BOLD_WIDTH_FACTOR = 1.05;         // 5% correction when bold font not available

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ShapedSegment {
  /** HarfBuzz-shaped pixel width for this UAX#14 break opportunity. */
  pixelWidth: number;
  /** true = a mandatory line break follows this segment (e.g. \n, paragraph). */
  mandatory: boolean;
  /** true if segment is whitespace-only */
  isSpace: boolean;
  /** true if segment contains CJK ideographs (enables inter-character micro-glue) */
  isCjk?: boolean;
}

export interface ShapedRun {
  /** One entry per UAX#14 break opportunity within the run's text. */
  segments: ShapedSegment[];
  /** fontkit: (ascent - descent + lineGap) * scale */
  lineHeight: number;
  /** Concrete identity selected before layout; consumers must not re-resolve the requested name. */
  resolvedFont?: ResolvedFontIdentity;
}

// ---------------------------------------------------------------------------
// WeakMap cache — keyed on the PaperText AST node, GC'd automatically when
// the AST is released between slides. This is the WASM memory ceiling mechanism
// on the JS side: stale entries never pin WASM heap allocations.
// ---------------------------------------------------------------------------

const shapedSegmentCache = new WeakMap<PaperText, ShapedRun[]>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Phase A: UAX#14 segmentation.
 * Runs the LineBreaker over `text` and returns one entry per break opportunity.
 * The text for each entry is the substring up to (and including) the break position.
 */
export function uax14Segment(text: string): Array<{ text: string; mandatory: boolean }> {
  if (text.length === 0) return [];

  const breaker = new LineBreaker(text);
  const result: Array<{ text: string; mandatory: boolean }> = [];
  let prev = 0;
  let brk = breaker.nextBreak();

  while (brk !== null) {
    const segText = text.slice(prev, brk.position);
    if (segText.length > 0) {
      result.push({ text: segText, mandatory: brk.required });
    }
    prev = brk.position;
    brk = breaker.nextBreak();
  }

  // Any trailing content after the last break point
  if (prev < text.length) {
    result.push({ text: text.slice(prev), mandatory: false });
  }

  return result;
}

/**
 * Computes line height using fontkit's font metrics.
 * Falls back to fontSize * 1.2 if the font isn't loaded.
 */
export function computeLineHeight(fontFamily: string, fontSize: number): number {
  const font = getFontOrNull(fontFamily);
  if (!font || typeof font.ascent !== "number" || typeof font.unitsPerEm !== "number") {
    return fontSize * 1.2;
  }
  const scale = fontSize / font.unitsPerEm;
  return (font.ascent - font.descent + (font.lineGap ?? 0)) * scale;
}

/**
 * Fontkit-based width measurement (used in lite mode instead of HarfBuzz).
 * Uses fontkit's font.layout() to compute glyph advance widths.
 */
function measureFontSegmentWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  script?: ScriptClass,
): number {
  const font = getFontOrNull(fontFamily);
  if (!font) {
    // CJK/fullwidth chars are ~1.0× em-width; Latin/complex are ~0.6×.
    const widthRatio = script === "ea" ? 1.0 : 0.6;
    return text.length * fontSize * widthRatio;
  }

  const scale = fontSize / font.unitsPerEm;
  const glyphRun = font.layout(text);
  const measured = glyphRun.glyphs.reduce((sum: number, glyph: any) => sum + glyph.advanceWidth, 0) * scale;
  // If fontkit returns 0 (missing glyphs), use char-count estimate
  if (measured === 0 && text.length > 0) {
    const widthRatio = script === "ea" ? 1.0 : 0.6;
    return text.length * fontSize * widthRatio;
  }
  return measured;
}

/**
 * Phase B: shapes one UAX#14 segment via the font fallback cascade.
 * Uses HarfBuzz in full mode, fontkit in lite mode.
 * Falls back to a character-count estimate on error.
 */
function shapeUax14Segment(
  segText: string,
  fontFamily: string,
  fallbacks: string[],
  fontSize: number,
  isBold?: boolean,
  isItalic?: boolean,
): number {
  // For bold/italic text, try shaping with the variant font if available.
  // Bold+italic combined takes priority, then bold, then italic.
  let effectiveFamily = fontFamily;
  if (isBold && isItalic) {
    effectiveFamily = resolveBoldItalicFamily(fontFamily);
  } else if (isBold) {
    effectiveFamily = resolveBoldFamily(fontFamily);
  } else if (isItalic) {
    effectiveFamily = resolveItalicFamily(fontFamily);
  }
  const usedBoldFallback = isBold && effectiveFamily === fontFamily && !getFontOrNull(boldFontKey(fontFamily));
  const lite = isLiteBundle();

  try {
    let total = 0;
    const bidiRuns = splitBidiText(segText);

    if (lite) {
      // Lite mode: fontkit-based measurement (no HarfBuzz WASM)
      for (const bidiRun of bidiRuns) {
        const fontSegments = segmentByFont(bidiRun.text, effectiveFamily, fallbacks);
        for (const fs of fontSegments) {
          total += measureFontSegmentWidth(fs.text, fs.fontFamily, fontSize, fs.script);
        }
      }
    } else {
      // Full mode: HarfBuzz-based measurement
      for (const bidiRun of bidiRuns) {
        const fontSegments = segmentByFont(bidiRun.text, effectiveFamily, fallbacks);
        for (const fs of fontSegments) {
          const font = getFontOrNull(fs.fontFamily);
          const upem = font?.unitsPerEm ?? 1000;
          const w = shapeSegmentWidth(fs.text, fs.fontFamily, fontSize, upem, fs.script, bidiRun.direction);
          if (w === 0 && fs.text.length > 0) {
            // Fallback char-count estimate. CJK/fullwidth chars are ~1.0× em-width;
            // Latin/complex script chars are ~0.6× em-width.
            const widthRatio = fs.script === "ea" ? 1.0 : 0.6;
            total += fs.text.length * fontSize * widthRatio;
          } else {
            total += w;
          }
        }
      }
    }

    // Apply safety margin for substituted fonts (e.g. Calibri → Arial on macOS)
    if (isSubstitutedFont(fontFamily)) {
      total *= SUBSTITUTION_WIDTH_FACTOR;
    }

    // Apply bold width correction when bold font variant isn't available
    if (usedBoldFallback) {
      total *= BOLD_WIDTH_FACTOR;
    }

    return total;
  } catch (e) {
    // Safety: never let a shaping error propagate into the Yoga callback.
    const backend = lite ? "fontkit" : "HarfBuzz";
    getLogger().warn(`[segmentCache] ${backend} shaping failed for "${fontFamily}" (${segText.length} chars): ${(e as Error).message}. Using char-count estimate.`);
    return segText.length * fontSize * 0.6;
  }
}

/**
 * Resolves the effective font family for bold text: uses the bold variant key
 * if a bold font has been loaded, otherwise falls back to the regular family.
 */
function resolveBoldFamily(fontFamily: string): string {
  const bKey = boldFontKey(fontFamily);
  return getFontOrNull(bKey) ? bKey : fontFamily;
}

/**
 * Resolves the effective font family for italic text: uses the italic variant key
 * if an italic font has been loaded, otherwise falls back to the regular family.
 */
function resolveItalicFamily(fontFamily: string): string {
  const iKey = italicFontKey(fontFamily);
  return getFontOrNull(iKey) ? iKey : fontFamily;
}

/**
 * Resolves the effective font family for bold+italic text.
 * Fallback chain: bold-italic → bold → italic → regular.
 */
function resolveBoldItalicFamily(fontFamily: string): string {
  const biKey = boldItalicFontKey(fontFamily);
  if (getFontOrNull(biKey)) return biKey;
  const bKey = boldFontKey(fontFamily);
  if (getFontOrNull(bKey)) return bKey;
  const iKey = italicFontKey(fontFamily);
  if (getFontOrNull(iKey)) return iKey;
  return fontFamily;
}

/**
 * Returns true if any character in the text is a CJK ideograph.
 * UAX#14 segments on break opportunities, not strict script boundaries,
 * so a segment may mix CJK and non-CJK characters — scanning the full
 * segment is necessary to correctly enable inter-character micro-glue.
 */
function detectCjk(text: string): boolean {
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp !== undefined && cp > 0x20 && classifyScript(cp) === "ea") return true;
  }
  return false;
}

/**
 * Builds a ShapedRun from a plain string using the given font/fallback/size.
 */
function buildRunFromString(
  text: string,
  fontFamily: string,
  fallbacks: string[],
  fontSize: number,
  isBold?: boolean,
  isItalic?: boolean,
  resolvedFont?: ResolvedFontIdentity,
): ShapedRun {
  const breakUnits = uax14Segment(text);
  const segments: ShapedSegment[] = breakUnits.map(({ text: segText, mandatory }) => {
    const isSpace = /^\s+$/.test(segText);
    return {
      pixelWidth: shapeUax14Segment(segText, fontFamily, fallbacks, fontSize, isBold, isItalic),
      mandatory,
      isSpace,
      ...((!isSpace && detectCjk(segText)) ? { isCjk: true } : undefined),
    };
  });

  return {
    segments,
    lineHeight: computeLineHeight(fontFamily, fontSize),
    resolvedFont,
  };
}

/**
 * Builds a ShapedRun from a TextRun, resolving run-level font/size overrides
 * against the node-level TextStyle defaults.
 */
function buildRunFromTextRun(run: TextRun, defaults: TextStyle): ShapedRun {
  const fontFamily = run.style?.fontFamily ?? defaults.fontFamily ?? "Liberation Sans";
  const fontSize = run.style?.fontSize ?? defaults.fontSize ?? 16;
  const fallbacks = defaults.fontFallback ?? [];
  const isBold = (run.style?.fontWeight ?? defaults.fontWeight) === "bold";
  const isItalic = (run.style?.fontStyle ?? defaults.fontStyle) === "italic";
  return buildRunFromString(
    run.text,
    fontFamily,
    fallbacks,
    fontSize,
    isBold,
    isItalic,
    run.style?.resolvedFont ?? defaults.resolvedFont,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pre-computes shaped segments for a PaperText node and stores the result in
 * the WeakMap cache. Must be called before Yoga's calculateLayout() fires the
 * synchronous MeasureFunc callback.
 */
export function precomputeShapedSegments(node: PaperText): void {
  const style = (node.style as TextStyle | undefined) ?? {};
  const fontFamily = style.fontFamily ?? "Liberation Sans";
  const fontSize = style.fontSize ?? 16;
  const fallbacks = style.fontFallback ?? [];
  const isBold = style.fontWeight === "bold";
  const isItalic = style.fontStyle === "italic";

  let runs: ShapedRun[];

  const t0 = performance.now();
  if (typeof node.content === "string") {
    runs = [buildRunFromString(node.content, fontFamily, fallbacks, fontSize, isBold, isItalic, style.resolvedFont)];
  } else if (Array.isArray(node.content)) {
    runs = (node.content as TextRun[]).map((run) =>
      buildRunFromTextRun(run, style),
    );
  } else if (node.paragraphs) {
    // Shape each paragraph's runs and insert mandatory breaks between paragraphs.
    // Without these breaks, knuthPlassLineBreak treats all paragraphs as one
    // continuous block and reflows text across paragraph boundaries.
    runs = [];
    for (let pi = 0; pi < node.paragraphs.length; pi++) {
      const para = node.paragraphs[pi];
      if (para.runs.length === 0) {
        runs.push(buildRunFromString("", fontFamily, fallbacks, fontSize, isBold, isItalic, style.resolvedFont));
      } else {
        for (const run of para.runs) {
          runs.push(buildRunFromTextRun(run, style));
        }
      }
      // Insert a mandatory break after each paragraph (except the last)
      if (pi < node.paragraphs.length - 1) {
        runs.push({
          segments: [{ pixelWidth: 0, mandatory: true, isSpace: false }],
          lineHeight: computeLineHeight(fontFamily, fontSize),
        });
      }
    }
  } else {
    // No content at all — empty text node
    runs = [buildRunFromString("", fontFamily, fallbacks, fontSize, isBold, isItalic, style.resolvedFont)];
  }
  getLogger().metric?.("harfbuzz.shape.batch", performance.now() - t0);

  shapedSegmentCache.set(node, runs);
}

/**
 * Returns the cached ShapedRun[] for a node, or null if not yet computed.
 */
export function getCachedShapedRuns(node: PaperText): ShapedRun[] | null {
  return shapedSegmentCache.get(node) ?? null;
}
