// src/interpreter/slideSplitter.ts — Content-aware elastic pagination
//
// Pre-processor that splits overflowing slides using a greedy forward-scan
// algorithm with paragraph-boundary preference and widow/orphan avoidance.
//
// Instead of the naive binary midpoint split, this packs paragraphs greedily
// onto slides until they're comfortably full, then creates continuation slides.

import type {
  PaperDocument,
  PaperSlide,
  PaperNode,
  PaperText,
  TextRun,
  Paragraph,
} from "../types/ast.js";
import { computeAutoFit } from "../typography/autoFit.js";
import { getLogger } from "../logger.js";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SlideSplitOptions {
  maxDepth?: number;     // Max recursion depth (default 10) — caps output at 2^maxDepth slides
  textWidth?: number;    // Content area width in px (default 800)
  textHeight?: number;   // Content area height in px (default 400)
}

const DEFAULT_MAX_DEPTH = 10;
/** Hard ceiling on maxDepth — 2^12 = 4096 slides per input slide, prevents OOM from malicious input. */
const MAX_ALLOWED_DEPTH = 12;
const DEFAULT_TEXT_WIDTH = 800;
const DEFAULT_TEXT_HEIGHT = 400;

// Packing criterion: content fits at this fontScale or higher (= comfortable fit).
// 100000 = 100% (no shrinking). This ensures each slide's content fits at full size.
const COMFORTABLE_FIT_THRESHOLD = 100000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * DFS to find the largest Text node in a slide's children tree.
 * "Largest" = most content (longest string, most runs, or most paragraphs).
 */
function findPrimaryTextBody(nodes: PaperNode[]): PaperText | null {
  let best: PaperText | null = null;
  let bestSize = 0;

  function visit(node: PaperNode): void {
    if (node.type === "Text") {
      const size = estimateTextSize(node);
      if (size > bestSize) {
        bestSize = size;
        best = node;
      }
    }
    if ("children" in node && node.children) {
      for (const child of node.children) {
        visit(child);
      }
    }
  }

  for (const node of nodes) {
    visit(node);
  }

  return best;
}

function estimateTextSize(text: PaperText): number {
  if (text.paragraphs && text.paragraphs.length > 0) {
    return text.paragraphs.reduce(
      (sum, p) => sum + p.runs.reduce((s, r) => s + r.text.length, 0),
      0,
    );
  }
  if (text.content) {
    if (typeof text.content === "string") return text.content.length;
    return text.content.reduce((s, r) => s + r.text.length, 0);
  }
  return 0;
}

/**
 * Check if a text node overflows the given dimensions using computeAutoFit.
 * Overflow = doesn't fit even at minimum font scale (25%).
 */
function textOverflows(
  textNode: PaperText,
  width: number,
  height: number,
): boolean {
  const content = textNode.paragraphs
    ? paragraphsToRuns(textNode.paragraphs)
    : textNode.content ?? "";
  const result = computeAutoFit(content, textNode.style, width, height);
  return result.overflow;
}

/**
 * Check if content fits comfortably (at full font size, no shrinking needed).
 */
function fitsComfortably(
  runs: string | TextRun[],
  style: PaperText["style"],
  width: number,
  height: number,
): boolean {
  const result = computeAutoFit(runs, style, width, height);
  return result.fontScale >= COMFORTABLE_FIT_THRESHOLD && !result.overflow;
}

function paragraphsToRuns(paragraphs: Paragraph[]): TextRun[] {
  const runs: TextRun[] = [];
  for (const p of paragraphs) {
    for (const r of p.runs) {
      runs.push(r);
    }
  }
  return runs;
}

/**
 * Find the title text node in a slide's children (first Text node with
 * large font size or in a known header position).
 */
function findTitleNode(nodes: PaperNode[]): PaperText | null {
  for (const node of nodes) {
    if (
      node.type === "Text" &&
      node.style &&
      (node.style.fontSize ?? 0) >= 18
    ) {
      return node;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Packing: find how many paragraphs fit on a slide
// ---------------------------------------------------------------------------

/**
 * Binary search for the maximum number of paragraphs (from startIdx)
 * that fit comfortably at full font size.
 *
 * Returns 0 if even a single paragraph doesn't fit comfortably.
 */
function findMaxFitParagraphs(
  paragraphs: Paragraph[],
  startIdx: number,
  style: PaperText["style"],
  width: number,
  height: number,
): number {
  const available = paragraphs.length - startIdx;
  if (available <= 0) return 0;

  // Quick check: does everything from startIdx fit?
  if (fitsComfortably(paragraphsToRuns(paragraphs.slice(startIdx)), style, width, height)) {
    return available;
  }

  // Binary search: find max k such that paragraphs[start..start+k] fits
  let lo = 0;
  let hi = available;

  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    const subset = paragraphs.slice(startIdx, startIdx + mid);
    if (fitsComfortably(paragraphsToRuns(subset), style, width, height)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return lo;
}

/**
 * Binary search for the maximum number of TextRuns (from startIdx)
 * that fit comfortably.
 */
function findMaxFitRuns(
  runs: TextRun[],
  startIdx: number,
  style: PaperText["style"],
  width: number,
  height: number,
): number {
  const available = runs.length - startIdx;
  if (available <= 0) return 0;

  if (fitsComfortably(runs.slice(startIdx), style, width, height)) {
    return available;
  }

  let lo = 0;
  let hi = available;

  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    const subset = runs.slice(startIdx, startIdx + mid);
    if (fitsComfortably(subset, style, width, height)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return lo;
}

// ---------------------------------------------------------------------------
// Slide cloning with replaced text body
// ---------------------------------------------------------------------------

function cloneSlideWithReplacedBody(
  slide: PaperSlide,
  original: PaperText,
  replacement: PaperText,
): PaperSlide {
  return {
    ...slide,
    children: replaceInNodes(slide.children, original, replacement),
  };
}

function replaceInNodes(
  nodes: PaperNode[],
  original: PaperText,
  replacement: PaperText,
): PaperNode[] {
  return nodes.map((node) => {
    if (node === original) return replacement;
    if ("children" in node && node.children) {
      return {
        ...node,
        children: replaceInNodes(node.children, original, replacement),
      } as PaperNode;
    }
    return node;
  });
}

function appendContToTitle(slide: PaperSlide): PaperSlide {
  const titleNode = findTitleNode(slide.children);
  if (!titleNode) return slide;

  const updatedTitle: PaperText = { ...titleNode };
  if (typeof updatedTitle.content === "string") {
    if (!updatedTitle.content.endsWith("(Cont.)")) {
      updatedTitle.content = updatedTitle.content + " (Cont.)";
    }
  } else if (Array.isArray(updatedTitle.content) && updatedTitle.content.length > 0) {
    const lastRun = updatedTitle.content[updatedTitle.content.length - 1];
    if (!lastRun.text.endsWith("(Cont.)")) {
      updatedTitle.content = [
        ...updatedTitle.content.slice(0, -1),
        { ...lastRun, text: lastRun.text + " (Cont.)" },
      ];
    }
  }

  return {
    ...slide,
    children: replaceInNodes(slide.children, titleNode, updatedTitle),
  };
}

// ---------------------------------------------------------------------------
// Core pagination: greedy forward-scan with widow/orphan avoidance
// ---------------------------------------------------------------------------

/**
 * Splits a slide using greedy forward-scan packing.
 * Packs paragraphs (or runs) onto each slide until they're comfortably full,
 * then creates continuation slides. Prefers paragraph boundaries and avoids
 * single-paragraph widow slides.
 */
function splitSlide(
  slide: PaperSlide,
  options: Required<SlideSplitOptions>,
): PaperSlide[] {
  const body = findPrimaryTextBody(slide.children);
  if (!body) return [slide];

  if (!textOverflows(body, options.textWidth, options.textHeight)) {
    return [slide];
  }

  const maxSlides = 2 ** options.maxDepth;

  // Paragraph-level splitting (preferred — cleanest breaks)
  if (body.paragraphs && body.paragraphs.length > 1) {
    return greedyParagraphSplit(slide, body, body.paragraphs, options, maxSlides);
  }

  // Run-level splitting
  if (Array.isArray(body.content) && body.content.length > 1) {
    return greedyRunSplit(slide, body, body.content as TextRun[], options, maxSlides);
  }

  // String splitting — word boundary approach (no paragraph structure)
  if (typeof body.content === "string") {
    return greedyStringSplit(slide, body, body.content, options, maxSlides);
  }

  return [slide];
}

function greedyParagraphSplit(
  slide: PaperSlide,
  body: PaperText,
  paragraphs: Paragraph[],
  options: Required<SlideSplitOptions>,
  maxSlides: number,
): PaperSlide[] {
  const slides: PaperSlide[] = [];
  let start = 0;

  while (start < paragraphs.length) {
    if (slides.length + 1 >= maxSlides) {
      // Max slides reached — put everything remaining on last slide
      const chunk = paragraphs.slice(start);
      const replacement: PaperText = { ...body, paragraphs: chunk };
      const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
      slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);
      start = paragraphs.length;
      break;
    }

    let fitCount = findMaxFitParagraphs(
      paragraphs, start, body.style, options.textWidth, options.textHeight,
    );

    // At least 1 paragraph per slide (even if it overflows → let auto-fit handle it)
    if (fitCount === 0) fitCount = 1;

    // Widow avoidance: if the remainder after this break would be a single
    // paragraph and we have enough on this slide, reduce by 1 to balance
    const remaining = paragraphs.length - (start + fitCount);
    if (remaining === 1 && fitCount > 1) {
      fitCount--;
    }

    const chunk = paragraphs.slice(start, start + fitCount);
    const replacement: PaperText = { ...body, paragraphs: chunk };
    const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
    slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);

    start += fitCount;
  }

  return slides;
}

function greedyRunSplit(
  slide: PaperSlide,
  body: PaperText,
  runs: TextRun[],
  options: Required<SlideSplitOptions>,
  maxSlides: number,
): PaperSlide[] {
  const slides: PaperSlide[] = [];
  let start = 0;

  while (start < runs.length) {
    if (slides.length + 1 >= maxSlides) {
      const chunk = runs.slice(start);
      const replacement: PaperText = { ...body, content: chunk };
      const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
      slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);
      start = runs.length;
      break;
    }

    let fitCount = findMaxFitRuns(
      runs, start, body.style, options.textWidth, options.textHeight,
    );

    if (fitCount === 0) fitCount = 1;

    const remaining = runs.length - (start + fitCount);
    if (remaining === 1 && fitCount > 1) {
      fitCount--;
    }

    const chunk = runs.slice(start, start + fitCount);
    const replacement: PaperText = { ...body, content: chunk };
    const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
    slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);

    start += fitCount;
  }

  return slides;
}

function greedyStringSplit(
  slide: PaperSlide,
  body: PaperText,
  text: string,
  options: Required<SlideSplitOptions>,
  maxSlides: number,
): PaperSlide[] {
  // Convert string to paragraphs by splitting on newlines for better break points
  const lines = text.split("\n");
  if (lines.length > 1) {
    const paragraphs: Paragraph[] = lines.map(line => ({
      runs: [{ text: line }],
    }));
    return greedyParagraphSplit(slide, body, paragraphs, options, maxSlides);
  }

  // Single line — try word-boundary splitting
  const words = text.split(/\s+/);
  if (words.length <= 1) return [slide];

  // Pack words greedily
  const slides: PaperSlide[] = [];
  let start = 0;

  while (start < words.length) {
    if (slides.length + 1 >= maxSlides) {
      const chunk = words.slice(start).join(" ");
      const replacement: PaperText = { ...body, content: chunk };
      const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
      slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);
      start = words.length;
      break;
    }

    // Binary search for max words that fit
    let lo = 0;
    let hi = words.length - start;

    while (lo < hi) {
      const mid = lo + Math.ceil((hi - lo) / 2);
      const chunk = words.slice(start, start + mid).join(" ");
      if (fitsComfortably(chunk, body.style, options.textWidth, options.textHeight)) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    let fitCount = lo;
    if (fitCount === 0) fitCount = 1;

    const remaining = words.length - (start + fitCount);
    if (remaining === 1 && fitCount > 1) {
      fitCount--;
    }

    const chunk = words.slice(start, start + fitCount).join(" ");
    const replacement: PaperText = { ...body, content: chunk };
    const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
    slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);

    start += fitCount;
  }

  return slides;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pre-processor that splits overflowing slides in a PaperDocument.
 *
 * For each slide, finds the primary text body and checks if it overflows
 * using computeAutoFit. If overflow is detected, uses a greedy forward-scan
 * algorithm to pack content onto slides at full font size, preferring
 * paragraph boundaries and avoiding single-paragraph widow slides.
 *
 * Continuation slides get "(Cont.)" appended to their title.
 *
 * @param doc - The PaperDocument to process
 * @param options - Optional configuration for split behavior
 * @returns A new PaperDocument with overflow slides split
 */
export function applyElasticPagination(
  doc: PaperDocument,
  options?: SlideSplitOptions,
): PaperDocument {
  const requestedDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (requestedDepth > MAX_ALLOWED_DEPTH) {
    getLogger().warn(
      `[pagination] maxDepth ${requestedDepth} exceeds ceiling of ${MAX_ALLOWED_DEPTH}; clamped to prevent resource exhaustion.`,
    );
  }
  const opts: Required<SlideSplitOptions> = {
    maxDepth: Math.max(0, Math.min(requestedDepth, MAX_ALLOWED_DEPTH)),
    textWidth: options?.textWidth ?? DEFAULT_TEXT_WIDTH,
    textHeight: options?.textHeight ?? DEFAULT_TEXT_HEIGHT,
  };

  const expandedSlides: PaperSlide[] = [];
  for (const slide of doc.slides) {
    expandedSlides.push(...splitSlide(slide, opts));
  }

  if (expandedSlides.length > doc.slides.length) {
    getLogger().metric?.("pagination.activated", expandedSlides.length - doc.slides.length, {
      originalSlides: String(doc.slides.length),
      expandedSlides: String(expandedSlides.length),
    });
  }

  return { ...doc, slides: expandedSlides };
}
