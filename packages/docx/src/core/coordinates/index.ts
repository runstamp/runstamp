/**
 * @runstamp/polyglot-core - Coordinates Module
 * =============================================
 *
 * This module provides the coordinate transformation system for Polyglot.
 *
 * Key Concepts:
 * - NormalizedRect: Coordinates as fractions (0-1) of page dimensions
 * - Transform Pipeline: VLT → Normalized → Target Format (PPTX/DOCX)
 * - Validators: Catch invalid coordinates before they become visual bugs
 *
 * Usage:
 * ```typescript
 * import {
 *   vltToNormalized,
 *   normalizedToPPTXInches,
 *   validateNormalized,
 * } from '@runstamp/polyglot-core';
 *
 * // Transform VLT rect to normalized
 * const normalized = vltToNormalized(rect, pageDimensions);
 *
 * // Validate before conversion
 * const validation = validateNormalized(normalized);
 * if (!validation.valid) {
 *   throw new Error(validation.errors.map(e => e.message).join(', '));
 * }
 *
 * // Convert to target format
 * const pptxInches = normalizedToPPTXInches(normalized, 10, 5.625);
 * ```
 */

// =============================================================================
// NORMALIZED RECT TYPES & OPERATIONS
// =============================================================================

export type {
  NormalizedRect,
  FrozenNormalizedRect,
  CoordinateErrorCode,
  CoordinateSeverity,
  CoordinateError,
  CoordinateValidation,
} from './normalized-rect';

export {
  // Factory functions
  createNormalizedRect,
  createFrozenNormalizedRect,
  createNormalizedRectUnsafe,

  // Geometric operations
  getRight,
  getBottom,
  getCenterX,
  getCenterY,
  getArea,
  rectsOverlap,
  rectContains,
  rectContainsPoint,
  rectIntersection,
  boundingBox,

  // Comparison operations
  rectsEqual,
  rectsHorizontallyAdjacent,
  rectsVerticallyAdjacent,

  // Transformation operations
  scaleRect,
  translateRect,
  insetRect,
  expandRect,
  clampRect,

  // Serialization
  toPlainObject,
  fromPlainObject,
  formatRect,
  formatRectAsPercent,
} from './normalized-rect';

// =============================================================================
// TRANSFORM PIPELINE
// =============================================================================

export type {
  VLTToNormalizedConfig,
  PPTXRect,
  DOCXRect,
} from './transform-pipeline';

export {
  // Constants
  PIXELS_PER_INCH,
  TWIPS_PER_INCH,
  EMU_PER_INCH,
  DEFAULT_SLIDE_WIDTH_INCHES,
  DEFAULT_SLIDE_HEIGHT_INCHES,
  DEFAULT_PAGE_WIDTH_INCHES,
  DEFAULT_PAGE_HEIGHT_INCHES,

  // VLT to Normalized
  vltToNormalized,
  vltToNormalizedBatch,
  normalizedToVLT,

  // Normalized to PPTX
  normalizedToPPTXInches,
  normalizedToEMU,

  // Normalized to DOCX
  normalizedToDOCXTwips,

  // Direct conversions
  vltToPPTXInches,
  vltToEMU,
  vltToDOCXTwips,

  // Scalar conversions
  pxToNormalizedWidth,
  pxToNormalizedHeight,
  normalizedWidthToInches,
  normalizedHeightToInches,
  pxToInches,
  inchesToPx,
  pxToTwips,
  twipsToPx,
  inchesToEMU,
  emuToInches,

  // Utilities
  verifyRoundTrip,
  createPipeline,
} from './transform-pipeline';

// =============================================================================
// VALIDATORS
// =============================================================================

export type {
  ValidationOptions,
  TableInvariantResult,
  DocumentValidationResult,
} from './validators';

export {
  // Normalized rect validation
  validateNormalized,
  assertNormalizedValid,

  // VLT rect validation
  validateVLTRect,

  // Table invariants
  validateTableInvariants,
  assertTableInvariants,

  // Document validation
  validateDocumentCoordinates,
  assertDocumentCoordinatesValid,

  // Column/row validation
  validateColumnWidths,
  validateRowHeights,
} from './validators';
