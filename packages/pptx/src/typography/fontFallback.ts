// src/typography/fontFallback.ts — Glyph detection, script classification, font cascade segmentation

import type { Font } from "fontkit";
import { getFontOrNull } from "./fontCache.js";

export type ScriptClass = "latin" | "ea" | "cs";

export interface FontSegment {
  text: string;
  fontFamily: string;
  script: ScriptClass;
}

/**
 * Classifies a Unicode code point into OOXML script buckets.
 * - "ea" → East Asian (CJK, Hangul, Kana, etc.)
 * - "cs" → Complex Script (Arabic, Hebrew, Devanagari, etc.)
 * - "latin" → Everything else
 */
export function classifyScript(codePoint: number): ScriptClass {
  // East Asian ranges
  if (
    (codePoint >= 0x3000 && codePoint <= 0x9FFF) ||  // CJK, Kana, Bopomofo
    (codePoint >= 0xAC00 && codePoint <= 0xD7AF) ||  // Hangul Syllables
    (codePoint >= 0x1100 && codePoint <= 0x11FF) ||  // Hangul Jamo
    (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||  // CJK Compatibility Ideographs
    (codePoint >= 0xFF00 && codePoint <= 0xFFEF) ||  // Halfwidth/Fullwidth Forms
    (codePoint >= 0x20000 && codePoint <= 0x2FA1F)   // CJK Extension B+
  ) {
    return "ea";
  }

  // Complex Script ranges (per UAX#24 / OOXML complex script bucket)
  if (
    (codePoint >= 0x0590 && codePoint <= 0x08FF) ||  // Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan, Mandaic
    (codePoint >= 0xFB50 && codePoint <= 0xFDFF) ||  // Arabic Presentation Forms-A
    (codePoint >= 0xFE70 && codePoint <= 0xFEFF) ||  // Arabic Presentation Forms-B
    (codePoint >= 0x0900 && codePoint <= 0x097F) ||  // Devanagari
    (codePoint >= 0x0980 && codePoint <= 0x09FF) ||  // Bengali
    (codePoint >= 0x0A00 && codePoint <= 0x0A7F) ||  // Gurmukhi
    (codePoint >= 0x0A80 && codePoint <= 0x0AFF) ||  // Gujarati
    (codePoint >= 0x0B00 && codePoint <= 0x0B7F) ||  // Oriya
    (codePoint >= 0x0B80 && codePoint <= 0x0BFF) ||  // Tamil
    (codePoint >= 0x0C00 && codePoint <= 0x0C7F) ||  // Telugu
    (codePoint >= 0x0C80 && codePoint <= 0x0CFF) ||  // Kannada
    (codePoint >= 0x0D00 && codePoint <= 0x0D7F) ||  // Malayalam
    (codePoint >= 0x0D80 && codePoint <= 0x0DFF) ||  // Sinhala
    (codePoint >= 0x0E00 && codePoint <= 0x0E7F) ||  // Thai
    (codePoint >= 0x0E80 && codePoint <= 0x0EFF) ||  // Lao
    (codePoint >= 0x0F00 && codePoint <= 0x0FFF) ||  // Tibetan
    (codePoint >= 0x1000 && codePoint <= 0x109F) ||  // Myanmar
    (codePoint >= 0x10A0 && codePoint <= 0x10FF) ||  // Georgian
    (codePoint >= 0x1200 && codePoint <= 0x137F) ||  // Ethiopic
    (codePoint >= 0x1380 && codePoint <= 0x139F) ||  // Ethiopic Supplement
    (codePoint >= 0x13A0 && codePoint <= 0x13FF) ||  // Cherokee
    (codePoint >= 0x1780 && codePoint <= 0x17FF) ||  // Khmer
    (codePoint >= 0x1800 && codePoint <= 0x18AF) ||  // Mongolian
    (codePoint >= 0x0530 && codePoint <= 0x058F) ||  // Armenian
    (codePoint >= 0x10D0 && codePoint <= 0x10FF) ||  // Georgian Mkhedruli (overlaps with above range)
    (codePoint >= 0x2D00 && codePoint <= 0x2D2F) ||  // Georgian Supplement
    (codePoint >= 0xA980 && codePoint <= 0xA9DF) ||  // Javanese
    (codePoint >= 0x1B80 && codePoint <= 0x1BBF) ||  // Sundanese
    (codePoint >= 0x1BC0 && codePoint <= 0x1BFF)     // Batak
  ) {
    return "cs";
  }

  return "latin";
}

/**
 * Tests whether a font has a glyph for the given code point.
 * Glyph id 0 = .notdef = missing.
 *
 * Uses fontkit's glyphForCodePoint() which looks up the cmap table directly
 * without performing full text shaping (kerning, ligatures, etc.).
 */
export function hasGlyph(font: Font, codePoint: number): boolean {
  const glyph = font.glyphForCodePoint(codePoint);
  return glyph != null && glyph.id !== 0;
}

/**
 * Segments text into contiguous runs by resolved font, using a cascade of
 * primary + fallback families. Returns segments with their resolved font name
 * and script classification.
 */
export function segmentByFont(
  text: string,
  primaryFamily: string,
  fallbackFamilies: string[] = [],
): FontSegment[] {
  if (text.length === 0) return [];

  const allFamilies = [primaryFamily, ...fallbackFamilies];
  const segments: FontSegment[] = [];
  let currentSegment: FontSegment | null = null;

  for (const char of text) {
    const codePoint = char.codePointAt(0)!;
    const script = classifyScript(codePoint);

    // Try to resolve a font that has this glyph
    let resolvedFamily = primaryFamily;
    for (const family of allFamilies) {
      const font = getFontOrNull(family);
      if (font && hasGlyph(font, codePoint)) {
        resolvedFamily = family;
        break;
      }
    }

    if (
      currentSegment &&
      currentSegment.fontFamily === resolvedFamily &&
      currentSegment.script === script
    ) {
      currentSegment.text += char;
    } else {
      currentSegment = { text: char, fontFamily: resolvedFamily, script };
      segments.push(currentSegment);
    }
  }

  return segments;
}
