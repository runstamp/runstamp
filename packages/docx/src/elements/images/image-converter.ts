/**
 * Image Converter for DOCX
 * ========================
 * Converts unsupported image formats (WebP, HEIC) to Word-compatible formats (PNG).
 *
 * DOCX supports PNG, JPEG, GIF, and BMP. WebP and HEIC require conversion.
 * This module provides:
 * 1. A registry for image converters (using sharp or other libraries)
 * 2. Format detection and conversion functions
 *
 * Usage:
 * ```typescript
 * import { registerImageConverter, convertImage } from '@runstamp/polyglot-docx';
 *
 * // Register a converter (e.g., using sharp)
 * registerImageConverter(async (buffer, sourceFormat, options) => {
 *   const sharp = require('sharp');
 *   const output = await sharp(buffer)
 *     .png({ compressionLevel: 6 })
 *     .toBuffer();
 *   return { data: output, format: 'png' };
 * });
 *
 * // Now WebP/HEIC images will automatically be converted
 * const result = await convertImage(webpBuffer, 'webp', { targetFormat: 'png' });
 * ```
 */

import type { ImageType } from './extractor';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Formats that require conversion for Word compatibility.
 */
export type ConvertibleFormat = 'webp' | 'heic' | 'svg';

/**
 * Target formats supported by Word.
 */
export type WordCompatibleFormat = 'png' | 'jpeg';

/**
 * Options for image conversion.
 */
export interface ImageConvertOptions {
  /** Target format (default: 'png') */
  targetFormat?: WordCompatibleFormat;
  /** Target width in pixels (optional, maintains aspect ratio) */
  width?: number;
  /** Target height in pixels (optional, maintains aspect ratio) */
  height?: number;
  /** JPEG quality if target is jpeg (default: 90) */
  quality?: number;
  /** PNG compression level (default: 6) */
  compressionLevel?: number;
}

/**
 * Result of image conversion.
 */
export interface ConvertedImage {
  /** Converted image data as Buffer */
  data: Buffer;
  /** Output format */
  format: WordCompatibleFormat;
  /** Width after conversion */
  width?: number;
  /** Height after conversion */
  height?: number;
}

/**
 * Image converter function signature.
 * Implement this to provide custom image conversion.
 */
export type ImageConverter = (
  buffer: Buffer,
  sourceFormat: ConvertibleFormat,
  options: Required<ImageConvertOptions>
) => Promise<ConvertedImage>;

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: Required<ImageConvertOptions> = {
  targetFormat: 'png',
  width: 0, // 0 means preserve original
  height: 0,
  quality: 90,
  compressionLevel: 6,
};

/**
 * Formats that need conversion for DOCX compatibility.
 */
export const FORMATS_NEEDING_CONVERSION: ConvertibleFormat[] = ['webp', 'heic', 'svg'];

// =============================================================================
// REGISTRY
// =============================================================================

let globalImageConverter: ImageConverter | undefined;

/**
 * Register a custom image converter.
 *
 * Example using sharp:
 * ```typescript
 * import sharp from 'sharp';
 *
 * registerImageConverter(async (buffer, sourceFormat, options) => {
 *   let pipeline = sharp(buffer);
 *
 *   // Resize if dimensions specified
 *   if (options.width > 0 || options.height > 0) {
 *     pipeline = pipeline.resize(
 *       options.width || undefined,
 *       options.height || undefined,
 *       { fit: 'inside', withoutEnlargement: true }
 *     );
 *   }
 *
 *   // Convert to target format
 *   if (options.targetFormat === 'jpeg') {
 *     pipeline = pipeline.jpeg({ quality: options.quality });
 *   } else {
 *     pipeline = pipeline.png({ compressionLevel: options.compressionLevel });
 *   }
 *
 *   const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
 *   return {
 *     data,
 *     format: options.targetFormat,
 *     width: info.width,
 *     height: info.height,
 *   };
 * });
 * ```
 */
export function registerImageConverter(converter: ImageConverter): void {
  globalImageConverter = converter;
}

/**
 * Clear the registered image converter.
 */
export function clearImageConverter(): void {
  globalImageConverter = undefined;
}

/**
 * Check if an image converter is registered.
 */
export function hasImageConverter(): boolean {
  return globalImageConverter !== undefined;
}

// =============================================================================
// CONVERSION
// =============================================================================

/**
 * Check if a format needs conversion for DOCX compatibility.
 */
export function needsConversion(format: ImageType): format is ConvertibleFormat {
  return FORMATS_NEEDING_CONVERSION.includes(format as ConvertibleFormat);
}

/**
 * Convert an image to a Word-compatible format.
 *
 * @param buffer - Image buffer to convert
 * @param sourceFormat - Original format (webp, heic, svg)
 * @param options - Conversion options
 * @returns Converted image or null if no converter registered
 */
export async function convertImage(
  buffer: Buffer,
  sourceFormat: ConvertibleFormat,
  options: ImageConvertOptions = {}
): Promise<ConvertedImage | null> {
  if (!globalImageConverter) {
    return null;
  }

  const opts: Required<ImageConvertOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  try {
    return await globalImageConverter(buffer, sourceFormat, opts);
  } catch (error) {
    // Conversion failed
    console.warn(
      `Image conversion failed for ${sourceFormat}:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Get information about conversion capability.
 */
export function getConversionStatus(): {
  hasConverter: boolean;
  supportedFormats: ConvertibleFormat[];
} {
  return {
    hasConverter: hasImageConverter(),
    supportedFormats: FORMATS_NEEDING_CONVERSION,
  };
}
