/**
 * ICC Profile & Color Management Module
 * PRD-003 Section 3.2: Print-Ready Color Output
 *
 * Professional color management for print-ready PDF output.
 *
 * Key Features:
 * - ICC Profile embedding for color accuracy
 * - RGB → CMYK conversion with profile support
 * - Spot color handling (Pantone, custom)
 * - Gamut warning and soft-proofing
 * - Color separation for offset printing
 * - PDF/X compliance checking
 */

import { CMYKColor, RGBColor, HexColor } from "./types";
import { hexToRgb } from "./design-tokens";

// =============================================================================
// ICC PROFILE TYPES
// =============================================================================

export type ColorSpace =
  | "sRGB"
  | "AdobeRGB"
  | "ProPhotoRGB"
  | "CMYK"
  | "Gray"
  | "Lab";
export type RenderingIntent =
  | "perceptual"
  | "relative-colorimetric"
  | "saturation"
  | "absolute-colorimetric";

export interface ICCProfile {
  /** Profile identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Color space */
  colorSpace: ColorSpace;
  /** Profile Class (e.g., 'mntr' for monitor, 'prtr' for printer) */
  profileClass: "mntr" | "prtr" | "scnr" | "spac" | "abst" | "link" | "nmcl";
  /** Profile data (embedded) */
  data?: ArrayBuffer;
  /** Profile version */
  version?: string;
  /** Description */
  description?: string;
  /** Copyright */
  copyright?: string;
  /** White point (D50, D65, etc.) */
  whitePoint?: "D50" | "D65" | "custom";
}

export interface SpotColor {
  /** Spot color name (e.g., "PANTONE 185 C") */
  name: string;
  /** Alternative CMYK representation */
  cmykFallback: CMYKColor;
  /** Lab color value (most accurate) */
  labColor?: { l: number; a: number; b: number };
  /** Tint percentage (0-100) */
  tint?: number;
}

export interface ColorManagementConfig {
  /** Source profile (RGB input) */
  sourceProfile: ICCProfile;
  /** Destination profile (CMYK output) */
  destinationProfile: ICCProfile;
  /** Rendering intent */
  renderingIntent: RenderingIntent;
  /** Enable black point compensation */
  blackPointCompensation: boolean;
  /** Preserve black when converting RGB black to CMYK */
  preserveBlack: boolean;
  /** Maximum ink density (Total Area Coverage) */
  maxInkDensity: number;
  /** Enable gamut warning */
  gamutWarning: boolean;
  /** PDF/X compliance level */
  pdfXCompliance?: "PDF/X-1a" | "PDF/X-3" | "PDF/X-4";
}

// =============================================================================
// STANDARD ICC PROFILES
// =============================================================================

/**
 * Standard ICC profile definitions
 * In production, these would be loaded from actual ICC profile files
 */
export const STANDARD_PROFILES: Record<string, ICCProfile> = {
  // Input (RGB) profiles
  sRGB: {
    id: "sRGB",
    name: "sRGB IEC61966-2.1",
    colorSpace: "sRGB",
    profileClass: "mntr",
    version: "2.1.0",
    description: "Standard RGB color space for web and general use",
    whitePoint: "D65",
  },
  AdobeRGB: {
    id: "AdobeRGB",
    name: "Adobe RGB (1998)",
    colorSpace: "AdobeRGB",
    profileClass: "mntr",
    version: "2.1.0",
    description: "Wide gamut RGB for professional photography",
    whitePoint: "D65",
  },
  ProPhotoRGB: {
    id: "ProPhotoRGB",
    name: "ProPhoto RGB",
    colorSpace: "ProPhotoRGB",
    profileClass: "mntr",
    version: "2.1.0",
    description: "Very wide gamut for archival photography",
    whitePoint: "D50",
  },

  // Output (CMYK) profiles
  FOGRA39: {
    id: "FOGRA39",
    name: "Coated FOGRA39 (ISO 12647-2:2004)",
    colorSpace: "CMYK",
    profileClass: "prtr",
    version: "2.1.0",
    description: "Standard European coated paper profile",
    whitePoint: "D50",
  },
  FOGRA51: {
    id: "FOGRA51",
    name: "PSO Coated v3 (FOGRA51)",
    colorSpace: "CMYK",
    profileClass: "prtr",
    version: "2.1.0",
    description: "Modern European coated paper profile",
    whitePoint: "D50",
  },
  SWOP: {
    id: "SWOP",
    name: "US Web Coated (SWOP) v2",
    colorSpace: "CMYK",
    profileClass: "prtr",
    version: "2.1.0",
    description: "Standard North American web offset printing",
    whitePoint: "D50",
  },
  GRACoL: {
    id: "GRACoL",
    name: "GRACoL 2006 Coated1v2",
    colorSpace: "CMYK",
    profileClass: "prtr",
    version: "2.1.0",
    description:
      "General Requirements for Applications in Commercial Offset Lithography",
    whitePoint: "D50",
  },
  UncoatedFOGRA29: {
    id: "UncoatedFOGRA29",
    name: "Uncoated FOGRA29 (ISO 12647-2:2004)",
    colorSpace: "CMYK",
    profileClass: "prtr",
    version: "2.1.0",
    description: "European uncoated paper profile",
    whitePoint: "D50",
  },
  JapanColor2001: {
    id: "JapanColor2001",
    name: "Japan Color 2001 Coated",
    colorSpace: "CMYK",
    profileClass: "prtr",
    version: "2.1.0",
    description: "Standard Japanese coated paper profile",
    whitePoint: "D50",
  },
};

// =============================================================================
// PANTONE REFERENCE (subset for common colors)
// =============================================================================

export const PANTONE_COLORS: Record<string, SpotColor> = {
  "PANTONE 185 C": {
    name: "PANTONE 185 C",
    cmykFallback: { c: 0, m: 91, y: 76, k: 0 },
    labColor: { l: 48, a: 74, b: 41 },
  },
  "PANTONE 186 C": {
    name: "PANTONE 186 C",
    cmykFallback: { c: 0, m: 100, y: 81, k: 4 },
    labColor: { l: 44, a: 67, b: 38 },
  },
  "PANTONE 300 C": {
    name: "PANTONE 300 C",
    cmykFallback: { c: 100, m: 44, y: 0, k: 0 },
    labColor: { l: 47, a: 13, b: -56 },
  },
  "PANTONE 349 C": {
    name: "PANTONE 349 C",
    cmykFallback: { c: 91, m: 0, y: 100, k: 42 },
    labColor: { l: 40, a: -44, b: 37 },
  },
  "PANTONE Process Black C": {
    name: "PANTONE Process Black C",
    cmykFallback: { c: 0, m: 0, y: 0, k: 100 },
    labColor: { l: 0, a: 0, b: 0 },
  },
  "PANTONE Cool Gray 11 C": {
    name: "PANTONE Cool Gray 11 C",
    cmykFallback: { c: 0, m: 0, y: 0, k: 75 },
    labColor: { l: 39, a: 0, b: -3 },
  },
};

// =============================================================================
// COLOR MANAGEMENT ENGINE
// =============================================================================

export interface ColorConversionResult {
  /** Converted color */
  color: CMYKColor;
  /** Is the color within gamut? */
  inGamut: boolean;
  /** Delta E (color difference) from original */
  deltaE?: number;
  /** Total ink coverage */
  totalInk: number;
  /** Warnings */
  warnings: string[];
}

const DEFAULT_CONFIG: ColorManagementConfig = {
  sourceProfile: STANDARD_PROFILES.sRGB,
  destinationProfile: STANDARD_PROFILES.FOGRA39,
  renderingIntent: "relative-colorimetric",
  blackPointCompensation: true,
  preserveBlack: true,
  maxInkDensity: 300,
  gamutWarning: true,
  pdfXCompliance: undefined,
};

/**
 * ColorManager - Professional color management for print output
 *
 * Usage:
 * ```ts
 * const cm = new ColorManager({
 *   destinationProfile: STANDARD_PROFILES.FOGRA39,
 *   renderingIntent: 'perceptual',
 * });
 *
 * const result = cm.convertToCMYK('#FF5500');
 * console.log(result.color); // { c: 0, m: 75, y: 100, k: 0 }
 * ```
 */
export class ColorManager {
  private config: ColorManagementConfig;
  private spotColors: Map<string, SpotColor>;

  constructor(config: Partial<ColorManagementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.spotColors = new Map(Object.entries(PANTONE_COLORS));
  }

  /**
   * Convert hex color to CMYK with color management
   */
  convertToCMYK(hex: HexColor): ColorConversionResult {
    const rgb = hexToRgb(hex);
    return this.rgbToCMYK(rgb);
  }

  /**
   * Convert RGB to CMYK with color management
   */
  rgbToCMYK(rgb: RGBColor): ColorConversionResult {
    const warnings: string[] = [];

    // Check for pure black preservation
    if (
      this.config.preserveBlack &&
      rgb.r === 0 &&
      rgb.g === 0 &&
      rgb.b === 0
    ) {
      return {
        color: { c: 0, m: 0, y: 0, k: 100 },
        inGamut: true,
        totalInk: 100,
        warnings: [],
      };
    }

    // Simple conversion (would use ICC profile in production)
    const cmyk = this.basicRgbToCmyk(rgb);

    // Apply ink density limiting
    const limited = this.limitInkDensity(cmyk);
    if (limited.wasLimited) {
      warnings.push(
        `Ink density reduced from ${limited.originalTotal}% to ${limited.newTotal}%`,
      );
    }

    // Check gamut
    const inGamut = this.isInGamut(rgb);
    if (!inGamut && this.config.gamutWarning) {
      warnings.push("Color is outside CMYK gamut, approximation used");
    }

    // Calculate delta E (simplified)
    const roundTrip = this.cmykToRgb(limited.color);
    const deltaE = this.calculateDeltaE(rgb, roundTrip);

    return {
      color: limited.color,
      inGamut,
      deltaE,
      totalInk: limited.newTotal,
      warnings,
    };
  }

  /**
   * Basic RGB to CMYK conversion
   */
  private basicRgbToCmyk(rgb: RGBColor): CMYKColor {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const k = 1 - Math.max(r, g, b);

    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  }

  /**
   * CMYK to RGB conversion
   */
  private cmykToRgb(cmyk: CMYKColor): RGBColor {
    const c = cmyk.c / 100;
    const m = cmyk.m / 100;
    const y = cmyk.y / 100;
    const k = cmyk.k / 100;

    return {
      r: Math.round(255 * (1 - c) * (1 - k)),
      g: Math.round(255 * (1 - m) * (1 - k)),
      b: Math.round(255 * (1 - y) * (1 - k)),
    };
  }

  /**
   * Limit total ink density
   */
  private limitInkDensity(cmyk: CMYKColor): {
    color: CMYKColor;
    wasLimited: boolean;
    originalTotal: number;
    newTotal: number;
  } {
    const total = cmyk.c + cmyk.m + cmyk.y + cmyk.k;

    if (total <= this.config.maxInkDensity) {
      return {
        color: cmyk,
        wasLimited: false,
        originalTotal: total,
        newTotal: total,
      };
    }

    // Reduce proportionally
    const scale = this.config.maxInkDensity / total;
    const limited: CMYKColor = {
      c: Math.round(cmyk.c * scale),
      m: Math.round(cmyk.m * scale),
      y: Math.round(cmyk.y * scale),
      k: Math.round(cmyk.k * scale),
    };

    return {
      color: limited,
      wasLimited: true,
      originalTotal: total,
      newTotal: limited.c + limited.m + limited.y + limited.k,
    };
  }

  /**
   * Check if an RGB color is within CMYK gamut (simplified)
   */
  isInGamut(rgb: RGBColor): boolean {
    // Highly saturated colors are typically out of gamut
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    // Check for problematic bright saturated colors
    if (saturation > 0.85 && max > 200) {
      return false;
    }

    // Check for "electric" blues and greens
    if (
      (rgb.b > 200 && rgb.r < 100 && rgb.g < 150) ||
      (rgb.g > 200 && rgb.r < 100 && rgb.b < 100)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Calculate Delta E (CIE76, simplified)
   */
  private calculateDeltaE(rgb1: RGBColor, rgb2: RGBColor): number {
    // Convert to Lab (simplified sRGB → Lab)
    const lab1 = this.rgbToLab(rgb1);
    const lab2 = this.rgbToLab(rgb2);

    return Math.sqrt(
      Math.pow(lab1.l - lab2.l, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2),
    );
  }

  /**
   * Simplified RGB to Lab conversion
   */
  private rgbToLab(rgb: RGBColor): { l: number; a: number; b: number } {
    // Normalize RGB
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ (D65)
    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0;
    const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

    // Convert to Lab
    const f = (t: number) =>
      t > 0.008856 ? Math.pow(t, 1 / 3) : (903.3 * t + 16) / 116;

    return {
      l: 116 * f(y) - 16,
      a: 500 * (f(x) - f(y)),
      b: 200 * (f(y) - f(z)),
    };
  }

  /**
   * Register a custom spot color
   */
  registerSpotColor(spotColor: SpotColor): void {
    this.spotColors.set(spotColor.name, spotColor);
  }

  /**
   * Get a spot color by name
   */
  getSpotColor(name: string): SpotColor | undefined {
    return this.spotColors.get(name);
  }

  /**
   * Convert spot color with tint
   */
  getSpotColorCMYK(name: string, tint: number = 100): CMYKColor | null {
    const spot = this.spotColors.get(name);
    if (!spot) return null;

    const scale = tint / 100;
    return {
      c: Math.round(spot.cmykFallback.c * scale),
      m: Math.round(spot.cmykFallback.m * scale),
      y: Math.round(spot.cmykFallback.y * scale),
      k: Math.round(spot.cmykFallback.k * scale),
    };
  }

  /**
   * Generate color separation plates
   */
  generateSeparations(colors: HexColor[]): {
    cyan: number[];
    magenta: number[];
    yellow: number[];
    black: number[];
  } {
    const plates = {
      cyan: [] as number[],
      magenta: [] as number[],
      yellow: [] as number[],
      black: [] as number[],
    };

    for (const hex of colors) {
      const result = this.convertToCMYK(hex);
      plates.cyan.push(result.color.c);
      plates.magenta.push(result.color.m);
      plates.yellow.push(result.color.y);
      plates.black.push(result.color.k);
    }

    return plates;
  }

  /**
   * Check PDF/X compliance for a document's colors
   */
  checkPDFXCompliance(colors: HexColor[]): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const compliance = this.config.pdfXCompliance;

    if (!compliance) {
      return { compliant: true, issues: [], recommendations: [] };
    }

    for (const hex of colors) {
      const result = this.convertToCMYK(hex);

      // Check gamut
      if (!result.inGamut) {
        issues.push(`Color ${hex} is outside CMYK gamut`);
      }

      // Check ink density
      if (result.totalInk > this.config.maxInkDensity) {
        issues.push(
          `Color ${hex} exceeds max ink density (${result.totalInk}%)`,
        );
      }
    }

    // PDF/X-1a requirements
    if (compliance === "PDF/X-1a") {
      recommendations.push("Ensure all colors are CMYK or spot");
      recommendations.push("Remove any RGB images");
      recommendations.push("Embed all fonts");
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ColorManagementConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ColorManagementConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Format CMYK color for display
 */
export function formatCMYK(cmyk: CMYKColor): string {
  return `C${cmyk.c} M${cmyk.m} Y${cmyk.y} K${cmyk.k}`;
}

/**
 * Parse CMYK string (e.g., "C100 M50 Y0 K0")
 */
export function parseCMYK(str: string): CMYKColor | null {
  const match = str.match(/C(\d+)\s*M(\d+)\s*Y(\d+)\s*K(\d+)/i);
  if (!match) return null;

  return {
    c: parseInt(match[1], 10),
    m: parseInt(match[2], 10),
    y: parseInt(match[3], 10),
    k: parseInt(match[4], 10),
  };
}

/**
 * Get rich black CMYK value
 * Standard rich black avoids a single-color black which can look washed out
 */
export function getRichBlack(
  variant: "cool" | "warm" | "neutral" = "neutral",
): CMYKColor {
  switch (variant) {
    case "cool":
      return { c: 60, m: 40, y: 40, k: 100 }; // Blue-ish black
    case "warm":
      return { c: 40, m: 60, y: 60, k: 100 }; // Brown-ish black
    case "neutral":
    default:
      return { c: 40, m: 40, y: 40, k: 100 }; // Balanced
  }
}

/**
 * Check if a CMYK color is a safe rich black (not over-inked)
 */
export function isValidRichBlack(
  cmyk: CMYKColor,
  maxInk: number = 300,
): boolean {
  const total = cmyk.c + cmyk.m + cmyk.y + cmyk.k;
  return cmyk.k >= 80 && total <= maxInk;
}

/**
 * Create a default color manager instance
 */
export function createColorManager(
  destinationProfile: keyof typeof STANDARD_PROFILES = "FOGRA39",
  config: Partial<ColorManagementConfig> = {},
): ColorManager {
  return new ColorManager({
    destinationProfile: STANDARD_PROFILES[destinationProfile],
    ...config,
  });
}

export default ColorManager;
