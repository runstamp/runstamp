/**
 * Shape Generator for DOCX
 * ========================
 * Generates shape representations for DOCX documents.
 *
 * Provides multiple output formats:
 * 1. **SVG** - For preview, conversion to PNG, or external rendering
 * 2. **VML** - Legacy format still supported in DOCX
 * 3. **DrawingML** - Modern OOXML shape format (complex)
 *
 * The recommended approach for shapes in DOCX:
 * - Simple shapes (rectangles, lines) → Use paragraph styling
 * - Shapes with text → Use text boxes (styled paragraphs)
 * - Complex shapes → Generate SVG → Convert to PNG → Embed as image
 */

import type { ShapeElement, ShapeType, FillStyle, StrokeStyle } from '../../types';
import { DOCXError, DOCXErrorCode } from '../../errors.js';
import { escapeXml } from '../../utils/xml.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * SVG generation options.
 */
export interface ShapeSVGOptions {
  /** Include shape dimensions in viewBox (default: true) */
  useViewBox?: boolean;
  /** Padding around the shape (default: 2) */
  padding?: number;
  /** Default fill color if not specified (default: '#FFFFFF') */
  defaultFill?: string;
  /** Default stroke color if not specified (default: '#000000') */
  defaultStroke?: string;
  /** Default stroke width if not specified (default: 1) */
  defaultStrokeWidth?: number;
}

/**
 * VML generation options.
 */
export interface ShapeVMLOptions {
  /** Include wrapper elements (default: true) */
  includeWrapper?: boolean;
  /** VML namespace prefix (default: 'v') */
  namespacePrefix?: string;
}

/**
 * Shape image callback for custom rendering.
 */
export type ShapeImageRenderer = (element: ShapeElement) => Promise<{
  data: Buffer | string;
  width: number;
  height: number;
  format: 'png' | 'jpg';
} | null>;

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SVG_OPTIONS: Required<ShapeSVGOptions> = {
  useViewBox: true,
  padding: 2,
  defaultFill: '#FFFFFF',
  defaultStroke: '#000000',
  defaultStrokeWidth: 1,
};

// =============================================================================
// SVG GENERATION
// =============================================================================

/**
 * Generate an SVG representation of a shape.
 */
export function generateShapeSVG(
  element: ShapeElement,
  options: ShapeSVGOptions = {}
): string {
  const opts = { ...DEFAULT_SVG_OPTIONS, ...options };
  const { width, height } = element.position;
  const padding = opts.padding;
  const totalWidth = width + padding * 2;
  const totalHeight = height + padding * 2;

  const fill = getFillValue(element.fill, opts.defaultFill);
  const stroke = getStrokeValue(element.stroke, opts.defaultStroke);
  const strokeWidth = element.stroke?.width ?? opts.defaultStrokeWidth;

  let svgContent: string;

  switch (element.shapeType) {
    case 'rectangle':
      svgContent = generateRectangleSVG(width, height, padding, fill, stroke, strokeWidth, element.style.borderRadius);
      break;
    case 'ellipse':
      svgContent = generateEllipseSVG(width, height, padding, fill, stroke, strokeWidth);
      break;
    case 'triangle':
      svgContent = generateTriangleSVG(width, height, padding, fill, stroke, strokeWidth);
      break;
    case 'diamond':
      svgContent = generateDiamondSVG(width, height, padding, fill, stroke, strokeWidth);
      break;
    case 'pentagon':
      svgContent = generatePolygonSVG(width, height, padding, fill, stroke, strokeWidth, 5);
      break;
    case 'hexagon':
      svgContent = generatePolygonSVG(width, height, padding, fill, stroke, strokeWidth, 6);
      break;
    case 'star':
      svgContent = generateStarSVG(width, height, padding, fill, stroke, strokeWidth);
      break;
    case 'arrow':
      svgContent = generateArrowSVG(width, height, padding, fill, stroke, strokeWidth);
      break;
    case 'line':
      svgContent = generateLineSVG(width, height, padding, stroke, strokeWidth);
      break;
    case 'custom':
      if (element.pathData) {
        svgContent = `<path d="${escapeXml(element.pathData)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
      } else {
        svgContent = generateRectangleSVG(width, height, padding, fill, stroke, strokeWidth, 0);
      }
      break;
    default:
      svgContent = generateRectangleSVG(width, height, padding, fill, stroke, strokeWidth, 0);
  }

  // Add text content if present
  if (element.text) {
    const textY = totalHeight / 2;
    const fontSize = element.style.fontSize || 12;
    const textColor = element.style.color || '#000000';
    svgContent += `<text x="${totalWidth / 2}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="${textColor}">${escapeXml(element.text)}</text>`;
  }

  const viewBox = opts.useViewBox ? `viewBox="0 0 ${totalWidth} ${totalHeight}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" ${viewBox}>${svgContent}</svg>`;
}

/**
 * Generate SVG for a rectangle.
 */
function generateRectangleSVG(
  width: number,
  height: number,
  padding: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  borderRadius?: number
): string {
  const rx = borderRadius ? Math.min(borderRadius, width / 2, height / 2) : 0;
  return `<rect x="${padding}" y="${padding}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Generate SVG for an ellipse.
 */
function generateEllipseSVG(
  width: number,
  height: number,
  padding: number,
  fill: string,
  stroke: string,
  strokeWidth: number
): string {
  const cx = padding + width / 2;
  const cy = padding + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Generate SVG for a triangle.
 */
function generateTriangleSVG(
  width: number,
  height: number,
  padding: number,
  fill: string,
  stroke: string,
  strokeWidth: number
): string {
  const points = [
    `${padding + width / 2},${padding}`, // Top center
    `${padding + width},${padding + height}`, // Bottom right
    `${padding},${padding + height}`, // Bottom left
  ].join(' ');
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Generate SVG for a diamond.
 */
function generateDiamondSVG(
  width: number,
  height: number,
  padding: number,
  fill: string,
  stroke: string,
  strokeWidth: number
): string {
  const points = [
    `${padding + width / 2},${padding}`, // Top
    `${padding + width},${padding + height / 2}`, // Right
    `${padding + width / 2},${padding + height}`, // Bottom
    `${padding},${padding + height / 2}`, // Left
  ].join(' ');
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Generate SVG for a regular polygon.
 */
function generatePolygonSVG(
  width: number,
  height: number,
  padding: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  sides: number
): string {
  const cx = padding + width / 2;
  const cy = padding + height / 2;
  const rx = width / 2;
  const ry = height / 2;

  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; // Start at top
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return `<polygon points="${points.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Generate SVG for a 5-pointed star.
 */
function generateStarSVG(
  width: number,
  height: number,
  padding: number,
  fill: string,
  stroke: string,
  strokeWidth: number
): string {
  const cx = padding + width / 2;
  const cy = padding + height / 2;
  const outerR = Math.min(width, height) / 2;
  const innerR = outerR * 0.4;

  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return `<polygon points="${points.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Generate SVG for an arrow.
 */
function generateArrowSVG(
  width: number,
  height: number,
  padding: number,
  fill: string,
  stroke: string,
  strokeWidth: number
): string {
  const arrowBodyWidth = height * 0.3;
  const arrowBodyHeight = width * 0.6;

  const cy = padding + height / 2;

  // Arrow pointing right
  const points = [
    `${padding + arrowBodyHeight},${cy - arrowBodyWidth / 2}`, // Body top-left
    `${padding + arrowBodyHeight},${padding}`, // Head base top
    `${padding + width},${cy}`, // Arrow tip
    `${padding + arrowBodyHeight},${padding + height}`, // Head base bottom
    `${padding + arrowBodyHeight},${cy + arrowBodyWidth / 2}`, // Body bottom-left
    `${padding},${cy + arrowBodyWidth / 2}`, // Body bottom-right
    `${padding},${cy - arrowBodyWidth / 2}`, // Body top-right
  ].join(' ');

  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Generate SVG for a line.
 */
function generateLineSVG(
  width: number,
  height: number,
  padding: number,
  stroke: string,
  strokeWidth: number
): string {
  return `<line x1="${padding}" y1="${padding + height / 2}" x2="${padding + width}" y2="${padding + height / 2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

// =============================================================================
// VML GENERATION
// =============================================================================

/**
 * Generate VML (Vector Markup Language) for a shape.
 * VML is legacy but still supported in DOCX for backwards compatibility.
 */
export function generateShapeVML(
  element: ShapeElement,
  options: ShapeVMLOptions = {}
): string {
  const { includeWrapper = true, namespacePrefix = 'v' } = options;
  const { width, height } = element.position;
  const v = namespacePrefix;

  const fill = getFillValue(element.fill, '#FFFFFF');
  const stroke = getStrokeValue(element.stroke, '#000000');
  const strokeWeight = element.stroke?.width ?? 1;

  let shapeVML: string;

  switch (element.shapeType) {
    case 'rectangle':
      shapeVML = `<${v}:rect style="width:${width}pt;height:${height}pt">
        <${v}:fill color="${fill}"/>
        <${v}:stroke color="${stroke}" weight="${strokeWeight}pt"/>
      </${v}:rect>`;
      break;
    case 'ellipse':
      shapeVML = `<${v}:oval style="width:${width}pt;height:${height}pt">
        <${v}:fill color="${fill}"/>
        <${v}:stroke color="${stroke}" weight="${strokeWeight}pt"/>
      </${v}:oval>`;
      break;
    case 'line':
      shapeVML = `<${v}:line from="0,${height / 2}pt" to="${width}pt,${height / 2}pt">
        <${v}:stroke color="${stroke}" weight="${strokeWeight}pt"/>
      </${v}:line>`;
      break;
    default:
      // For other shapes, use a generic path or rect fallback
      shapeVML = `<${v}:rect style="width:${width}pt;height:${height}pt">
        <${v}:fill color="${fill}"/>
        <${v}:stroke color="${stroke}" weight="${strokeWeight}pt"/>
        <${v}:textbox>${element.text ? escapeXml(element.text) : ''}</${v}:textbox>
      </${v}:rect>`;
  }

  if (includeWrapper) {
    return `<w:pict xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      ${shapeVML}
    </w:pict>`;
  }

  return shapeVML;
}

// =============================================================================
// DATA URI GENERATION
// =============================================================================

/**
 * Convert shape element to an SVG data URI.
 */
export function shapeToSVGDataUri(
  element: ShapeElement,
  options?: ShapeSVGOptions
): string {
  const svg = generateShapeSVG(element, options);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// =============================================================================
// SHAPE RENDERER REGISTRY
// =============================================================================

let globalShapeRenderer: ShapeImageRenderer | undefined;

/**
 * Register a custom shape image renderer.
 * This allows converting shapes to images using external tools (sharp, canvas, etc.)
 */
export function registerShapeImageRenderer(renderer: ShapeImageRenderer): void {
  globalShapeRenderer = renderer;
}

/**
 * Clear the registered shape image renderer.
 */
export function clearShapeImageRenderer(): void {
  globalShapeRenderer = undefined;
}

/**
 * Render a shape to an image using the registered renderer.
 */
export async function renderShapeToImage(
  element: ShapeElement
): Promise<{ data: Buffer | string; width: number; height: number; format: 'png' | 'jpg' } | null> {
  if (!globalShapeRenderer) {
    return null;
  }
  return globalShapeRenderer(element);
}

/**
 * Check if a shape image renderer is registered.
 */
export function hasShapeImageRenderer(): boolean {
  return globalShapeRenderer !== undefined;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get fill color value.
 */
function getFillValue(fill?: FillStyle, defaultFill: string = '#FFFFFF'): string {
  if (!fill) return defaultFill;
  if (fill.type === 'solid' && fill.color) return fill.color;
  if (fill.type === 'gradient' && fill.gradient?.stops.length) {
    return fill.gradient.stops[0].color;
  }
  // No fill color specified - use default
  return defaultFill;
}

/**
 * Get stroke color value.
 */
function getStrokeValue(stroke?: StrokeStyle, defaultStroke: string = '#000000'): string {
  return stroke?.color || defaultStroke;
}

// =============================================================================
// SHAPE CAPABILITY CHECKS
// =============================================================================

/**
 * Check if a shape can be rendered natively in DOCX.
 * Only rectangles and lines have good native support via paragraph styling.
 */
export function canRenderShapeNatively(shapeType: ShapeType): boolean {
  return shapeType === 'rectangle' || shapeType === 'line';
}

/**
 * Check if a shape should be rendered as an image for better fidelity.
 */
export function shouldRenderShapeAsImage(shapeType: ShapeType): boolean {
  return ['ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'arrow', 'custom'].includes(shapeType);
}

/**
 * Get the recommended rendering approach for a shape.
 * Throws if the shape cannot be rendered with available capabilities.
 */
export function getRecommendedRenderingApproach(
  element: ShapeElement
): 'paragraph' | 'text-box' | 'image' {
  const hasText = Boolean(element.text || (element.runs && element.runs.length > 0));

  if (hasText) {
    return 'text-box';
  }

  if (canRenderShapeNatively(element.shapeType)) {
    return 'paragraph';
  }

  if (hasShapeImageRenderer()) {
    return 'image';
  }

  throw new DOCXError(
    DOCXErrorCode.SHAPE_RENDER_FAILED,
    `Cannot render shape "${element.shapeType}": No image renderer registered. ` +
    `DOCX only natively supports rectangle and line shapes. ` +
    `To render complex shapes, install 'sharp' and use async rendering with registerShapeImageRenderer().`,
    {
      recovery: "Install sharp or register a shape image renderer before rendering complex shapes.",
      context: { shapeType: element.shapeType },
    },
  );
}
