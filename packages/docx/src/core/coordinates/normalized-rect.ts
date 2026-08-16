/**
 * Normalized Rectangle Types and Operations
 * ==========================================
 *
 * The NormalizedRect is the cornerstone of the coordinate system redesign.
 * All coordinates are expressed as fractions (0.0 - 1.0) of page dimensions,
 * eliminating unit confusion and enabling validation.
 *
 * Design Principles:
 * 1. SINGLE SOURCE OF TRUTH: Normalized coordinates are the intermediate representation
 * 2. VALIDATION-FRIENDLY: Values outside [0, 1] are detectable errors (or intentional overflow)
 * 3. FORMAT-AGNOSTIC: Same normalized values work for PPTX inches, DOCX twips, or PDF points
 * 4. PRECISION-PRESERVING: No unnecessary intermediate conversions
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Normalized rectangle with coordinates in range [0, 1].
 * Represents position/size relative to page dimensions.
 *
 * Example:
 * - nx: 0.0375 means 3.75% from left edge
 * - ny: 0.1852 means 18.52% from top edge
 * - nw: 0.4625 means 46.25% of page width
 * - nh: 0.0407 means 4.07% of page height
 */
export interface NormalizedRect {
  /** X position as fraction of page width (0 = left edge, 1 = right edge) */
  nx: number;
  /** Y position as fraction of page height (0 = top, 1 = bottom) */
  ny: number;
  /** Width as fraction of page width */
  nw: number;
  /** Height as fraction of page height */
  nh: number;
}

/**
 * Frozen/immutable normalized rectangle for safety
 */
export type FrozenNormalizedRect = Readonly<NormalizedRect>;

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error codes for coordinate validation
 */
export type CoordinateErrorCode =
  | 'NAN_VALUE'           // Value is NaN
  | 'INFINITE_VALUE'      // Value is Infinity or -Infinity
  | 'NEGATIVE_DIMENSION'  // Width or height is negative
  | 'ZERO_DIMENSION'      // Width or height is zero
  | 'OUT_OF_BOUNDS'       // Position outside [0, 1] range
  | 'OVERFLOW_RIGHT'      // Element extends past right edge
  | 'OVERFLOW_BOTTOM'     // Element extends past bottom edge
  | 'UNDERFLOW_LEFT'      // Element extends past left edge (negative x)
  | 'UNDERFLOW_TOP';      // Element extends past top edge (negative y)

/**
 * Severity levels for coordinate issues
 */
export type CoordinateSeverity = 'error' | 'warning';

/**
 * A coordinate validation error
 */
export interface CoordinateError {
  /** Error code for programmatic handling */
  code: CoordinateErrorCode;
  /** Which field caused the error */
  field: 'nx' | 'ny' | 'nw' | 'nh';
  /** The problematic value */
  value: number;
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: CoordinateSeverity;
}

/**
 * Result of coordinate validation
 */
export interface CoordinateValidation {
  /** Whether the coordinates are valid (no errors) */
  valid: boolean;
  /** All issues found (errors and warnings) */
  issues: CoordinateError[];
  /** Just the errors (severity === 'error') */
  errors: CoordinateError[];
  /** Just the warnings (severity === 'warning') */
  warnings: CoordinateError[];
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a normalized rect with validation.
 * Throws if any value is NaN or Infinity.
 */
export function createNormalizedRect(
  nx: number,
  ny: number,
  nw: number,
  nh: number
): NormalizedRect {
  // Strict validation for NaN and Infinity
  if (!Number.isFinite(nx)) {
    throw new Error(`Invalid nx value: ${nx} (must be a finite number)`);
  }
  if (!Number.isFinite(ny)) {
    throw new Error(`Invalid ny value: ${ny} (must be a finite number)`);
  }
  if (!Number.isFinite(nw)) {
    throw new Error(`Invalid nw value: ${nw} (must be a finite number)`);
  }
  if (!Number.isFinite(nh)) {
    throw new Error(`Invalid nh value: ${nh} (must be a finite number)`);
  }

  return { nx, ny, nw, nh };
}

/**
 * Create a frozen (immutable) normalized rect.
 * Use this when passing coordinates between functions to prevent accidental mutation.
 */
export function createFrozenNormalizedRect(
  nx: number,
  ny: number,
  nw: number,
  nh: number
): FrozenNormalizedRect {
  return Object.freeze(createNormalizedRect(nx, ny, nw, nh));
}

/**
 * Create a normalized rect without validation (for performance-critical paths).
 * ONLY use this when you've already validated the inputs.
 */
export function createNormalizedRectUnsafe(
  nx: number,
  ny: number,
  nw: number,
  nh: number
): NormalizedRect {
  return { nx, ny, nw, nh };
}

// =============================================================================
// GEOMETRIC OPERATIONS
// =============================================================================

/**
 * Get the right edge (nx + nw)
 */
export function getRight(rect: NormalizedRect): number {
  return rect.nx + rect.nw;
}

/**
 * Get the bottom edge (ny + nh)
 */
export function getBottom(rect: NormalizedRect): number {
  return rect.ny + rect.nh;
}

/**
 * Get the center X coordinate
 */
export function getCenterX(rect: NormalizedRect): number {
  return rect.nx + rect.nw / 2;
}

/**
 * Get the center Y coordinate
 */
export function getCenterY(rect: NormalizedRect): number {
  return rect.ny + rect.nh / 2;
}

/**
 * Get the area (nw * nh)
 */
export function getArea(rect: NormalizedRect): number {
  return rect.nw * rect.nh;
}

/**
 * Check if two rects overlap
 */
export function rectsOverlap(a: NormalizedRect, b: NormalizedRect): boolean {
  return !(
    getRight(a) <= b.nx ||
    getRight(b) <= a.nx ||
    getBottom(a) <= b.ny ||
    getBottom(b) <= a.ny
  );
}

/**
 * Check if rect A contains rect B entirely
 */
export function rectContains(outer: NormalizedRect, inner: NormalizedRect): boolean {
  return (
    inner.nx >= outer.nx &&
    inner.ny >= outer.ny &&
    getRight(inner) <= getRight(outer) &&
    getBottom(inner) <= getBottom(outer)
  );
}

/**
 * Check if a point is inside a rect
 */
export function rectContainsPoint(
  rect: NormalizedRect,
  px: number,
  py: number
): boolean {
  return (
    px >= rect.nx &&
    px <= getRight(rect) &&
    py >= rect.ny &&
    py <= getBottom(rect)
  );
}

/**
 * Compute the intersection of two rects.
 * Returns null if they don't overlap.
 */
export function rectIntersection(
  a: NormalizedRect,
  b: NormalizedRect
): NormalizedRect | null {
  const nx = Math.max(a.nx, b.nx);
  const ny = Math.max(a.ny, b.ny);
  const right = Math.min(getRight(a), getRight(b));
  const bottom = Math.min(getBottom(a), getBottom(b));

  const nw = right - nx;
  const nh = bottom - ny;

  if (nw <= 0 || nh <= 0) {
    return null;
  }

  return { nx, ny, nw, nh };
}

/**
 * Compute the bounding box of multiple rects
 */
export function boundingBox(rects: NormalizedRect[]): NormalizedRect | null {
  if (rects.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.nx);
    minY = Math.min(minY, rect.ny);
    maxX = Math.max(maxX, getRight(rect));
    maxY = Math.max(maxY, getBottom(rect));
  }

  return {
    nx: minX,
    ny: minY,
    nw: maxX - minX,
    nh: maxY - minY,
  };
}

// =============================================================================
// COMPARISON OPERATIONS
// =============================================================================

/**
 * Check if two rects are equal (within tolerance)
 */
export function rectsEqual(
  a: NormalizedRect,
  b: NormalizedRect,
  tolerance: number = 1e-10
): boolean {
  return (
    Math.abs(a.nx - b.nx) <= tolerance &&
    Math.abs(a.ny - b.ny) <= tolerance &&
    Math.abs(a.nw - b.nw) <= tolerance &&
    Math.abs(a.nh - b.nh) <= tolerance
  );
}

/**
 * Check if two rects are horizontally adjacent (same Y, touching edges)
 */
export function rectsHorizontallyAdjacent(
  left: NormalizedRect,
  right: NormalizedRect,
  tolerance: number = 0.001
): boolean {
  // Same Y position
  if (Math.abs(left.ny - right.ny) > tolerance) {
    return false;
  }
  // Same height
  if (Math.abs(left.nh - right.nh) > tolerance) {
    return false;
  }
  // Left's right edge touches right's left edge
  if (Math.abs(getRight(left) - right.nx) > tolerance) {
    return false;
  }
  return true;
}

/**
 * Check if two rects are vertically adjacent (same X, touching edges)
 */
export function rectsVerticallyAdjacent(
  top: NormalizedRect,
  bottom: NormalizedRect,
  tolerance: number = 0.001
): boolean {
  // Same X position
  if (Math.abs(top.nx - bottom.nx) > tolerance) {
    return false;
  }
  // Same width
  if (Math.abs(top.nw - bottom.nw) > tolerance) {
    return false;
  }
  // Top's bottom edge touches bottom's top edge
  if (Math.abs(getBottom(top) - bottom.ny) > tolerance) {
    return false;
  }
  return true;
}

// =============================================================================
// TRANSFORMATION OPERATIONS
// =============================================================================

/**
 * Scale a rect by a factor
 */
export function scaleRect(
  rect: NormalizedRect,
  scaleX: number,
  scaleY: number = scaleX
): NormalizedRect {
  return {
    nx: rect.nx * scaleX,
    ny: rect.ny * scaleY,
    nw: rect.nw * scaleX,
    nh: rect.nh * scaleY,
  };
}

/**
 * Translate a rect by an offset
 */
export function translateRect(
  rect: NormalizedRect,
  dx: number,
  dy: number
): NormalizedRect {
  return {
    nx: rect.nx + dx,
    ny: rect.ny + dy,
    nw: rect.nw,
    nh: rect.nh,
  };
}

/**
 * Inset a rect by a margin (shrink it)
 */
export function insetRect(
  rect: NormalizedRect,
  margin: number
): NormalizedRect {
  return {
    nx: rect.nx + margin,
    ny: rect.ny + margin,
    nw: Math.max(0, rect.nw - 2 * margin),
    nh: Math.max(0, rect.nh - 2 * margin),
  };
}

/**
 * Expand a rect by a margin (grow it)
 */
export function expandRect(
  rect: NormalizedRect,
  margin: number
): NormalizedRect {
  return {
    nx: rect.nx - margin,
    ny: rect.ny - margin,
    nw: rect.nw + 2 * margin,
    nh: rect.nh + 2 * margin,
  };
}

/**
 * Clamp a rect to stay within [0, 1] bounds
 */
export function clampRect(rect: NormalizedRect): NormalizedRect {
  const nx = Math.max(0, Math.min(1, rect.nx));
  const ny = Math.max(0, Math.min(1, rect.ny));
  const nw = Math.max(0, Math.min(1 - nx, rect.nw));
  const nh = Math.max(0, Math.min(1 - ny, rect.nh));
  return { nx, ny, nw, nh };
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Convert to a plain object (for JSON serialization)
 */
export function toPlainObject(rect: NormalizedRect): {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
} {
  return {
    nx: rect.nx,
    ny: rect.ny,
    nw: rect.nw,
    nh: rect.nh,
  };
}

/**
 * Create from a plain object
 */
export function fromPlainObject(obj: {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
}): NormalizedRect {
  return createNormalizedRect(obj.nx, obj.ny, obj.nw, obj.nh);
}

/**
 * Format as a human-readable string
 */
export function formatRect(rect: NormalizedRect, precision: number = 4): string {
  return `NormalizedRect(nx=${rect.nx.toFixed(precision)}, ny=${rect.ny.toFixed(precision)}, nw=${rect.nw.toFixed(precision)}, nh=${rect.nh.toFixed(precision)})`;
}

/**
 * Format as percentages for display
 */
export function formatRectAsPercent(rect: NormalizedRect, precision: number = 1): string {
  return `(${(rect.nx * 100).toFixed(precision)}%, ${(rect.ny * 100).toFixed(precision)}%) ${(rect.nw * 100).toFixed(precision)}% x ${(rect.nh * 100).toFixed(precision)}%`;
}
