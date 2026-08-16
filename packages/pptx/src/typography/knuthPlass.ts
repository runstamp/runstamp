// src/typography/knuthPlass.ts — Knuth-Plass optimal line breaking algorithm
//
// Classical algorithm with glue (stretchable whitespace), fitness classes,
// tolerance, and adjustment ratios. Per-line height tracking for mixed-font paragraphs.

export interface KPSegment {
  pixelWidth: number;
  mandatory: boolean;    // true = forced break (e.g. \n)
  isSpace: boolean;      // true = whitespace (glue segment)
  isCjk?: boolean;       // true = CJK ideograph (inter-character micro-stretch)
  lineHeight: number;    // font-metric line height for this segment
}

export interface KPResult {
  lineCount: number;
  maxLineWidth: number;
  totalHeight: number;   // sum of per-line max heights
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINE_PENALTY = 10;
const TOLERANCE = 2;
const FITNESS_PENALTY = 100;
const INF_BADNESS = 10000;
const INF_DEMERITS = 1e18;

// ---------------------------------------------------------------------------
// Segment threshold — skip O(n²) DP for very large paragraphs
// ---------------------------------------------------------------------------

export class KnuthPlassConfig {
  private _segmentThreshold = 1000;

  setSegmentThreshold(threshold: number): void {
    this._segmentThreshold = Math.max(10, threshold);
  }

  getSegmentThreshold(): number {
    return this._segmentThreshold;
  }
}

import { getActiveContext } from "../contextStorage.js";

const defaultConfig = new KnuthPlassConfig();

// Module-level accessor for internal use (read by knuthPlassBreak)
let _segmentThreshold = 1000;

export function setKnuthPlassSegmentThreshold(threshold: number): void {
  const ctx = getActiveContext();
  const cfg = (ctx?.knuthPlass as KnuthPlassConfig | undefined) ?? defaultConfig;
  cfg.setSegmentThreshold(threshold);
  if (!ctx?.knuthPlass) _segmentThreshold = cfg.getSegmentThreshold();
}

export function getKnuthPlassSegmentThreshold(): number {
  const ctx = getActiveContext();
  const cfg = (ctx?.knuthPlass as KnuthPlassConfig | undefined);
  return cfg ? cfg.getSegmentThreshold() : defaultConfig.getSegmentThreshold();
}

// Fitness classes
const TIGHT = 0;
const NORMAL = 1;
const LOOSE = 2;
const VERY_LOOSE = 3;

// ---------------------------------------------------------------------------
// Active node for DP
// ---------------------------------------------------------------------------

interface ActiveNode {
  segIndex: number;         // break AFTER this segment (0-based), -1 = start
  totalWidth: number;       // cumulative width up to this point
  totalStretch: number;     // cumulative stretch
  totalShrink: number;      // cumulative shrink
  totalDemerits: number;
  fitnessClass: number;
  lineNumber: number;
  maxLineHeight: number;    // max lineHeight for current line
  totalHeight: number;      // sum of all completed line heights
  prev: ActiveNode | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fitnessClassFromRatio(r: number): number {
  if (r < -0.5) return TIGHT;
  if (r <= 0.5) return NORMAL;
  if (r <= 1.0) return LOOSE;
  return VERY_LOOSE;
}

function computeAdjustmentRatio(
  lineWidth: number,
  constraintWidth: number,
  lineStretch: number,
  lineShrink: number,
): number {
  const diff = constraintWidth - lineWidth;
  if (Math.abs(diff) < 0.01) return 0;
  if (diff > 0) {
    // Line is short — needs stretching
    return lineStretch > 0 ? diff / lineStretch : Infinity;
  }
  // Line is long — needs shrinking
  return lineShrink > 0 ? diff / lineShrink : -Infinity;
}

function computeBadness(r: number): number {
  if (!isFinite(r)) return INF_BADNESS;
  return Math.min(INF_BADNESS, Math.round(100 * Math.abs(r) ** 3));
}

// ---------------------------------------------------------------------------
// Main paragraph breaker (no mandatory breaks)
// ---------------------------------------------------------------------------

interface ParagraphLineInfo {
  width: number;
  maxHeight: number;
}

function breakParagraph(
  segments: KPSegment[],
  constraintWidth: number,
  isJustified: boolean,
): ParagraphLineInfo[] {
  const n = segments.length;
  if (n === 0) return [{ width: 0, maxHeight: 0 }];

  // Build prefix sums for O(1) range queries
  const cumWidth = new Float64Array(n + 1);
  const cumStretch = new Float64Array(n + 1);
  const cumShrink = new Float64Array(n + 1);

  for (let i = 0; i < n; i++) {
    const seg = segments[i];
    cumWidth[i + 1] = cumWidth[i] + seg.pixelWidth;
    if (seg.isSpace) {
      // Standard inter-word glue: generous stretch/shrink
      cumStretch[i + 1] = cumStretch[i] + seg.pixelWidth * 0.5;
      cumShrink[i + 1] = cumShrink[i] + seg.pixelWidth * 0.33;
    } else if (seg.isCjk) {
      // CJK inter-character micro-glue: CJK typography allows small adjustments
      // to spacing between ideographs (JIS X 4051 / W3C JLREQ §3.8.2).
      // Values are conservative: ~5% stretch, ~3% shrink per character.
      cumStretch[i + 1] = cumStretch[i] + seg.pixelWidth * 0.05;
      cumShrink[i + 1] = cumShrink[i] + seg.pixelWidth * 0.03;
    } else {
      cumStretch[i + 1] = cumStretch[i];
      cumShrink[i + 1] = cumShrink[i];
    }
  }

  const totalWidth = cumWidth[n];

  // Short-circuit: entire paragraph fits on one line
  if (totalWidth <= constraintWidth) {
    let maxH = 0;
    for (const seg of segments) {
      if (seg.lineHeight > maxH) maxH = seg.lineHeight;
    }
    return [{ width: totalWidth, maxHeight: maxH }];
  }

  // Skip O(n²) DP for paragraphs exceeding the segment threshold
  const ctxKP = getActiveContext()?.knuthPlass as KnuthPlassConfig | undefined;
  const effectiveThreshold = ctxKP ? ctxKP.getSegmentThreshold() : _segmentThreshold;
  if (n > effectiveThreshold) {
    return greedyBreak(segments, constraintWidth);
  }

  // Active node list — tracks feasible break candidates
  const startNode: ActiveNode = {
    segIndex: -1,
    totalWidth: 0,
    totalStretch: 0,
    totalShrink: 0,
    totalDemerits: 0,
    fitnessClass: NORMAL,
    lineNumber: 0,
    maxLineHeight: 0,
    totalHeight: 0,
    prev: null,
  };

  let activeNodes: ActiveNode[] = [startNode];
  const bestAtPos = new Map<number, ActiveNode>();

  // Effective tolerance: ragged text accepts all break positions (only demerits
  // penalize bad breaks). Justified text requires lines to be stretchable to
  // fill the full width, so tolerance limits the acceptable adjustment ratio.
  const effectiveTolerance = isJustified ? TOLERANCE : Infinity;

  for (let i = 0; i < n; i++) {
    const widthAfterI = cumWidth[i + 1];
    const stretchAfterI = cumStretch[i + 1];
    const shrinkAfterI = cumShrink[i + 1];
    const isLast = i === n - 1;

    let bestNode: ActiveNode | null = null;
    let bestDemerits = INF_DEMERITS;
    let bestFitness = NORMAL;

    const surviving: ActiveNode[] = [];

    for (const active of activeNodes) {
      const lineWidth = widthAfterI - active.totalWidth;
      const lineStretch = stretchAfterI - active.totalStretch;
      const lineShrink = shrinkAfterI - active.totalShrink;

      // Prune: if even maximum stretch can't help, remove this node
      if (lineWidth - lineShrink > constraintWidth * 1.5) {
        continue;
      }
      surviving.push(active);

      let r: number;
      let badness: number;

      if (isLast) {
        r = computeAdjustmentRatio(lineWidth, constraintWidth, lineStretch, lineShrink);
        if (r >= -1) {
          // Last line: fits directly or can shrink to fit — no penalty
          // (standard Knuth-Plass: last line is never penalized for shortness)
          badness = 0;
        } else {
          // Truly overfull: can't shrink enough to fit
          badness = INF_BADNESS;
        }
      } else {
        r = computeAdjustmentRatio(lineWidth, constraintWidth, lineStretch, lineShrink);

        // Reject impossible breaks
        if (r < -1) continue;
        if (r > effectiveTolerance) continue;

        if (!isJustified && lineWidth <= constraintWidth) {
          // Ragged mode: mild penalty for underfull lines based on fraction of
          // empty space.  A full line (shortness=0) → badness=0; a half-full
          // line (shortness=0.5) → badness=25; nearly empty → badness≈81.
          // This ensures wrapping within the constraint is always preferred
          // over an overfull single line (INF_BADNESS=10000).
          const shortness = (constraintWidth - lineWidth) / constraintWidth;
          badness = Math.round(100 * shortness * shortness);
        } else {
          badness = computeBadness(r);
        }
      }

      const fitness = fitnessClassFromRatio(r);
      let fitnessDem = 0;
      if (Math.abs(fitness - active.fitnessClass) > 1) {
        fitnessDem = FITNESS_PENALTY;
      }

      const demerits = active.totalDemerits + (LINE_PENALTY + badness) ** 2 + fitnessDem;

      if (demerits < bestDemerits) {
        bestDemerits = demerits;
        bestNode = active;
        bestFitness = fitness;
      }
    }

    activeNodes = surviving;

    if (bestNode !== null) {
      // Compute max line height for this line's segments
      const lineStartIdx = bestNode.segIndex + 1;
      let maxH = 0;
      for (let j = lineStartIdx; j <= i; j++) {
        if (segments[j].lineHeight > maxH) maxH = segments[j].lineHeight;
      }

      const newNode: ActiveNode = {
        segIndex: i,
        totalWidth: widthAfterI,
        totalStretch: stretchAfterI,
        totalShrink: shrinkAfterI,
        totalDemerits: bestDemerits,
        fitnessClass: bestFitness,
        lineNumber: bestNode.lineNumber + 1,
        maxLineHeight: maxH,
        totalHeight: bestNode.totalHeight + maxH,
        prev: bestNode,
      };

      const existing = bestAtPos.get(i);
      if (!existing || bestDemerits < existing.totalDemerits) {
        bestAtPos.set(i, newNode);
        if (existing) {
          const idx = activeNodes.indexOf(existing);
          if (idx !== -1) activeNodes[idx] = newNode;
          else activeNodes.push(newNode);
        } else {
          activeNodes.push(newNode);
        }
      }
    }
  }

  // Find best final node (must include all segments)
  let bestFinal: ActiveNode | null = null;
  let bestFinalDemerits = INF_DEMERITS;

  for (const active of activeNodes) {
    if (active.segIndex === n - 1) {
      if (active.totalDemerits < bestFinalDemerits) {
        bestFinalDemerits = active.totalDemerits;
        bestFinal = active;
      }
    }
  }

  // Fallback to greedy if DP found no solution
  if (!bestFinal) {
    return greedyBreak(segments, constraintWidth);
  }

  // Trace back to extract line info
  const breakpoints: ActiveNode[] = [];
  let node: ActiveNode | null = bestFinal;
  while (node && node.segIndex >= 0) {
    breakpoints.push(node);
    node = node.prev;
  }
  breakpoints.reverse();

  let prevEnd = 0;
  const lines: ParagraphLineInfo[] = [];
  for (const bp of breakpoints) {
    const lineWidth = cumWidth[bp.segIndex + 1] - cumWidth[prevEnd];
    // Compute per-line max height
    let maxH = 0;
    for (let j = prevEnd; j <= bp.segIndex; j++) {
      if (segments[j].lineHeight > maxH) maxH = segments[j].lineHeight;
    }
    lines.push({ width: lineWidth, maxHeight: maxH });
    prevEnd = bp.segIndex + 1;
  }

  // Safety: remaining segments
  if (prevEnd < n) {
    const w = cumWidth[n] - cumWidth[prevEnd];
    let maxH = 0;
    for (let j = prevEnd; j < n; j++) {
      if (segments[j].lineHeight > maxH) maxH = segments[j].lineHeight;
    }
    lines.push({ width: w, maxHeight: maxH });
  }

  return lines;
}

/**
 * Greedy fallback: simple first-fit line breaking with per-line heights.
 */
function greedyBreak(segments: KPSegment[], constraintWidth: number): ParagraphLineInfo[] {
  const lines: ParagraphLineInfo[] = [];
  let currentWidth = 0;
  let currentMaxH = 0;

  for (const seg of segments) {
    if (currentWidth + seg.pixelWidth > constraintWidth && currentWidth > 0) {
      lines.push({ width: currentWidth, maxHeight: currentMaxH });
      currentWidth = seg.pixelWidth;
      currentMaxH = seg.lineHeight;
    } else {
      currentWidth += seg.pixelWidth;
      if (seg.lineHeight > currentMaxH) currentMaxH = seg.lineHeight;
    }
  }
  lines.push({ width: currentWidth, maxHeight: currentMaxH });
  return lines;
}

/**
 * Knuth-Plass optimal line breaking with glue model, fitness classes,
 * and per-line height tracking.
 *
 * Splits segments at mandatory breaks into independent paragraphs,
 * then applies DP-based optimal breaking to each.
 *
 * @param segments - Array of segments with pixel widths, mandatory break flags,
 *                   space indicators, and line heights
 * @param constraintWidth - Available width for each line
 * @param options - Text alignment for badness computation
 * @returns lineCount, maxLineWidth, and totalHeight across all paragraphs
 */
export function knuthPlassLineBreak(
  segments: KPSegment[],
  constraintWidth: number,
  options?: { textAlign?: "left" | "center" | "right" | "justify" },
): KPResult {
  if (segments.length === 0) {
    return { lineCount: 1, maxLineWidth: 0, totalHeight: 0 };
  }

  const isJustified = options?.textAlign === "justify";

  // Split into paragraphs at mandatory breaks
  const paragraphs: KPSegment[][] = [];
  let currentParagraph: KPSegment[] = [];

  for (const seg of segments) {
    if (seg.mandatory) {
      // Mandatory break segment ends the current paragraph
      paragraphs.push(currentParagraph);
      currentParagraph = [];
    } else {
      currentParagraph.push(seg);
    }
  }
  paragraphs.push(currentParagraph);

  let totalLines = 0;
  let maxLineWidth = 0;
  let totalHeight = 0;
  // Track the last known line height for empty paragraph fallback
  let lastKnownLineHeight = 0;

  for (const para of paragraphs) {
    if (para.length === 0) {
      // Empty paragraph = blank line. Use last known line height so blank
      // lines consume the same vertical space as surrounding text.
      // Falls back to 0 only if no prior segment has been seen (degenerate input).
      totalLines++;
      totalHeight += lastKnownLineHeight;
      continue;
    }

    const lineInfos = breakParagraph(para, constraintWidth, isJustified);
    totalLines += lineInfos.length;
    for (const info of lineInfos) {
      if (info.width > maxLineWidth) maxLineWidth = info.width;
      totalHeight += info.maxHeight;
      if (info.maxHeight > 0) lastKnownLineHeight = info.maxHeight;
    }
  }

  if (totalLines === 0) totalLines = 1;

  return { lineCount: totalLines, maxLineWidth, totalHeight };
}
