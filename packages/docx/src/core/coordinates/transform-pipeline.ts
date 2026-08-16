/**
 * Coordinate Transformation Pipeline
 * ===================================
 *
 * This module implements the transformation pipeline:
 *
 *   VLT (CSS pixels) → Normalized (0-1) → Target Format (inches/twips/EMU)
 *
 * Design Principles:
 * 1. SINGLE TRANSFORMATION POINT: Page dimensions are only used in vltToNormalized()
 * 2. NO DOUBLE CONVERSIONS: Each step does exactly one transformation
 * 3. VALIDATION BETWEEN STEPS: Invalid coordinates are caught before they propagate
 * 4. REVERSIBLE: Transformations can be reversed for debugging
 */

import type { Rect, PageDimensions } from '../types';
import type { NormalizedRect } from './normalized-rect';
import { createNormalizedRect, createNormalizedRectUnsafe } from './normalized-rect';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Standard DPI for CSS pixels
 */
export const PIXELS_PER_INCH = 96;

/**
 * Twips per inch (for DOCX)
 */
export const TWIPS_PER_INCH = 1440;

/**
 * EMU per inch (for PPTX raw XML)
 */
export const EMU_PER_INCH = 914400;

/**
 * Default slide dimensions (16:9)
 */
export const DEFAULT_SLIDE_WIDTH_INCHES = 10;
export const DEFAULT_SLIDE_HEIGHT_INCHES = 5.625;

/**
 * Default page dimensions (Letter)
 */
export const DEFAULT_PAGE_WIDTH_INCHES = 8.5;
export const DEFAULT_PAGE_HEIGHT_INCHES = 11;

// =============================================================================
// VLT TO NORMALIZED
// =============================================================================

/**
 * Configuration for VLT to Normalized transformation
 */
export interface VLTToNormalizedConfig {
  /**
   * Whether to clamp values to [0, 1] range.
   * Default: false (allows overflow detection)
   */
  clamp?: boolean;

  /**
   * Whether to throw on invalid input (NaN, Infinity).
   * Default: true
   */
  strict?: boolean;
}

/**
 * Transform VLT pixel coordinates to normalized (0-1) coordinates.
 *
 * This is the ONLY function that should use page dimensions.
 * After this point, all coordinates are format-agnostic.
 *
 * @param rect - Rectangle in CSS pixels
 * @param pageDimensions - Page dimensions in CSS pixels
 * @param config - Optional configuration
 * @returns NormalizedRect with values as fractions of page dimensions
 *
 * @example
 * const rect = { x: 36, y: 0, width: 444, height: 22 };
 * const pageDims = { width: 960, height: 540, margin: { top: 36, right: 36, bottom: 36, left: 36 } };
 * const normalized = vltToNormalized(rect, pageDims);
 * // normalized = { nx: 0.0375, ny: 0, nw: 0.4625, nh: 0.0407 }
 */
export function vltToNormalized(
  rect: Rect,
  pageDimensions: PageDimensions,
  config?: VLTToNormalizedConfig
): NormalizedRect {
  const strict = config?.strict ?? true;
  const clamp = config?.clamp ?? false;

  // Validate inputs
  if (strict) {
    if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
        !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) {
      throw new Error(
        `Invalid rect values: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`
      );
    }
    if (pageDimensions.width <= 0 || pageDimensions.height <= 0) {
      throw new Error(
        `Invalid page dimensions: width=${pageDimensions.width}, height=${pageDimensions.height}`
      );
    }
  }

  // Safe division (avoid division by zero)
  const safeWidth = Math.max(1, pageDimensions.width);
  const safeHeight = Math.max(1, pageDimensions.height);

  // Transform to normalized coordinates
  let nx = rect.x / safeWidth;
  let ny = rect.y / safeHeight;
  let nw = rect.width / safeWidth;
  let nh = rect.height / safeHeight;

  // Optional clamping
  if (clamp) {
    nx = Math.max(0, Math.min(1, nx));
    ny = Math.max(0, Math.min(1, ny));
    nw = Math.max(0, Math.min(1 - nx, nw));
    nh = Math.max(0, Math.min(1 - ny, nh));
  }

  return strict
    ? createNormalizedRect(nx, ny, nw, nh)
    : createNormalizedRectUnsafe(nx, ny, nw, nh);
}

/**
 * Batch transform multiple rects (more efficient for large documents)
 */
export function vltToNormalizedBatch(
  rects: Rect[],
  pageDimensions: PageDimensions,
  config?: VLTToNormalizedConfig
): NormalizedRect[] {
  const strict = config?.strict ?? true;
  const clamp = config?.clamp ?? false;

  // Validate page dimensions once
  if (strict && (pageDimensions.width <= 0 || pageDimensions.height <= 0)) {
    throw new Error(
      `Invalid page dimensions: width=${pageDimensions.width}, height=${pageDimensions.height}`
    );
  }

  const safeWidth = Math.max(1, pageDimensions.width);
  const safeHeight = Math.max(1, pageDimensions.height);

  const results: NormalizedRect[] = new Array(rects.length);

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];

    if (strict && (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
        !Number.isFinite(rect.width) || !Number.isFinite(rect.height))) {
      throw new Error(
        `Invalid rect at index ${i}: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`
      );
    }

    let nx = rect.x / safeWidth;
    let ny = rect.y / safeHeight;
    let nw = rect.width / safeWidth;
    let nh = rect.height / safeHeight;

    if (clamp) {
      nx = Math.max(0, Math.min(1, nx));
      ny = Math.max(0, Math.min(1, ny));
      nw = Math.max(0, Math.min(1 - nx, nw));
      nh = Math.max(0, Math.min(1 - ny, nh));
    }

    results[i] = createNormalizedRectUnsafe(nx, ny, nw, nh);
  }

  return results;
}

// =============================================================================
// NORMALIZED TO VLT (REVERSE TRANSFORMATION)
// =============================================================================

/**
 * Transform normalized coordinates back to VLT pixels.
 * Useful for debugging and round-trip verification.
 */
export function normalizedToVLT(
  normalized: NormalizedRect,
  pageDimensions: PageDimensions
): Rect {
  return {
    x: normalized.nx * pageDimensions.width,
    y: normalized.ny * pageDimensions.height,
    width: normalized.nw * pageDimensions.width,
    height: normalized.nh * pageDimensions.height,
  };
}

// =============================================================================
// NORMALIZED TO PPTX INCHES
// =============================================================================

/**
 * Rectangle in PPTX inches
 */
export interface PPTXRect {
  /** X position in inches from slide left edge */
  x: number;
  /** Y position in inches from slide top edge */
  y: number;
  /** Width in inches */
  w: number;
  /** Height in inches */
  h: number;
}

/**
 * Transform normalized coordinates to PPTX inches.
 *
 * @param normalized - Normalized rectangle (0-1)
 * @param slideWidth - Slide width in inches (default: 10)
 * @param slideHeight - Slide height in inches (default: 5.625)
 * @returns Rectangle in inches for pptxgenjs
 *
 * @example
 * const normalized = { nx: 0.0375, ny: 0.1852, nw: 0.4625, nh: 0.0407 };
 * const inches = normalizedToPPTXInches(normalized, 10, 5.625);
 * // inches = { x: 0.375, y: 1.042, w: 4.625, h: 0.229 }
 */
export function normalizedToPPTXInches(
  normalized: NormalizedRect,
  slideWidth: number = DEFAULT_SLIDE_WIDTH_INCHES,
  slideHeight: number = DEFAULT_SLIDE_HEIGHT_INCHES
): PPTXRect {
  return {
    x: normalized.nx * slideWidth,
    y: normalized.ny * slideHeight,
    w: normalized.nw * slideWidth,
    h: normalized.nh * slideHeight,
  };
}

/**
 * Transform normalized coordinates to EMU (English Metric Units).
 * EMU is used in raw PPTX XML. 914400 EMU = 1 inch.
 */
export function normalizedToEMU(
  normalized: NormalizedRect,
  slideWidth: number = DEFAULT_SLIDE_WIDTH_INCHES,
  slideHeight: number = DEFAULT_SLIDE_HEIGHT_INCHES
): { x: number; y: number; cx: number; cy: number } {
  const inches = normalizedToPPTXInches(normalized, slideWidth, slideHeight);
  return {
    x: Math.round(inches.x * EMU_PER_INCH),
    y: Math.round(inches.y * EMU_PER_INCH),
    cx: Math.round(inches.w * EMU_PER_INCH),
    cy: Math.round(inches.h * EMU_PER_INCH),
  };
}

// =============================================================================
// NORMALIZED TO DOCX TWIPS
// =============================================================================

/**
 * Rectangle in DOCX twips
 */
export interface DOCXRect {
  /** X position in twips (mostly ignored in flow documents) */
  x: number;
  /** Y position in twips (ignored in flow documents) */
  y: number;
  /** Width in twips */
  w: number;
  /** Height in twips */
  h: number;
}

/**
 * Transform normalized coordinates to DOCX twips.
 * Note: DOCX is a flow document format, so Y coordinates are typically ignored.
 *
 * @param normalized - Normalized rectangle (0-1)
 * @param pageWidth - Page width in inches (default: 8.5)
 * @param pageHeight - Page height in inches (default: 11)
 * @returns Rectangle in twips
 */
export function normalizedToDOCXTwips(
  normalized: NormalizedRect,
  pageWidth: number = DEFAULT_PAGE_WIDTH_INCHES,
  pageHeight: number = DEFAULT_PAGE_HEIGHT_INCHES
): DOCXRect {
  return {
    x: Math.round(normalized.nx * pageWidth * TWIPS_PER_INCH),
    y: Math.round(normalized.ny * pageHeight * TWIPS_PER_INCH),
    w: Math.round(normalized.nw * pageWidth * TWIPS_PER_INCH),
    h: Math.round(normalized.nh * pageHeight * TWIPS_PER_INCH),
  };
}

// =============================================================================
// DIRECT CONVERSIONS (CONVENIENCE)
// =============================================================================

/**
 * Direct conversion from VLT pixels to PPTX inches.
 * Combines vltToNormalized + normalizedToPPTXInches for convenience.
 */
export function vltToPPTXInches(
  rect: Rect,
  pageDimensions: PageDimensions,
  slideWidth: number = DEFAULT_SLIDE_WIDTH_INCHES,
  slideHeight: number = DEFAULT_SLIDE_HEIGHT_INCHES
): PPTXRect {
  const normalized = vltToNormalized(rect, pageDimensions);
  return normalizedToPPTXInches(normalized, slideWidth, slideHeight);
}

/**
 * Direct conversion from VLT pixels to EMU.
 */
export function vltToEMU(
  rect: Rect,
  pageDimensions: PageDimensions,
  slideWidth: number = DEFAULT_SLIDE_WIDTH_INCHES,
  slideHeight: number = DEFAULT_SLIDE_HEIGHT_INCHES
): { x: number; y: number; cx: number; cy: number } {
  const normalized = vltToNormalized(rect, pageDimensions);
  return normalizedToEMU(normalized, slideWidth, slideHeight);
}

/**
 * Direct conversion from VLT pixels to DOCX twips.
 */
export function vltToDOCXTwips(
  rect: Rect,
  pageDimensions: PageDimensions,
  pageWidth: number = DEFAULT_PAGE_WIDTH_INCHES,
  pageHeight: number = DEFAULT_PAGE_HEIGHT_INCHES
): DOCXRect {
  const normalized = vltToNormalized(rect, pageDimensions);
  return normalizedToDOCXTwips(normalized, pageWidth, pageHeight);
}

// =============================================================================
// SCALAR CONVERSIONS
// =============================================================================

/**
 * Convert a single pixel value to normalized (using width as reference)
 */
export function pxToNormalizedWidth(px: number, pageWidth: number): number {
  return px / Math.max(1, pageWidth);
}

/**
 * Convert a single pixel value to normalized (using height as reference)
 */
export function pxToNormalizedHeight(px: number, pageHeight: number): number {
  return px / Math.max(1, pageHeight);
}

/**
 * Convert normalized width to inches
 */
export function normalizedWidthToInches(nw: number, slideWidth: number): number {
  return nw * slideWidth;
}

/**
 * Convert normalized height to inches
 */
export function normalizedHeightToInches(nh: number, slideHeight: number): number {
  return nh * slideHeight;
}

/**
 * Convert pixels to inches directly (for scalar values like font sizes)
 */
export function pxToInches(px: number): number {
  return px / PIXELS_PER_INCH;
}

/**
 * Convert inches to pixels
 */
export function inchesToPx(inches: number): number {
  return inches * PIXELS_PER_INCH;
}

/**
 * Convert pixels to twips
 */
export function pxToTwips(px: number): number {
  return Math.round((px / PIXELS_PER_INCH) * TWIPS_PER_INCH);
}

/**
 * Convert twips to pixels
 */
export function twipsToPx(twips: number): number {
  return (twips / TWIPS_PER_INCH) * PIXELS_PER_INCH;
}

/**
 * Convert inches to EMU
 */
export function inchesToEMU(inches: number): number {
  return Math.round(inches * EMU_PER_INCH);
}

/**
 * Convert EMU to inches
 */
export function emuToInches(emu: number): number {
  return emu / EMU_PER_INCH;
}

// =============================================================================
// ROUND-TRIP VERIFICATION
// =============================================================================

/**
 * Verify that a transformation round-trips correctly.
 * Useful for testing and debugging.
 */
export function verifyRoundTrip(
  rect: Rect,
  pageDimensions: PageDimensions,
  tolerance: number = 1e-10
): { success: boolean; error?: string; maxDiff?: number } {
  const normalized = vltToNormalized(rect, pageDimensions);
  const roundTrip = normalizedToVLT(normalized, pageDimensions);

  const diffs = [
    Math.abs(rect.x - roundTrip.x),
    Math.abs(rect.y - roundTrip.y),
    Math.abs(rect.width - roundTrip.width),
    Math.abs(rect.height - roundTrip.height),
  ];
  const maxDiff = Math.max(...diffs);

  if (maxDiff > tolerance) {
    return {
      success: false,
      error: `Round-trip error: max diff = ${maxDiff}`,
      maxDiff,
    };
  }

  return { success: true, maxDiff };
}

// =============================================================================
// PIPELINE HELPER
// =============================================================================

/**
 * A coordinate pipeline that chains transformations with validation.
 * Use this for complex transformation chains that need intermediate validation.
 *
 * @example
 * const result = createPipeline(rect, pageDimensions)
 *   .toNormalized()
 *   .validate()
 *   .toPPTXInches(10, 5.625)
 *   .result();
 */
export function createPipeline(rect: Rect, pageDimensions: PageDimensions) {
  return new CoordinatePipeline(rect, pageDimensions);
}

class CoordinatePipeline {
  private _rect: Rect;
  private _pageDimensions: PageDimensions;
  private _normalized: NormalizedRect | null = null;
  private _pptxInches: PPTXRect | null = null;
  private _errors: string[] = [];

  constructor(rect: Rect, pageDimensions: PageDimensions) {
    this._rect = rect;
    this._pageDimensions = pageDimensions;
  }

  toNormalized(config?: VLTToNormalizedConfig): this {
    try {
      this._normalized = vltToNormalized(this._rect, this._pageDimensions, config);
    } catch (e) {
      this._errors.push(e instanceof Error ? e.message : String(e));
    }
    return this;
  }

  validate(options?: { allowOverflow?: boolean }): this {
    if (!this._normalized) {
      this._errors.push('Cannot validate: normalized coordinates not computed');
      return this;
    }

    const n = this._normalized;

    // Check for NaN/Infinity
    if (!Number.isFinite(n.nx) || !Number.isFinite(n.ny) ||
        !Number.isFinite(n.nw) || !Number.isFinite(n.nh)) {
      this._errors.push('Normalized coordinates contain non-finite values');
    }

    // Check dimensions are positive
    if (n.nw <= 0) {
      this._errors.push(`Width must be positive: nw=${n.nw}`);
    }
    if (n.nh <= 0) {
      this._errors.push(`Height must be positive: nh=${n.nh}`);
    }

    // Check bounds unless overflow allowed
    if (!options?.allowOverflow) {
      if (n.nx < 0) {
        this._errors.push(`X position is negative: nx=${n.nx}`);
      }
      if (n.ny < 0) {
        this._errors.push(`Y position is negative: ny=${n.ny}`);
      }
      if (n.nx + n.nw > 1.01) {
        this._errors.push(`Element overflows right edge: nx+nw=${n.nx + n.nw}`);
      }
      if (n.ny + n.nh > 1.01) {
        this._errors.push(`Element overflows bottom edge: ny+nh=${n.ny + n.nh}`);
      }
    }

    return this;
  }

  toPPTXInches(slideWidth: number, slideHeight: number): this {
    if (!this._normalized) {
      this._errors.push('Cannot convert to PPTX: normalized coordinates not computed');
      return this;
    }
    this._pptxInches = normalizedToPPTXInches(this._normalized, slideWidth, slideHeight);
    return this;
  }

  get normalized(): NormalizedRect | null {
    return this._normalized;
  }

  get pptxInches(): PPTXRect | null {
    return this._pptxInches;
  }

  get errors(): string[] {
    return [...this._errors];
  }

  get hasErrors(): boolean {
    return this._errors.length > 0;
  }

  result(): {
    normalized: NormalizedRect | null;
    pptxInches: PPTXRect | null;
    errors: string[];
    success: boolean;
  } {
    return {
      normalized: this._normalized,
      pptxInches: this._pptxInches,
      errors: [...this._errors],
      success: this._errors.length === 0,
    };
  }
}
