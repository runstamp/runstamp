/**
 * SVG Rasterizer for DOCX
 * =======================
 * Converts SVG images to raster formats (PNG) for DOCX embedding.
 *
 * DOCX does not natively support SVG images. This module provides:
 * 1. A registry for custom SVG rasterizers (sharp, canvas, puppeteer, etc.)
 * 2. Helper functions for SVG processing
 * 3. Dimension detection from SVG content
 *
 * Usage:
 * ```typescript
 * import { registerSVGRasterizer, rasterizeSVG } from '@runstamp/polyglot-docx';
 *
 * // Register a custom rasterizer (e.g., using sharp)
 * registerSVGRasterizer(async (svg, options) => {
 *   const sharp = require('sharp');
 *   const buffer = await sharp(Buffer.from(svg))
 *     .resize(options.width, options.height)
 *     .png()
 *     .toBuffer();
 *   return { data: buffer, width: options.width, height: options.height };
 * });
 *
 * // Now SVG images will automatically be converted to PNG
 * const result = await rasterizeSVG(svgString, { width: 400, height: 300 });
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for SVG rasterization.
 */
export interface SVGRasterizeOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Scale factor (default: 2 for retina quality) */
  scale?: number;
  /** Background color (default: transparent) */
  backgroundColor?: string;
  /** Output format (default: 'png') */
  format?: 'png' | 'jpeg';
  /** JPEG quality if format is 'jpeg' (default: 90) */
  quality?: number;
}

/**
 * Result of SVG rasterization.
 */
export interface RasterizedImage {
  /** Image data as Buffer */
  data: Buffer;
  /** Width of the rasterized image */
  width: number;
  /** Height of the rasterized image */
  height: number;
  /** Format of the output */
  format: 'png' | 'jpeg';
}

/**
 * SVG rasterizer function signature.
 * Implement this to provide custom SVG-to-raster conversion.
 */
export type SVGRasterizer = (
  svg: string,
  options: Required<SVGRasterizeOptions>
) => Promise<RasterizedImage>;

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: Required<SVGRasterizeOptions> = {
  width: 400,
  height: 300,
  scale: 2,
  backgroundColor: 'transparent',
  format: 'png',
  quality: 90,
};

// =============================================================================
// REGISTRY
// =============================================================================

let globalSVGRasterizer: SVGRasterizer | undefined;

/**
 * Register a custom SVG rasterizer.
 *
 * Example using sharp:
 * ```typescript
 * import sharp from 'sharp';
 *
 * registerSVGRasterizer(async (svg, options) => {
 *   const buffer = await sharp(Buffer.from(svg), { density: 72 * options.scale })
 *     .resize(options.width * options.scale, options.height * options.scale)
 *     .png()
 *     .toBuffer();
 *   return {
 *     data: buffer,
 *     width: options.width * options.scale,
 *     height: options.height * options.scale,
 *     format: 'png',
 *   };
 * });
 * ```
 *
 * Example using canvas (node-canvas):
 * ```typescript
 * import { createCanvas, loadImage } from 'canvas';
 *
 * registerSVGRasterizer(async (svg, options) => {
 *   const canvas = createCanvas(options.width * options.scale, options.height * options.scale);
 *   const ctx = canvas.getContext('2d');
 *   const img = await loadImage(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
 *   ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
 *   return {
 *     data: canvas.toBuffer('image/png'),
 *     width: canvas.width,
 *     height: canvas.height,
 *     format: 'png',
 *   };
 * });
 * ```
 */
export function registerSVGRasterizer(rasterizer: SVGRasterizer): void {
  globalSVGRasterizer = rasterizer;
}

/**
 * Clear the registered SVG rasterizer.
 */
export function clearSVGRasterizer(): void {
  globalSVGRasterizer = undefined;
}

/**
 * Check if an SVG rasterizer is registered.
 */
export function hasSVGRasterizer(): boolean {
  return globalSVGRasterizer !== undefined;
}

// =============================================================================
// RASTERIZATION
// =============================================================================

/**
 * Rasterize an SVG string to a PNG or JPEG image.
 * Returns null if no rasterizer is registered.
 */
export async function rasterizeSVG(
  svg: string,
  options: SVGRasterizeOptions = {}
): Promise<RasterizedImage | null> {
  if (!globalSVGRasterizer) {
    return null;
  }

  // Detect dimensions from SVG if not specified
  const detectedDimensions = extractSVGDimensions(svg);

  const opts: Required<SVGRasterizeOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    width: options.width ?? detectedDimensions.width ?? DEFAULT_OPTIONS.width,
    height: options.height ?? detectedDimensions.height ?? DEFAULT_OPTIONS.height,
  };

  return globalSVGRasterizer(svg, opts);
}

/**
 * Rasterize an SVG data URI to a PNG or JPEG image.
 * Returns null if no rasterizer is registered or the data URI is invalid.
 */
export async function rasterizeSVGDataUri(
  dataUri: string,
  options: SVGRasterizeOptions = {}
): Promise<RasterizedImage | null> {
  const svg = extractSVGFromDataUri(dataUri);
  if (!svg) {
    return null;
  }
  return rasterizeSVG(svg, options);
}

// =============================================================================
// SVG UTILITIES
// =============================================================================

/**
 * Extract SVG content from a data URI.
 */
export function extractSVGFromDataUri(dataUri: string): string | null {
  if (!dataUri.startsWith('data:image/svg+xml')) {
    return null;
  }

  // Handle base64 encoding
  if (dataUri.includes(';base64,')) {
    const base64 = dataUri.split(';base64,')[1];
    try {
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
      return null;
    }
  }

  // Handle URL encoding
  if (dataUri.includes(',')) {
    const encoded = dataUri.split(',')[1];
    try {
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Detected SVG dimensions.
 */
export interface SVGDimensions {
  width: number | null;
  height: number | null;
  viewBox: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Extract dimensions from SVG content.
 */
export function extractSVGDimensions(svg: string): SVGDimensions {
  const result: SVGDimensions = {
    width: null,
    height: null,
    viewBox: null,
  };

  // Extract width attribute
  const widthMatch = svg.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)(px|pt|em|%)?["']?/i);
  if (widthMatch) {
    result.width = parseFloat(widthMatch[1]);
  }

  // Extract height attribute
  const heightMatch = svg.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)(px|pt|em|%)?["']?/i);
  if (heightMatch) {
    result.height = parseFloat(heightMatch[1]);
  }

  // Extract viewBox
  const viewBoxMatch = svg.match(/viewBox\s*=\s*["']?\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']?/i);
  if (viewBoxMatch) {
    result.viewBox = {
      x: parseFloat(viewBoxMatch[1]),
      y: parseFloat(viewBoxMatch[2]),
      width: parseFloat(viewBoxMatch[3]),
      height: parseFloat(viewBoxMatch[4]),
    };

    // Use viewBox dimensions if width/height not specified
    if (result.width === null && result.viewBox.width > 0) {
      result.width = result.viewBox.width;
    }
    if (result.height === null && result.viewBox.height > 0) {
      result.height = result.viewBox.height;
    }
  }

  return result;
}

/**
 * Check if a string contains valid SVG content.
 */
export function isValidSVG(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml') && trimmed.includes('<svg');
}

/**
 * Check if a data URI is an SVG.
 */
export function isSVGDataUri(dataUri: string): boolean {
  return dataUri.startsWith('data:image/svg+xml');
}

/**
 * Normalize SVG content for consistent processing.
 * - Ensures proper XML declaration
 * - Adds default namespace if missing
 */
export function normalizeSVG(svg: string): string {
  let normalized = svg.trim();

  // Add XML declaration if missing
  if (!normalized.startsWith('<?xml')) {
    normalized = '<?xml version="1.0" encoding="UTF-8"?>\n' + normalized;
  }

  // Add xmlns if missing
  if (!normalized.includes('xmlns=')) {
    normalized = normalized.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return normalized;
}

/**
 * Calculate aspect ratio from SVG dimensions.
 */
export function getSVGAspectRatio(svg: string): number {
  const dims = extractSVGDimensions(svg);

  if (dims.width && dims.height && dims.width > 0 && dims.height > 0) {
    return dims.width / dims.height;
  }

  if (dims.viewBox && dims.viewBox.width > 0 && dims.viewBox.height > 0) {
    return dims.viewBox.width / dims.viewBox.height;
  }

  return 1; // Default to square
}

/**
 * Calculate dimensions maintaining aspect ratio.
 */
export function calculateSVGRasterDimensions(
  svg: string,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const dims = extractSVGDimensions(svg);
  const aspectRatio = getSVGAspectRatio(svg);

  let width = dims.width ?? maxWidth;
  let height = dims.height ?? maxHeight;

  // Constrain to max dimensions while maintaining aspect ratio
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
