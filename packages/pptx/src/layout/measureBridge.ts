// src/layout/measureBridge.ts — Yoga setMeasureFunc bridge for text nodes
import { getLogger } from "../logger.js";

import type { Node as YogaNode } from "yoga-wasm-web";
import {
  MEASURE_MODE_EXACTLY,
  MEASURE_MODE_AT_MOST,
  type MeasureMode,
} from "yoga-wasm-web";
import type { PaperText, TextStyle } from "../types/ast.js";
import {
  getCachedShapedRuns,
  precomputeShapedSegments,
} from "../typography/segmentCache.js";
import { isSubstitutedFont } from "../typography/fontCache.js";
import { knuthPlassLineBreak } from "../typography/knuthPlass.js";
import { resolveLineHeightPixels } from "../typography/lineHeight.js";

export const SHRINK_WRAPPED_SINGLE_LINE_WIDTH_FACTOR = 1.03;

interface IntrinsicSingleLineMeasurement {
  width: number;
}

const intrinsicSingleLineMeasurements = new WeakMap<PaperText, IntrinsicSingleLineMeasurement>();

/**
 * VQH-026: Carlito Bold 19.5pt `75/25` measured 47.91pt but received a
 * 48pt box — only 0.09pt/0.2% slack. Cross-renderer glyph hinting and
 * rounding can consume that margin, so content-sized single-line boxes get
 * 3% slack rounded up to a whole layout pixel.
 */
function addIntrinsicSingleLineWidthSlack(measuredWidth: number): number {
  return Math.ceil(measuredWidth * SHRINK_WRAPPED_SINGLE_LINE_WIDTH_FACTOR);
}

export function getSingleLineShrinkWrappedWidth(
  astNode: PaperText,
  computedWidth: number,
): number | undefined {
  const measurement = intrinsicSingleLineMeasurements.get(astNode);
  return measurement !== undefined && Math.abs(measurement.width - computedWidth) <= 1 / 64
    ? measurement.width
    : undefined;
}

/**
 * Attaches a Yoga MeasureFunction to a text node. Phase C: greedy-wrap using
 * the pre-computed HarfBuzz+UAX#14 shaped segments from the WeakMap cache.
 *
 * WASM Safety Rule: the callback must NEVER return undefined, NaN, or negative
 * values. Doing so causes the yoga-wasm-web C++ binary to either silently
 * produce corrupt layouts or throw an unrecoverable RuntimeError.
 */
export function attachMeasureFunction(
  yogaNode: YogaNode,
  astNode: PaperText,
  slideWidth?: number,
): void {
  yogaNode.setMeasureFunc(
    (
      maxWidth: number,
      widthMode: MeasureMode,
      _maxHeight: number,
      _heightMode: MeasureMode,
    ) => {
      try {
        const rawConstraint =
          widthMode === MEASURE_MODE_EXACTLY || widthMode === MEASURE_MODE_AT_MOST
            ? maxWidth
            : slideWidth;
        // Constraint reduction: tightens the available width so that lines wrap
        // slightly earlier. This pairs with segmentCache's width inflation factors:
        //   segmentCache: SUBSTITUTION_WIDTH_FACTOR (1.05), BOLD_WIDTH_FACTOR (1.05)
        //   measureBridge: constraint × 0.98 (substituted) or × 0.995 (native)
        // Native fonts: HarfBuzz-vs-PowerPoint divergence ~0.5%.
        // Substituted fonts: ~2% divergence (segmentCache already adds 5% width).
        const textStyle = astNode.style as TextStyle | undefined;
        const fontFamily = textStyle?.fontFamily ?? "Arial";
        const safetyFactor = isSubstitutedFont(fontFamily) ? 0.98 : 0.995;
        const constraintWidth = rawConstraint !== undefined
          ? rawConstraint * safetyFactor
          : undefined;

        // Lazily compute if precomputeShapedSegments wasn't called before Yoga
        // (e.g. when attachMeasureFunction is used directly in tests or tools).
        let shapedRuns = getCachedShapedRuns(astNode);
        if (!shapedRuns) {
          precomputeShapedSegments(astNode);
          shapedRuns = getCachedShapedRuns(astNode);
        }
        if (!shapedRuns || shapedRuns.length === 0) {
          intrinsicSingleLineMeasurements.delete(astNode);
          return { width: 0, height: 0 };
        }

        // Phase C: greedy line-wrap over all shaped segments.
        // Resolve TextStyle.lineHeight using the same CSS-like semantics as the
        // renderers: values below 4 are multipliers, larger values are pixels.
        // This keeps Yoga allocation aligned with OOXML serialization.
        const lineHeightOverride = textStyle?.lineHeight;
        let maxLineHeight = 0;
        const allSegments: Array<{ pixelWidth: number; mandatory: boolean; isSpace: boolean; lineHeight: number }> = [];
        for (const run of shapedRuns) {
          const effectiveLh = resolveLineHeightPixels(
            lineHeightOverride,
            textStyle?.fontSize ?? 16,
            run.lineHeight,
          );
          if (effectiveLh > maxLineHeight) maxLineHeight = effectiveLh;
          for (const seg of run.segments) {
            allSegments.push({ ...seg, lineHeight: effectiveLh });
          }
        }

        const textAlign = textStyle?.textAlign;
        const kpResult = constraintWidth !== undefined
          ? knuthPlassLineBreak(allSegments, constraintWidth, { textAlign })
          : { lineCount: 1, maxLineWidth: allSegments.reduce((s, seg) => s + seg.pixelWidth, 0), totalHeight: maxLineHeight };

        const intrinsicWidth = addIntrinsicSingleLineWidthSlack(kpResult.maxLineWidth);
        const isSingleLineShrinkWrapped = widthMode !== MEASURE_MODE_EXACTLY
          && kpResult.lineCount === 1
          && (constraintWidth === undefined || intrinsicWidth <= constraintWidth);

        if (isSingleLineShrinkWrapped) {
          intrinsicSingleLineMeasurements.set(astNode, { width: intrinsicWidth });
        } else {
          intrinsicSingleLineMeasurements.delete(astNode);
        }

        return {
          width: Math.max(0, isSingleLineShrinkWrapped ? intrinsicWidth : kpResult.maxLineWidth),
          height: Math.max(0, kpResult.totalHeight),
        };
      } catch (e) {
        // WASM safety: never let any error propagate into Yoga's C++ layer.
        // Return maxWidth × fontSize fallback so Yoga allocates visible space
        // rather than collapsing the node to zero (which corrupts layout).
        const fontSize = (astNode.style as TextStyle | undefined)?.fontSize ?? 16;
        const fallbackWidth = maxWidth > 0 ? maxWidth : (slideWidth ?? fontSize * 10);
        const fallbackHeight = fontSize * 1.2;
        intrinsicSingleLineMeasurements.delete(astNode);
        getLogger().warn(`[measureBridge] Text measurement failed: ${(e as Error).message}. Using fallback ${Math.round(fallbackWidth)}×${Math.round(fallbackHeight)}.`);
        return { width: Math.max(0, fallbackWidth), height: Math.max(0, fallbackHeight) };
      }
    },
  );
}
