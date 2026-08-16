/**
 * Shape Extractor for DOCX
 * ========================
 * Utilities for extracting and processing shape data from ShapeElement.
 */

import type {
  ShapeElement,
  ShapeType,
  FillStyle,
  StrokeStyle,
  TextRun,
} from '../../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extracted shape data in a normalized format.
 */
export interface ExtractedShape {
  /** Element ID */
  id: string;

  /** Shape type */
  shapeType: ShapeType;

  /** Position and dimensions */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** Fill style (normalized) */
  fill?: NormalizedFill;

  /** Stroke style (normalized) */
  stroke?: NormalizedStroke;

  /** Text content */
  text?: string;

  /** Text runs for formatted content */
  runs?: TextRun[];

  /** Whether shape contains text */
  hasText: boolean;

  /** Custom path data (for custom shapes) */
  pathData?: string;

  /** Computed metrics */
  metrics: ShapeMetrics;
}

/**
 * Normalized fill style.
 */
export interface NormalizedFill {
  type: 'solid' | 'gradient' | 'none';
  color?: string;
  opacity?: number;
}

/**
 * Normalized stroke style.
 */
export interface NormalizedStroke {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

/**
 * Computed shape metrics.
 */
export interface ShapeMetrics {
  /** Area in square pixels */
  area: number;

  /** Perimeter in pixels (approximated for complex shapes) */
  perimeter: number;

  /** Aspect ratio (width / height) */
  aspectRatio: number;

  /** Whether shape is approximately square */
  isSquare: boolean;

  /** Whether shape is oriented horizontally */
  isHorizontal: boolean;

  /** Center point */
  center: { x: number; y: number };
}

// =============================================================================
// EXTRACTION
// =============================================================================

/**
 * Extract and normalize shape data from a ShapeElement.
 */
export function extractShape(element: ShapeElement): ExtractedShape {
  const bounds = {
    x: element.position.x,
    y: element.position.y,
    width: element.position.width,
    height: element.position.height,
  };

  const fill = normalizeFill(element.fill, element.style.backgroundColor);
  const stroke = normalizeStroke(element.stroke, element.style);

  const hasText = Boolean(element.text || (element.runs && element.runs.length > 0));
  const metrics = computeShapeMetrics(element.shapeType, bounds);

  return {
    id: element.id,
    shapeType: element.shapeType,
    bounds,
    fill,
    stroke,
    text: element.text,
    runs: element.runs,
    hasText,
    pathData: element.pathData,
    metrics,
  };
}

/**
 * Normalize fill style from element.
 */
function normalizeFill(
  fill?: FillStyle,
  backgroundColor?: string
): NormalizedFill | undefined {
  if (fill?.type === 'solid' && fill.color) {
    return {
      type: 'solid',
      color: normalizeColor(fill.color),
    };
  }

  if (fill?.type === 'gradient') {
    return {
      type: 'gradient',
      // Use first gradient stop as primary color
      color: fill.gradient?.stops[0]?.color,
    };
  }

  if (backgroundColor && backgroundColor !== 'transparent') {
    return {
      type: 'solid',
      color: normalizeColor(backgroundColor),
    };
  }

  return undefined;
}

/**
 * Normalize stroke style from element.
 */
function normalizeStroke(
  stroke?: StrokeStyle,
  style?: ShapeElement['style']
): NormalizedStroke | undefined {
  if (stroke) {
    return {
      width: stroke.width,
      color: normalizeColor(stroke.color),
      style: stroke.style,
    };
  }

  // Try to get border from style
  if (style && (style.borderTopWidth ?? 0) > 0) {
    return {
      width: style.borderTopWidth ?? 1,
      color: normalizeColor(style.borderTopColor),
      style: normalizeBorderStyle(style.borderTopStyle),
    };
  }

  return undefined;
}

/**
 * Normalize a color value to hex without #.
 */
function normalizeColor(color?: string): string {
  if (!color) return '000000';

  // Remove # prefix if present
  if (color.startsWith('#')) {
    return color.slice(1).toUpperCase();
  }

  // Handle rgb/rgba
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]).toString(16).padStart(2, '0');
      const g = parseInt(match[1]).toString(16).padStart(2, '0');
      const b = parseInt(match[2]).toString(16).padStart(2, '0');
      return (r + g + b).toUpperCase();
    }
  }

  return color.toUpperCase();
}

/**
 * Normalize CSS border style to stroke style.
 */
function normalizeBorderStyle(style?: string): 'solid' | 'dashed' | 'dotted' {
  switch (style) {
    case 'dashed':
      return 'dashed';
    case 'dotted':
      return 'dotted';
    default:
      return 'solid';
  }
}

/**
 * Compute metrics for a shape.
 */
function computeShapeMetrics(
  shapeType: ShapeType,
  bounds: ExtractedShape['bounds']
): ShapeMetrics {
  const { width, height, x, y } = bounds;

  // Calculate approximate area based on shape type
  const area = calculateShapeArea(shapeType, width, height);

  // Calculate approximate perimeter
  const perimeter = calculateShapePerimeter(shapeType, width, height);

  // Calculate aspect ratio
  const aspectRatio = height > 0 ? width / height : 1;

  // Check if approximately square (within 10%)
  const isSquare = Math.abs(aspectRatio - 1) < 0.1;

  // Check if horizontally oriented
  const isHorizontal = aspectRatio > 1;

  // Calculate center point
  const center = {
    x: x + width / 2,
    y: y + height / 2,
  };

  return {
    area,
    perimeter,
    aspectRatio,
    isSquare,
    isHorizontal,
    center,
  };
}

/**
 * Calculate approximate area for different shape types.
 */
function calculateShapeArea(shapeType: ShapeType, width: number, height: number): number {
  switch (shapeType) {
    case 'ellipse':
      return Math.PI * (width / 2) * (height / 2);
    case 'triangle':
      return (width * height) / 2;
    case 'diamond':
      return (width * height) / 2;
    case 'star':
      // Approximate as 60% of bounding box
      return width * height * 0.6;
    case 'hexagon':
    case 'pentagon':
      // Approximate as 80% of bounding box
      return width * height * 0.8;
    case 'line':
      return 0;
    case 'arrow':
      return width * height * 0.5;
    case 'rectangle':
    case 'custom':
    default:
      return width * height;
  }
}

/**
 * Calculate approximate perimeter for different shape types.
 */
function calculateShapePerimeter(shapeType: ShapeType, width: number, height: number): number {
  switch (shapeType) {
    case 'ellipse': {
      // Ramanujan approximation
      const a = width / 2;
      const b = height / 2;
      return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    }
    case 'triangle': {
      // Approximate as isoceles
      const side = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height, 2));
      return width + 2 * side;
    }
    case 'line':
      return Math.sqrt(width * width + height * height);
    case 'rectangle':
      return 2 * width + 2 * height;
    case 'diamond': {
      const diag = Math.sqrt(width * width + height * height);
      return 2 * diag;
    }
    default:
      // Approximate as rectangle
      return 2 * width + 2 * height;
  }
}

// =============================================================================
// SHAPE TYPE UTILITIES
// =============================================================================

/**
 * Check if shape type is a geometric primitive.
 */
export function isPrimitiveShape(shapeType: ShapeType): boolean {
  return ['rectangle', 'ellipse', 'triangle', 'line'].includes(shapeType);
}

/**
 * Check if shape type is a polygon.
 */
export function isPolygonShape(shapeType: ShapeType): boolean {
  return ['rectangle', 'triangle', 'diamond', 'pentagon', 'hexagon'].includes(shapeType);
}

/**
 * Check if shape typically contains text.
 */
export function isTextContainerShape(shapeType: ShapeType): boolean {
  return ['rectangle', 'ellipse', 'diamond'].includes(shapeType);
}

/**
 * Get number of sides for polygon shapes.
 */
export function getPolygonSides(shapeType: ShapeType): number | null {
  switch (shapeType) {
    case 'triangle':
      return 3;
    case 'rectangle':
    case 'diamond':
      return 4;
    case 'pentagon':
      return 5;
    case 'hexagon':
      return 6;
    default:
      return null;
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a shape element.
 */
export function validateShape(element: ShapeElement): string[] {
  const errors: string[] = [];

  if (!element.shapeType) {
    errors.push('Shape must have a type');
  }

  if (!element.position) {
    errors.push('Shape must have a position');
  } else {
    if (element.position.width <= 0) {
      errors.push('Shape width must be positive');
    }
    if (element.position.height < 0) {
      errors.push('Shape height cannot be negative');
    }
  }

  if (element.shapeType === 'custom' && !element.pathData) {
    errors.push('Custom shape must have pathData');
  }

  return errors;
}

// =============================================================================
// TEXT EXTRACTION
// =============================================================================

/**
 * Extract plain text from shape.
 */
export function getShapeText(element: ShapeElement): string {
  if (element.text) {
    return element.text;
  }

  if (element.runs && element.runs.length > 0) {
    return element.runs.map(run => run.text).join('');
  }

  return '';
}

/**
 * Get text length in shape.
 */
export function getShapeTextLength(element: ShapeElement): number {
  return getShapeText(element).length;
}
