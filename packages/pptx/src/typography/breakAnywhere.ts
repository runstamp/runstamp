import type { TextStyle } from "../types/ast.js";
import { calculateRichTextMetrics } from "./richMetrics.js";
import { uax14Segment } from "./segmentCache.js";

const ZERO_WIDTH_SPACE = "\u200B";

/** Split at extended grapheme boundaries so fallback wrapping never bisects a visible glyph. */
export function splitGraphemes(text: string): string[] {
  return Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text),
    (entry) => entry.segment,
  );
}

function segmentWidth(text: string, style: TextStyle | undefined): number {
  return calculateRichTextMetrics([{ text }], style).maxLineWidth;
}

/** True when normal UAX #14 wrapping leaves at least one segment wider than the box. */
export function hasUnbreakableTextSegment(
  text: string,
  style: TextStyle | undefined,
  maxWidth: number,
): boolean {
  if (maxWidth <= 0) return text.length > 0;
  const containsUrl = /(?:https?:\/\/|www\.)/iu.test(text);
  return uax14Segment(text).some(({ text: segment }) => (
    !/^\s*$/u.test(segment)
    && (splitGraphemes(segment).length >= 300 || containsUrl)
    && segmentWidth(segment, style) > maxWidth
  ));
}

/**
 * Add invisible OOXML wrap opportunities only where normal word wrapping fails.
 * Grapheme segmentation keeps emoji ZWJ sequences and combining marks intact.
 */
export function applyBreakAnywhereFallback(
  text: string,
  style: TextStyle | undefined,
  maxWidth: number,
): string {
  if (maxWidth <= 0) return text;
  return uax14Segment(text).map(({ text: segment }) => {
    if (/^\s*$/u.test(segment) || segmentWidth(segment, style) <= maxWidth) {
      return segment;
    }
    return splitGraphemes(segment).join(ZERO_WIDTH_SPACE);
  }).join("");
}
