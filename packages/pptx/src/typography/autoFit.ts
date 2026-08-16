// src/typography/autoFit.ts — Shrink-to-fit measurement loop (binary search)

import type { TextRun, TextStyle } from "../types/ast.js";
import { calculateRichTextMetrics } from "./richMetrics.js";

export interface AutoFitResult {
  fontScale: number;     // 25000–100000 (percentage * 1000)
  lnSpcReduction: number; // 0–20000 (percentage points * 1000)
  overflow: boolean;     // true when text doesn't fit at minimum scale
  measuredHeight?: number;
  lineCount?: number;
}

/**
 * Normalizes string content to TextRun[] for uniform processing.
 */
function normalizeRuns(content: string | TextRun[]): TextRun[] {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  return content;
}

/**
 * Measures text at a given scale, returning whether it fits.
 */
function measureAtScale(
  runs: TextRun[],
  defaultStyle: TextStyle | undefined,
  fontScale: number,     // 25000–100000
  containerWidth: number,
  containerHeight: number,
  maxLines?: number,
): boolean {
  const scaleFactor = fontScale / 100000;
  const scaledStyle: TextStyle | undefined = defaultStyle
    ? { ...defaultStyle, fontSize: (defaultStyle.fontSize ?? 16) * scaleFactor }
    : undefined;

  const scaledRuns = runs.map((r) => ({
    ...r,
    style: r.style
      ? { ...r.style, fontSize: (r.style.fontSize ?? (defaultStyle?.fontSize ?? 16)) * scaleFactor }
      : undefined,
  }));

  const metrics = calculateRichTextMetrics(scaledRuns, scaledStyle, containerWidth);
  return (
    metrics.height <= containerHeight &&
    metrics.maxLineWidth <= containerWidth &&
    (maxLines === undefined || metrics.lineCount <= maxLines)
  );
}

function metricsAtScale(
  runs: TextRun[],
  defaultStyle: TextStyle | undefined,
  fontScale: number,
  containerWidth: number,
): { height: number; lineCount: number } {
  const scaleFactor = fontScale / 100000;
  const scaledStyle: TextStyle | undefined = defaultStyle
    ? { ...defaultStyle, fontSize: (defaultStyle.fontSize ?? 16) * scaleFactor }
    : undefined;
  const scaledRuns = runs.map((r) => ({
    ...r,
    style: r.style
      ? { ...r.style, fontSize: (r.style.fontSize ?? (defaultStyle?.fontSize ?? 16)) * scaleFactor }
      : undefined,
  }));
  const metrics = calculateRichTextMetrics(scaledRuns, scaledStyle, containerWidth);
  return {
    height: metrics.height,
    lineCount: metrics.lineCount,
  };
}

const DEFAULT_MIN_FONT_SCALE = 25000;
const DEFAULT_MAX_LN_SPC_REDUCTION = 20000;
const DEFAULT_FONT_SCALE_STEP = 2500;
const DEFAULT_LN_SPC_STEP = 5000;

export interface AutoFitOptions {
  minFontScale?: number;       // default 25000 (25%)
  maxLnSpcReduction?: number;  // default 20000 (20 percentage points)
  fontScaleStep?: number;      // default 2500 (2.5%)
  lnSpcStep?: number;          // default 5000 (5 percentage points)
  maxLines?: number;
}

/** Apply the authored text-fit floor and max-line contract consistently across validation and rendering. */
export function computePolicyAutoFit(
  content: string | TextRun[],
  defaultStyle: TextStyle | undefined,
  containerWidth: number,
  containerHeight: number,
): AutoFitResult {
  const policy = defaultStyle?.textFit?.policy;
  const baseFontSize = defaultStyle?.fontSize ?? 16;
  const minFontSize = defaultStyle?.textFit?.minFontSize;
  const minFontScale = minFontSize === undefined
    ? undefined
    : Math.max(1000, Math.min(100000, Math.round((minFontSize / baseFontSize) * 100000)));
  const widthSafetyFactor = policy === "fitFontSize" ? 0.84 : 1;
  return computeAutoFit(
    content,
    defaultStyle,
    containerWidth * widthSafetyFactor,
    containerHeight,
    {
      ...(minFontScale === undefined ? {} : { minFontScale }),
      maxLines: defaultStyle?.textFit?.maxLines,
    },
  );
}

/**
 * Checks if text fits at the given fontScale with any line spacing reduction (0→max).
 */
function fitsAtAnyLnSpc(
  runs: TextRun[],
  defaultStyle: TextStyle | undefined,
  fontScale: number,
  containerWidth: number,
  containerHeight: number,
  maxLnSpc: number,
  lnSpcStep: number,
  maxLines?: number,
): boolean {
  if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, containerHeight, maxLines)) {
    return true;
  }
  for (let lnSpc = lnSpcStep; lnSpc <= maxLnSpc; lnSpc += lnSpcStep) {
    const adjustedHeight = containerHeight * (1 + lnSpc / 100000);
    if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, adjustedHeight, maxLines)) {
      return true;
    }
  }
  return false;
}

/**
 * Finds the minimum lnSpcReduction that fits at the given fontScale.
 * Returns 0 if it fits without any line spacing reduction.
 */
function findMinLnSpc(
  runs: TextRun[],
  defaultStyle: TextStyle | undefined,
  fontScale: number,
  containerWidth: number,
  containerHeight: number,
  maxLnSpc: number,
  lnSpcStep: number,
  maxLines?: number,
): number {
  if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, containerHeight, maxLines)) {
    return 0;
  }
  for (let lnSpc = lnSpcStep; lnSpc <= maxLnSpc; lnSpc += lnSpcStep) {
    const adjustedHeight = containerHeight * (1 + lnSpc / 100000);
    if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, adjustedHeight, maxLines)) {
      return lnSpc;
    }
  }
  return maxLnSpc;
}

/**
 * Computes auto-fit parameters to shrink text into a container.
 *
 * Algorithm (binary search):
 * 1. Fast path: fits at 100% with lnSpc=0 → return immediately
 * 2. Try lnSpc reduction at full size (0→20000, step 5000)
 * 3. Check if even MIN_FONT_SCALE fits (early overflow exit)
 * 4. Binary search: lo=MIN_FONT_SCALE, hi=100000-FONT_SCALE_STEP
 *    - At each probe, check fitsAtAnyLnSpc(mid)
 *    - If fits: lo=mid; else hi=mid-FONT_SCALE_STEP
 * 5. At final fontScale, find minimum lnSpc via linear scan (5 values max)
 *
 * Output contract: fontScale always multiple of FONT_SCALE_STEP (2500),
 * lnSpcReduction always multiple of LN_SPC_STEP (5000).
 * Priority: maximize fontScale first, then minimize lnSpcReduction.
 *
 * Worst case: ~30 measureAtScale calls (down from ~160 in linear scan).
 */
export function computeAutoFit(
  content: string | TextRun[],
  defaultStyle: TextStyle | undefined,
  containerWidth: number,
  containerHeight: number,
  options?: AutoFitOptions,
): AutoFitResult {
  const MIN_FONT_SCALE = options?.minFontScale ?? DEFAULT_MIN_FONT_SCALE;
  const MAX_LN_SPC_REDUCTION = options?.maxLnSpcReduction ?? DEFAULT_MAX_LN_SPC_REDUCTION;
  const FONT_SCALE_STEP = options?.fontScaleStep ?? DEFAULT_FONT_SCALE_STEP;
  const LN_SPC_STEP = options?.lnSpcStep ?? DEFAULT_LN_SPC_STEP;
  const maxLines = options?.maxLines;

  const runs = normalizeRuns(content);

  // Fast path: fits at 100% with no line spacing reduction
  if (measureAtScale(runs, defaultStyle, 100000, containerWidth, containerHeight, maxLines)) {
    return { fontScale: 100000, lnSpcReduction: 0, overflow: false, ...metricsAtScale(runs, defaultStyle, 100000, containerWidth) };
  }

  // Try reducing line spacing at full font scale
  for (let lnSpc = LN_SPC_STEP; lnSpc <= MAX_LN_SPC_REDUCTION; lnSpc += LN_SPC_STEP) {
    const adjustedHeight = containerHeight * (1 + lnSpc / 100000);
    if (measureAtScale(runs, defaultStyle, 100000, containerWidth, adjustedHeight, maxLines)) {
      return { fontScale: 100000, lnSpcReduction: lnSpc, overflow: false, ...metricsAtScale(runs, defaultStyle, 100000, containerWidth) };
    }
  }

  // Check if even minimum scale fits (early overflow exit)
  if (!fitsAtAnyLnSpc(runs, defaultStyle, MIN_FONT_SCALE, containerWidth, containerHeight, MAX_LN_SPC_REDUCTION, LN_SPC_STEP, maxLines)) {
    return { fontScale: MIN_FONT_SCALE, lnSpcReduction: MAX_LN_SPC_REDUCTION, overflow: true, ...metricsAtScale(runs, defaultStyle, MIN_FONT_SCALE, containerWidth) };
  }

  // Binary search for the largest fontScale that fits (with any lnSpc)
  let lo = MIN_FONT_SCALE;
  let hi = 100000 - FONT_SCALE_STEP;

  while (lo < hi) {
    // Snap midpoint to FONT_SCALE_STEP grid
    const mid = lo + Math.ceil((hi - lo) / FONT_SCALE_STEP / 2) * FONT_SCALE_STEP;

    if (fitsAtAnyLnSpc(runs, defaultStyle, mid, containerWidth, containerHeight, MAX_LN_SPC_REDUCTION, LN_SPC_STEP, maxLines)) {
      lo = mid;
    } else {
      hi = mid - FONT_SCALE_STEP;
    }
  }

  const fontScale = lo;

  // Find minimum lnSpc at the final fontScale (linear scan, max 5 iterations)
  const lnSpcReduction = findMinLnSpc(runs, defaultStyle, fontScale, containerWidth, containerHeight, MAX_LN_SPC_REDUCTION, LN_SPC_STEP, maxLines);

  return { fontScale, lnSpcReduction, overflow: false, ...metricsAtScale(runs, defaultStyle, fontScale, containerWidth) };
}
