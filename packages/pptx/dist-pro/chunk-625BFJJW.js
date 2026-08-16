import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  computeLineHeight,
  knuthPlassLineBreak,
  segmentByFont,
  shapeSegmentWidth,
  uax14Segment
} from "./chunk-DYXX63XE.js";
import {
  getFontOrNull,
  resolveLineHeightPixels,
  splitBidiText
} from "./chunk-P5JGOT4P.js";

// src/typography/richMetrics.ts
function calculateRichTextMetrics(runs, defaultStyle, maxWidth) {
  const defaultFontSize = defaultStyle?.fontSize ?? 16;
  const defaultFontFamily = defaultStyle?.fontFamily ?? "Helvetica";
  const fallbacks = defaultStyle?.fontFallback ?? [];
  const allSegments = [];
  const lineHeightOverride = defaultStyle?.lineHeight;
  for (const run of runs) {
    const fontSize = run.style?.fontSize ?? defaultFontSize;
    const fontFamily = run.style?.fontFamily ?? defaultFontFamily;
    const measuredLineHeight = computeLineHeight(fontFamily, fontSize);
    const lineHeight = resolveLineHeightPixels(lineHeightOverride, fontSize, measuredLineHeight);
    const breakUnits = uax14Segment(run.text);
    for (const { text: segText, mandatory } of breakUnits) {
      const isSpace = /^\s+$/.test(segText);
      let pixelWidth;
      try {
        let total = 0;
        for (const bidiRun of splitBidiText(segText)) {
          const fontSegments = segmentByFont(bidiRun.text, fontFamily, fallbacks);
          for (const fs of fontSegments) {
            const font = getFontOrNull(fs.fontFamily);
            const upem = font?.unitsPerEm ?? 1e3;
            const w = shapeSegmentWidth(fs.text, fs.fontFamily, fontSize, upem, fs.script, bidiRun.direction);
            total += w === 0 && fs.text.length > 0 ? fs.text.length * fontSize * 0.6 : w;
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
        lineHeight
      });
    }
  }
  if (allSegments.length === 0) {
    return { width: 0, height: defaultFontSize * 1.2, lineCount: 1, maxLineWidth: 0 };
  }
  if (maxWidth === void 0) {
    let totalWidth = 0;
    let maxH = 0;
    for (const seg of allSegments) {
      totalWidth += seg.pixelWidth;
      if (seg.lineHeight > maxH) maxH = seg.lineHeight;
    }
    return { width: totalWidth, height: maxH, lineCount: 1, maxLineWidth: totalWidth };
  }
  const result = knuthPlassLineBreak(allSegments, maxWidth);
  return {
    width: Math.min(result.maxLineWidth, maxWidth),
    height: result.totalHeight,
    lineCount: result.lineCount,
    maxLineWidth: result.maxLineWidth
  };
}

export {
  calculateRichTextMetrics
};
//# sourceMappingURL=chunk-625BFJJW.js.map
