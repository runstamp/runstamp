/**
 * Coordinate Validators and Invariant Checkers
 * =============================================
 *
 * This module provides comprehensive validation for coordinates at every
 * stage of the transformation pipeline. The goal is to catch invalid
 * coordinates BEFORE they become visual bugs in the output.
 *
 * Design Principles:
 * 1. FAIL FAST: Invalid coordinates throw errors, not silent fallbacks
 * 2. DETAILED DIAGNOSTICS: Every error includes context for debugging
 * 3. CONFIGURABLE STRICTNESS: Allow warnings vs errors based on use case
 * 4. INVARIANT PRESERVATION: Verify relationships hold across transformations
 */

import type { Rect, PageDimensions, PolyglotNode, PolyglotDocument } from '../types';
import type { NormalizedRect, CoordinateError, CoordinateValidation } from './normalized-rect';
import { getRight, getBottom } from './normalized-rect';
import { vltToNormalized } from './transform-pipeline';

// =============================================================================
// VALIDATION OPTIONS
// =============================================================================

/**
 * Options for coordinate validation
 */
export interface ValidationOptions {
  /**
   * Allow elements to extend beyond page bounds.
   * Default: false
   */
  allowOverflow?: boolean;

  /**
   * Tolerance for floating-point comparisons.
   * Default: 0.001 (0.1%)
   */
  tolerance?: number;

  /**
   * Treat warnings as errors.
   * Default: false
   */
  strictMode?: boolean;

  /**
   * Maximum allowed normalized dimension (for sanity checks).
   * Default: 10 (1000% of page dimension - catches obvious bugs)
   */
  maxNormalizedDimension?: number;

  /**
   * Minimum allowed dimension (to catch zero-size elements).
   * Default: 0.0001 (0.01% of page dimension)
   */
  minNormalizedDimension?: number;
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  allowOverflow: false,
  tolerance: 0.001,
  strictMode: false,
  maxNormalizedDimension: 10,
  minNormalizedDimension: 0.0001,
};

// =============================================================================
// NORMALIZED RECT VALIDATION
// =============================================================================

/**
 * Validate a normalized rectangle.
 * This is the primary validation function - call it after every transformation.
 */
export function validateNormalized(
  rect: NormalizedRect,
  options?: ValidationOptions
): CoordinateValidation {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: CoordinateError[] = [];

  // Check for NaN values
  if (Number.isNaN(rect.nx)) {
    issues.push({
      code: 'NAN_VALUE',
      field: 'nx',
      value: rect.nx,
      message: 'nx is NaN',
      severity: 'error',
    });
  }
  if (Number.isNaN(rect.ny)) {
    issues.push({
      code: 'NAN_VALUE',
      field: 'ny',
      value: rect.ny,
      message: 'ny is NaN',
      severity: 'error',
    });
  }
  if (Number.isNaN(rect.nw)) {
    issues.push({
      code: 'NAN_VALUE',
      field: 'nw',
      value: rect.nw,
      message: 'nw is NaN',
      severity: 'error',
    });
  }
  if (Number.isNaN(rect.nh)) {
    issues.push({
      code: 'NAN_VALUE',
      field: 'nh',
      value: rect.nh,
      message: 'nh is NaN',
      severity: 'error',
    });
  }

  // Check for Infinity values
  if (!Number.isFinite(rect.nx)) {
    issues.push({
      code: 'INFINITE_VALUE',
      field: 'nx',
      value: rect.nx,
      message: `nx is ${rect.nx}`,
      severity: 'error',
    });
  }
  if (!Number.isFinite(rect.ny)) {
    issues.push({
      code: 'INFINITE_VALUE',
      field: 'ny',
      value: rect.ny,
      message: `ny is ${rect.ny}`,
      severity: 'error',
    });
  }
  if (!Number.isFinite(rect.nw)) {
    issues.push({
      code: 'INFINITE_VALUE',
      field: 'nw',
      value: rect.nw,
      message: `nw is ${rect.nw}`,
      severity: 'error',
    });
  }
  if (!Number.isFinite(rect.nh)) {
    issues.push({
      code: 'INFINITE_VALUE',
      field: 'nh',
      value: rect.nh,
      message: `nh is ${rect.nh}`,
      severity: 'error',
    });
  }

  // Check for negative dimensions
  if (rect.nw < 0) {
    issues.push({
      code: 'NEGATIVE_DIMENSION',
      field: 'nw',
      value: rect.nw,
      message: `Width is negative: ${rect.nw}`,
      severity: 'error',
    });
  }
  if (rect.nh < 0) {
    issues.push({
      code: 'NEGATIVE_DIMENSION',
      field: 'nh',
      value: rect.nh,
      message: `Height is negative: ${rect.nh}`,
      severity: 'error',
    });
  }

  // Check for zero dimensions
  if (rect.nw >= 0 && rect.nw < opts.minNormalizedDimension) {
    issues.push({
      code: 'ZERO_DIMENSION',
      field: 'nw',
      value: rect.nw,
      message: `Width is effectively zero: ${rect.nw}`,
      severity: 'error',
    });
  }
  if (rect.nh >= 0 && rect.nh < opts.minNormalizedDimension) {
    issues.push({
      code: 'ZERO_DIMENSION',
      field: 'nh',
      value: rect.nh,
      message: `Height is effectively zero: ${rect.nh}`,
      severity: 'error',
    });
  }

  // Check for unreasonably large dimensions
  if (Math.abs(rect.nw) > opts.maxNormalizedDimension) {
    issues.push({
      code: 'OUT_OF_BOUNDS',
      field: 'nw',
      value: rect.nw,
      message: `Width is unreasonably large: ${rect.nw} (max: ${opts.maxNormalizedDimension})`,
      severity: 'error',
    });
  }
  if (Math.abs(rect.nh) > opts.maxNormalizedDimension) {
    issues.push({
      code: 'OUT_OF_BOUNDS',
      field: 'nh',
      value: rect.nh,
      message: `Height is unreasonably large: ${rect.nh} (max: ${opts.maxNormalizedDimension})`,
      severity: 'error',
    });
  }

  // Check bounds (unless overflow allowed)
  if (!opts.allowOverflow) {
    const warningOrError = opts.strictMode ? 'error' : 'warning';

    if (rect.nx < -opts.tolerance) {
      issues.push({
        code: 'UNDERFLOW_LEFT',
        field: 'nx',
        value: rect.nx,
        message: `X position extends past left edge: ${rect.nx}`,
        severity: warningOrError,
      });
    }
    if (rect.ny < -opts.tolerance) {
      issues.push({
        code: 'UNDERFLOW_TOP',
        field: 'ny',
        value: rect.ny,
        message: `Y position extends past top edge: ${rect.ny}`,
        severity: warningOrError,
      });
    }
    if (getRight(rect) > 1 + opts.tolerance) {
      issues.push({
        code: 'OVERFLOW_RIGHT',
        field: 'nw',
        value: getRight(rect),
        message: `Element extends past right edge: nx+nw=${getRight(rect).toFixed(4)}`,
        severity: warningOrError,
      });
    }
    if (getBottom(rect) > 1 + opts.tolerance) {
      issues.push({
        code: 'OVERFLOW_BOTTOM',
        field: 'nh',
        value: getBottom(rect),
        message: `Element extends past bottom edge: ny+nh=${getBottom(rect).toFixed(4)}`,
        severity: warningOrError,
      });
    }
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if invalid.
 * Use this when you want to fail fast on bad coordinates.
 */
export function assertNormalizedValid(
  rect: NormalizedRect,
  context?: string,
  options?: ValidationOptions
): void {
  const result = validateNormalized(rect, options);

  if (!result.valid) {
    const prefix = context ? `[${context}] ` : '';
    const messages = result.errors.map(e => `  - [${e.code}] ${e.message}`).join('\n');
    throw new Error(`${prefix}Invalid normalized coordinates:\n${messages}`);
  }
}

// =============================================================================
// VLT RECT VALIDATION
// =============================================================================

/**
 * Validate a VLT rect (in pixels) before transformation
 */
export function validateVLTRect(
  rect: Rect,
  _context?: string
): CoordinateValidation {
  const issues: CoordinateError[] = [];

  // Check for NaN
  if (Number.isNaN(rect.x)) {
    issues.push({ code: 'NAN_VALUE', field: 'nx', value: rect.x, message: 'x is NaN', severity: 'error' });
  }
  if (Number.isNaN(rect.y)) {
    issues.push({ code: 'NAN_VALUE', field: 'ny', value: rect.y, message: 'y is NaN', severity: 'error' });
  }
  if (Number.isNaN(rect.width)) {
    issues.push({ code: 'NAN_VALUE', field: 'nw', value: rect.width, message: 'width is NaN', severity: 'error' });
  }
  if (Number.isNaN(rect.height)) {
    issues.push({ code: 'NAN_VALUE', field: 'nh', value: rect.height, message: 'height is NaN', severity: 'error' });
  }

  // Check for Infinity
  if (!Number.isFinite(rect.x)) {
    issues.push({ code: 'INFINITE_VALUE', field: 'nx', value: rect.x, message: `x is ${rect.x}`, severity: 'error' });
  }
  if (!Number.isFinite(rect.y)) {
    issues.push({ code: 'INFINITE_VALUE', field: 'ny', value: rect.y, message: `y is ${rect.y}`, severity: 'error' });
  }
  if (!Number.isFinite(rect.width)) {
    issues.push({ code: 'INFINITE_VALUE', field: 'nw', value: rect.width, message: `width is ${rect.width}`, severity: 'error' });
  }
  if (!Number.isFinite(rect.height)) {
    issues.push({ code: 'INFINITE_VALUE', field: 'nh', value: rect.height, message: `height is ${rect.height}`, severity: 'error' });
  }

  // Check dimensions
  if (rect.width <= 0) {
    issues.push({
      code: rect.width < 0 ? 'NEGATIVE_DIMENSION' : 'ZERO_DIMENSION',
      field: 'nw',
      value: rect.width,
      message: `Width is ${rect.width <= 0 ? 'zero or negative' : 'negative'}: ${rect.width}`,
      severity: 'error',
    });
  }
  if (rect.height <= 0) {
    issues.push({
      code: rect.height < 0 ? 'NEGATIVE_DIMENSION' : 'ZERO_DIMENSION',
      field: 'nh',
      value: rect.height,
      message: `Height is ${rect.height <= 0 ? 'zero or negative' : 'negative'}: ${rect.height}`,
      severity: 'error',
    });
  }

  // Check for unreasonably large values (> 100000 px)
  const MAX_PX = 100000;
  if (Math.abs(rect.x) > MAX_PX || Math.abs(rect.y) > MAX_PX ||
      rect.width > MAX_PX || rect.height > MAX_PX) {
    issues.push({
      code: 'OUT_OF_BOUNDS',
      field: 'nx',
      value: Math.max(Math.abs(rect.x), Math.abs(rect.y), rect.width, rect.height),
      message: `Rect has unreasonably large values: ${JSON.stringify(rect)}`,
      severity: 'error',
    });
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

// =============================================================================
// TABLE INVARIANT VALIDATORS
// =============================================================================

/**
 * Result of table invariant validation
 */
export interface TableInvariantResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    rowCount: number;
    columnCount: number;
    cellCount: number;
    tableWidthMatch: boolean;
    rowsHorizontallyAligned: boolean;
    cellsAdjacent: boolean;
  };
}

/**
 * Validate table structure invariants.
 * These are mathematical properties that MUST hold for correct rendering.
 */
export function validateTableInvariants(
  tableNode: PolyglotNode,
  pageDimensions: PageDimensions,
  tolerance: number = 0.01 // 1% tolerance
): TableInvariantResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows = tableNode.children?.filter(c => c.type === 'row') || [];

  const details = {
    rowCount: rows.length,
    columnCount: 0,
    cellCount: 0,
    tableWidthMatch: true,
    rowsHorizontallyAligned: true,
    cellsAdjacent: true,
  };

  if (rows.length === 0) {
    warnings.push('Table has no rows');
    return { valid: true, errors, warnings, details };
  }

  // Invariant 1: All rows should have the same Y alignment within tolerance
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.children?.filter(c => c.type === 'cell') || [];

    if (cells.length === 0) {
      warnings.push(`Row ${i} has no cells`);
      continue;
    }

    details.cellCount += cells.length;
    if (i === 0) {
      details.columnCount = cells.reduce((sum, c) => sum + (c.colSpan || 1), 0);
    }

    // Check cells are horizontally aligned (same Y)
    const firstCellY = cells[0].rect.y;
    for (let j = 1; j < cells.length; j++) {
      const cellY = cells[j].rect.y;
      const diff = Math.abs(cellY - firstCellY) / pageDimensions.height;
      if (diff > tolerance) {
        errors.push(
          `Row ${i}: Cells are not horizontally aligned. Cell 0 Y=${firstCellY}, Cell ${j} Y=${cellY} (diff: ${(diff * 100).toFixed(1)}%)`
        );
        details.rowsHorizontallyAligned = false;
      }
    }

    // Invariant 2: Cells should be horizontally adjacent (no gaps)
    let expectedX = cells[0].rect.x;
    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j];
      const actualX = cell.rect.x;

      if (j > 0) {
        const gap = (actualX - expectedX) / pageDimensions.width;
        if (Math.abs(gap) > tolerance) {
          warnings.push(
            `Row ${i}: Gap between cells ${j - 1} and ${j}. Expected X=${expectedX.toFixed(1)}, Actual X=${actualX.toFixed(1)} (gap: ${(gap * 100).toFixed(1)}%)`
          );
          details.cellsAdjacent = false;
        }
      }

      expectedX = actualX + cell.rect.width;
    }

    // Invariant 3: Cell widths should sum to approximately table width
    if (i === 0) {
      const cellWidthSum = cells.reduce((sum, c) => sum + c.rect.width, 0);
      const tableWidth = tableNode.rect.width;
      const diff = Math.abs(cellWidthSum - tableWidth) / tableWidth;

      if (diff > tolerance) {
        warnings.push(
          `Row 0: Cell widths (${cellWidthSum.toFixed(1)}px) don't match table width (${tableWidth.toFixed(1)}px). Diff: ${(diff * 100).toFixed(1)}%`
        );
        details.tableWidthMatch = false;
      }
    }
  }

  // Invariant 4: All rows should have consistent column count (accounting for colspan)
  const colCounts = rows.map(row => {
    const cells = row.children?.filter(c => c.type === 'cell') || [];
    return cells.reduce((sum, c) => sum + (c.colSpan || 1), 0);
  });

  const expectedCols = colCounts[0];
  for (let i = 1; i < colCounts.length; i++) {
    if (colCounts[i] !== expectedCols) {
      warnings.push(
        `Inconsistent column counts: Row 0 has ${expectedCols} columns, Row ${i} has ${colCounts[i]} columns`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details,
  };
}

/**
 * Assert table invariants hold. Throws if not.
 */
export function assertTableInvariants(
  tableNode: PolyglotNode,
  pageDimensions: PageDimensions,
  context?: string
): void {
  const result = validateTableInvariants(tableNode, pageDimensions);

  if (!result.valid) {
    const prefix = context ? `[${context}] ` : '';
    throw new Error(
      `${prefix}Table invariant violations:\n${result.errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

// =============================================================================
// DOCUMENT-LEVEL VALIDATION
// =============================================================================

/**
 * Result of document validation
 */
export interface DocumentValidationResult {
  valid: boolean;
  pageResults: Array<{
    pageIndex: number;
    nodeCount: number;
    errors: string[];
    warnings: string[];
  }>;
  totalErrors: number;
  totalWarnings: number;
  totalNodes: number;
}

/**
 * Validate all coordinates in a document before serialization.
 * This is the top-level validation function.
 */
export function validateDocumentCoordinates(
  doc: PolyglotDocument,
  options?: ValidationOptions
): DocumentValidationResult {
  const pageResults: DocumentValidationResult['pageResults'] = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalNodes = 0;

  for (let pageIndex = 0; pageIndex < doc.pages.length; pageIndex++) {
    const page = doc.pages[pageIndex];
    const errors: string[] = [];
    const warnings: string[] = [];
    let nodeCount = 0;

    // Walk all nodes
    walkNode(page.content, `page[${pageIndex}]`, (node, path) => {
      nodeCount++;
      totalNodes++;

      // Validate VLT rect
      const vltResult = validateVLTRect(node.rect, path);
      errors.push(...vltResult.errors.map(e => `${path}: ${e.message}`));
      warnings.push(...vltResult.warnings.map(e => `${path}: ${e.message}`));

      // If VLT rect is valid, validate normalized
      if (vltResult.valid) {
        try {
          const normalized = vltToNormalized(node.rect, page.dimensions);
          const normResult = validateNormalized(normalized, options);
          errors.push(...normResult.errors.map(e => `${path}: ${e.message}`));
          warnings.push(...normResult.warnings.map(e => `${path}: ${e.message}`));
        } catch (e) {
          errors.push(`${path}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Special validation for tables
      if (node.type === 'table') {
        const tableResult = validateTableInvariants(node, page.dimensions);
        errors.push(...tableResult.errors.map(e => `${path}: ${e}`));
        warnings.push(...tableResult.warnings.map(e => `${path}: ${e}`));
      }
    });

    totalErrors += errors.length;
    totalWarnings += warnings.length;

    pageResults.push({
      pageIndex,
      nodeCount,
      errors,
      warnings,
    });
  }

  return {
    valid: totalErrors === 0,
    pageResults,
    totalErrors,
    totalWarnings,
    totalNodes,
  };
}

/**
 * Assert document coordinates are valid. Throws if not.
 */
export function assertDocumentCoordinatesValid(
  doc: PolyglotDocument,
  options?: ValidationOptions
): void {
  const result = validateDocumentCoordinates(doc, options);

  if (!result.valid) {
    const errorMessages = result.pageResults
      .flatMap(p => p.errors)
      .slice(0, 10); // Limit to first 10 errors

    const suffix = result.totalErrors > 10
      ? `\n  ... and ${result.totalErrors - 10} more errors`
      : '';

    throw new Error(
      `Document coordinate validation failed (${result.totalErrors} errors):\n${errorMessages.map(e => `  - ${e}`).join('\n')}${suffix}`
    );
  }
}

// =============================================================================
// HELPER: NODE WALKER
// =============================================================================

/**
 * Walk all nodes in a tree, calling the callback for each
 */
function walkNode(
  node: PolyglotNode,
  path: string,
  callback: (node: PolyglotNode, path: string) => void
): void {
  callback(node, path);

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childPath = `${path}/${child.type}[${i}]`;
      walkNode(child, childPath, callback);
    }
  }
}

// =============================================================================
// COLUMN WIDTH VALIDATION
// =============================================================================

/**
 * Validate that column widths are consistent and sum correctly
 */
export function validateColumnWidths(
  widths: number[],
  expectedTotal: number,
  tolerance: number = 0.01
): { valid: boolean; errors: string[]; actualSum: number } {
  const errors: string[] = [];

  if (widths.length === 0) {
    errors.push('Column widths array is empty');
    return { valid: false, errors, actualSum: 0 };
  }

  // Check for invalid values
  for (let i = 0; i < widths.length; i++) {
    if (!Number.isFinite(widths[i])) {
      errors.push(`Column ${i} width is not finite: ${widths[i]}`);
    }
    if (widths[i] <= 0) {
      errors.push(`Column ${i} width is not positive: ${widths[i]}`);
    }
  }

  // Check sum
  const actualSum = widths.reduce((a, b) => a + b, 0);
  const diff = Math.abs(actualSum - expectedTotal);
  const relDiff = diff / expectedTotal;

  if (relDiff > tolerance) {
    errors.push(
      `Column widths sum (${actualSum.toFixed(4)}) differs from expected (${expectedTotal.toFixed(4)}) by ${(relDiff * 100).toFixed(2)}%`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    actualSum,
  };
}

/**
 * Validate that row heights are reasonable
 */
export function validateRowHeights(
  heights: number[],
  minHeight: number = 0.01,
  maxHeight: number = 1.0
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < heights.length; i++) {
    if (!Number.isFinite(heights[i])) {
      errors.push(`Row ${i} height is not finite: ${heights[i]}`);
    }
    if (heights[i] < minHeight) {
      errors.push(`Row ${i} height (${heights[i].toFixed(4)}) is below minimum (${minHeight})`);
    }
    if (heights[i] > maxHeight) {
      errors.push(`Row ${i} height (${heights[i].toFixed(4)}) exceeds maximum (${maxHeight})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
