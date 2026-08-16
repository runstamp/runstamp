/**
 * Color Integrity: RGB to CMYK (Doc 2, Section 5)
 * ================================================
 *
 * Implements color space conversion with gamut mapping
 * for print-ready PDF output.
 *
 * Doc 2: "Colors that cannot be accurately reproduced in CMYK
 * are flagged and can optionally be replaced with an
 * out-of-gamut sentinel."
 */

import {
  HexColor,
  RGBColor,
  CMYKColor,
  ColorConversion,
  GamutStatus,
} from "./types";
import { hexToRgb } from "./design-tokens";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default out-of-gamut sentinel color */
const OUT_OF_GAMUT_SENTINEL: CMYKColor = { c: 100, m: 0, y: 100, k: 0 }; // Bright green

/** GCR (Grey Component Replacement) factor */
const GCR_FACTOR = 0.5;

/** Maximum ink density (total area coverage) */
const MAX_INK_DENSITY = 300; // Standard for coated paper

// =============================================================================
// COLOR SPACE CONVERSION
// =============================================================================

/**
 * Convert RGB to CMYK using standard conversion
 *
 * This uses a simple algorithmic conversion. For production use,
 * ICC profile-based conversion would be more accurate.
 */
export function rgbToCmyk(rgb: RGBColor): CMYKColor {
  // Normalize RGB to 0-1
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Calculate black (key) component
  const k = 1 - Math.max(r, g, b);

  // Handle pure black case
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  // Calculate CMY with black removed
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);

  // Convert to percentages
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

/**
 * Convert CMYK to RGB
 */
export function cmykToRgb(cmyk: CMYKColor): RGBColor {
  const c = cmyk.c / 100;
  const m = cmyk.m / 100;
  const y = cmyk.y / 100;
  const k = cmyk.k / 100;

  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

/**
 * Convert hex color to CMYK
 */
export function hexToCmyk(hex: HexColor): CMYKColor {
  const rgb = hexToRgb(hex);
  return rgbToCmyk(rgb);
}

/**
 * Apply GCR (Grey Component Replacement)
 *
 * Replaces equal amounts of CMY with black for better print quality.
 */
export function applyGCR(
  cmyk: CMYKColor,
  factor: number = GCR_FACTOR,
): CMYKColor {
  const min = Math.min(cmyk.c, cmyk.m, cmyk.y);
  const greyReplace = min * factor;

  return {
    c: Math.round(cmyk.c - greyReplace),
    m: Math.round(cmyk.m - greyReplace),
    y: Math.round(cmyk.y - greyReplace),
    k: Math.round(Math.min(100, cmyk.k + greyReplace)),
  };
}

/**
 * Check and limit total ink density
 */
export function limitInkDensity(
  cmyk: CMYKColor,
  maxDensity: number = MAX_INK_DENSITY,
): CMYKColor {
  const total = cmyk.c + cmyk.m + cmyk.y + cmyk.k;

  if (total <= maxDensity) {
    return cmyk;
  }

  const scale = maxDensity / total;
  return {
    c: Math.round(cmyk.c * scale),
    m: Math.round(cmyk.m * scale),
    y: Math.round(cmyk.y * scale),
    k: Math.round(cmyk.k * scale),
  };
}

// =============================================================================
// GAMUT CHECKING
// =============================================================================

/**
 * Approximate CMYK gamut boundary check
 *
 * In reality, gamut checking requires ICC profiles.
 * This is a simplified approximation based on common out-of-gamut colors.
 */
function isInGamut(rgb: RGBColor): boolean {
  // Highly saturated colors are often out of gamut
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  // Very bright, saturated colors are typically out of gamut
  // Especially bright greens, blues, and oranges
  if (saturation > 0.9 && max > 200) {
    // Bright saturated green (most problematic)
    if (rgb.g > rgb.r && rgb.g > rgb.b) {
      return false;
    }
    // Bright saturated blue
    if (rgb.b > 230 && rgb.g < 50) {
      return false;
    }
    // Bright saturated cyan
    if (rgb.g > 200 && rgb.b > 200 && rgb.r < 100) {
      return false;
    }
  }

  // Neon colors are out of gamut
  if (rgb.r > 230 && rgb.g < 100 && rgb.b > 230) {
    // Magenta
    return false;
  }

  return true;
}

/**
 * Calculate Delta E (color difference) between original and converted
 *
 * Uses CIE76 formula for simplicity. CIE2000 would be more accurate.
 */
function calculateDeltaE(rgb1: RGBColor, rgb2: RGBColor): number {
  // Convert to Lab (simplified)
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);

  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2),
  );
}

/**
 * Convert RGB to Lab (simplified conversion)
 */
function rgbToLab(rgb: RGBColor): { l: number; a: number; b: number } {
  // Normalize
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // RGB to XYZ
  let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  // XYZ to Lab
  x = x / 0.95047;
  y = y / 1.0;
  z = z / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

// =============================================================================
// COLOR CONVERTER
// =============================================================================

/**
 * ColorIntegrityConverter - Full color space conversion with gamut mapping
 */
export class ColorIntegrityConverter {
  private useGCR: boolean;
  private maxInkDensity: number;
  private sentinelColor: CMYKColor;
  private useSentinel: boolean;

  constructor(
    options: {
      useGCR?: boolean;
      maxInkDensity?: number;
      sentinelColor?: CMYKColor;
      useSentinel?: boolean;
    } = {},
  ) {
    this.useGCR = options.useGCR ?? true;
    this.maxInkDensity = options.maxInkDensity ?? MAX_INK_DENSITY;
    this.sentinelColor = options.sentinelColor ?? OUT_OF_GAMUT_SENTINEL;
    this.useSentinel = options.useSentinel ?? false;
  }

  /**
   * Convert RGB to print-ready CMYK
   */
  convertRgbToCmyk(rgb: RGBColor): ColorConversion {
    // Basic conversion
    let cmyk = rgbToCmyk(rgb);
    let gamutStatus: GamutStatus = "in-gamut";

    // Check gamut
    if (!isInGamut(rgb)) {
      gamutStatus = "out-of-gamut";

      if (this.useSentinel) {
        return {
          original: rgb,
          cmyk: this.sentinelColor,
          gamutStatus,
          deltaE: 100, // Arbitrary high value for sentinel
        };
      }
      gamutStatus = "clipped";
    }

    // Apply GCR
    if (this.useGCR) {
      cmyk = applyGCR(cmyk);
    }

    // Limit ink density
    cmyk = limitInkDensity(cmyk, this.maxInkDensity);

    // Calculate Delta E (round-trip accuracy)
    const reconverted = cmykToRgb(cmyk);
    const deltaE = calculateDeltaE(rgb, reconverted);

    return {
      original: rgb,
      cmyk,
      gamutStatus,
      deltaE,
    };
  }

  /**
   * Convert hex color to print-ready CMYK
   */
  convertHexToCmyk(hex: HexColor): ColorConversion {
    const rgb = hexToRgb(hex);
    return this.convertRgbToCmyk(rgb);
  }

  /**
   * Batch convert multiple colors
   */
  convertBatch(colors: HexColor[]): ColorConversion[] {
    return colors.map((hex) => this.convertHexToCmyk(hex));
  }

  /**
   * Get CMYK CSS string
   */
  getCmykCss(cmyk: CMYKColor): string {
    // CSS doesn't support CMYK directly, return device-cmyk for print stylesheets
    return `device-cmyk(${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%)`;
  }

  /**
   * Format CMYK as PDF color
   */
  getCmykPdfString(cmyk: CMYKColor): string {
    return `${cmyk.c / 100} ${cmyk.m / 100} ${cmyk.y / 100} ${cmyk.k / 100} k`;
  }
}

// =============================================================================
// COLOR PALETTE CONVERTER
// =============================================================================

/**
 * ColorPaletteConverter - Convert entire theme palettes
 */
export class ColorPaletteConverter {
  private converter: ColorIntegrityConverter;

  constructor(converter?: ColorIntegrityConverter) {
    this.converter = converter || new ColorIntegrityConverter();
  }

  /**
   * Convert a palette of colors
   */
  convertPalette(
    palette: Record<string, HexColor>,
  ): Record<string, ColorConversion> {
    const result: Record<string, ColorConversion> = {};

    for (const [key, hex] of Object.entries(palette)) {
      result[key] = this.converter.convertHexToCmyk(hex);
    }

    return result;
  }

  /**
   * Get gamut warnings for a palette
   */
  getGamutWarnings(palette: Record<string, HexColor>): Array<{
    key: string;
    color: HexColor;
    status: GamutStatus;
  }> {
    const warnings: Array<{
      key: string;
      color: HexColor;
      status: GamutStatus;
    }> = [];

    for (const [key, hex] of Object.entries(palette)) {
      const conversion = this.converter.convertHexToCmyk(hex);
      if (conversion.gamutStatus !== "in-gamut") {
        warnings.push({
          key,
          color: hex,
          status: conversion.gamutStatus,
        });
      }
    }

    return warnings;
  }

  /**
   * Generate print-safe palette with alternatives for out-of-gamut colors
   */
  generatePrintSafePalette(
    palette: Record<string, HexColor>,
    alternatives?: Record<string, HexColor>,
  ): Record<string, HexColor> {
    const result: Record<string, HexColor> = {};

    for (const [key, hex] of Object.entries(palette)) {
      const conversion = this.converter.convertHexToCmyk(hex);

      if (conversion.gamutStatus === "in-gamut") {
        result[key] = hex;
      } else if (alternatives && alternatives[key]) {
        result[key] = alternatives[key];
      } else {
        // Keep original but mark it (could be replaced with desaturated version)
        result[key] = hex;
      }
    }

    return result;
  }
}

// =============================================================================
// SPOT COLOR SUPPORT
// =============================================================================

/** Spot color definition */
export interface SpotColor {
  name: string;
  fallbackCmyk: CMYKColor;
  fallbackRgb: RGBColor;
}

/** Common spot colors */
export const SPOT_COLORS: Record<string, SpotColor> = {
  "PANTONE-Black": {
    name: "PANTONE Black C",
    fallbackCmyk: { c: 0, m: 0, y: 0, k: 100 },
    fallbackRgb: { r: 0, g: 0, b: 0 },
  },
  "PANTONE-Reflex-Blue": {
    name: "PANTONE Reflex Blue C",
    fallbackCmyk: { c: 100, m: 82, y: 0, k: 0 },
    fallbackRgb: { r: 0, g: 51, b: 160 },
  },
  "PANTONE-Warm-Red": {
    name: "PANTONE Warm Red C",
    fallbackCmyk: { c: 0, m: 83, y: 87, k: 0 },
    fallbackRgb: { r: 249, g: 66, b: 58 },
  },
  "PANTONE-Yellow": {
    name: "PANTONE Yellow C",
    fallbackCmyk: { c: 0, m: 0, y: 100, k: 0 },
    fallbackRgb: { r: 254, g: 221, b: 0 },
  },
};

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Default color integrity converter */
export const colorIntegrityConverter = new ColorIntegrityConverter();

/** Default palette converter */
export const paletteConverter = new ColorPaletteConverter(
  colorIntegrityConverter,
);
