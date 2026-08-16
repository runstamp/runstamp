// src/typography/metrics.ts — Glyph math: scale font EM units → absolute pixels

import type { Font } from "fontkit";

export interface TextMetrics {
  width: number;
  height: number;
}

/**
 * Calculates the pixel bounding box for a string of text given a loaded font
 * and a target fontSize.
 *
 * Scale formula:
 *   scale = fontSize / unitsPerEm
 *   lineHeight = (ascent - descent + lineGap) * scale
 *   rawWidth = sum(glyph.advanceWidth) * scale
 *
 * If maxWidth is supplied and rawWidth exceeds it, the text is wrapped using
 * simple geometric line-count estimation (Math.ceil(rawWidth / maxWidth)).
 * Word-boundary splitting is intentionally deferred to a later production pass.
 */
export function calculateTextMetrics(
  text: string,
  font: Font,
  fontSize: number,
  maxWidth?: number,
): TextMetrics {
  const scale = fontSize / font.unitsPerEm;

  // Absolute line height from font metrics
  const lineHeight = (font.ascent - font.descent + (font.lineGap ?? 0)) * scale;

  // Sum advance widths of every glyph in the shaped run
  const glyphRun = font.layout(text);
  const totalAdvanceWidth = glyphRun.glyphs.reduce(
    (sum, glyph) => sum + glyph.advanceWidth,
    0,
  );
  const rawPixelWidth = totalAdvanceWidth * scale;

  // Apply line-wrapping constraint if a maxWidth is provided
  let finalWidth = rawPixelWidth;
  let lines = 1;

  if (maxWidth !== undefined && rawPixelWidth > maxWidth) {
    finalWidth = maxWidth;
    lines = Math.ceil(rawPixelWidth / maxWidth);
  }

  return {
    width: finalWidth,
    height: lines * lineHeight,
  };
}
