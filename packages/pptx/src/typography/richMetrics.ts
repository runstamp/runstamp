// src/typography/richMetrics.ts — Multi-run text measurement with Knuth-Plass line breaking

import type { TextRun, TextStyle } from "../types/ast.js";
import { getFontOrNull } from "./fontCache.js";
import { shapeSegmentWidth } from "./shaper.js";
import { uax14Segment, computeLineHeight } from "./segmentCache.js";
import { segmentByFont } from "./fontFallback.js";
import { knuthPlassLineBreak, type KPSegment } from "./knuthPlass.js";
import { splitBidiText } from "./bidi.js";
import { resolveLineHeightPixels } from "./lineHeight.js";

export interface RichTextMetrics {
  width: number;
  height: number;
  lineCount: number;
  maxLineWidth: number;
}

/**
 * Measures rich text runs using UAX#14 segmentation, HarfBuzz shaping,
 * and Knuth-Plass line breaking — the same pipeline used for actual layout.
 *
 * This ensures auto-fit measurements match rendered output.
 */
export function calculateRichTextMetrics(
  runs: TextRun[],
  defaultStyle: TextStyle | undefined,
  maxWidth?: number,
): RichTextMetrics {
  const defaultFontSize = defaultStyle?.fontSize ?? 16;
  const defaultFontFamily = defaultStyle?.fontFamily ?? "Helvetica";
  const fallbacks = defaultStyle?.fontFallback ?? [];

  // Build KPSegments from all runs using the same shaping pipeline as segmentCache
  const allSegments: KPSegment[] = [];

  // If TextStyle.lineHeight is set, use it as a per-run override (same as measureBridge.ts).
  // This ensures auto-fit measurements match Yoga layout when custom lineHeight is applied.
  const lineHeightOverride = defaultStyle?.lineHeight;

  for (const run of runs) {
    const fontSize = run.style?.fontSize ?? defaultFontSize;
    const fontFamily = run.style?.fontFamily ?? defaultFontFamily;
    // lineHeight override comes from the container TextStyle (not per-run, since TextRunStyle has no lineHeight)
    const measuredLineHeight = computeLineHeight(fontFamily, fontSize);
    const lineHeight = resolveLineHeightPixels(lineHeightOverride, fontSize, measuredLineHeight);

    const breakUnits = uax14Segment(run.text);

    for (const { text: segText, mandatory } of breakUnits) {
      const isSpace = /^\s+$/.test(segText);

      // Shape the segment using HarfBuzz via font fallback cascade
      let pixelWidth: number;
      try {
        let total = 0;
        for (const bidiRun of splitBidiText(segText)) {
          const fontSegments = segmentByFont(bidiRun.text, fontFamily, fallbacks);
          for (const fs of fontSegments) {
            const font = getFontOrNull(fs.fontFamily);
            const upem = font?.unitsPerEm ?? 1000;
            const w = shapeSegmentWidth(fs.text, fs.fontFamily, fontSize, upem, fs.script, bidiRun.direction);
            total += (w === 0 && fs.text.length > 0) ? fs.text.length * fontSize * 0.6 : w;
          }
        }
        pixelWidth = total;
      } catch {
        pixelWidth = segText.length * fontSize * 0.6;
      }

      allSegments.push({
        pixelWidth,
        mandatory,
        isSpace,
        lineHeight,
      });
    }
  }

  if (allSegments.length === 0) {
    return { width: 0, height: defaultFontSize * 1.2, lineCount: 1, maxLineWidth: 0 };
  }

  // Without a width constraint, return single-line metrics
  if (maxWidth === undefined) {
    let totalWidth = 0;
    let maxH = 0;
    for (const seg of allSegments) {
      totalWidth += seg.pixelWidth;
      if (seg.lineHeight > maxH) maxH = seg.lineHeight;
    }
    return { width: totalWidth, height: maxH, lineCount: 1, maxLineWidth: totalWidth };
  }

  // Use Knuth-Plass for proper line breaking
  const result = knuthPlassLineBreak(allSegments, maxWidth);

  return {
    width: Math.min(result.maxLineWidth, maxWidth),
    height: result.totalHeight,
    lineCount: result.lineCount,
    maxLineWidth: result.maxLineWidth,
  };
}
