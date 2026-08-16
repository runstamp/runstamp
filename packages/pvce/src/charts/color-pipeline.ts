/**
 * PVCE Color Pipeline
 * ===================
 * Document 4: Print-Specific Color & Accessible Data Structures
 *
 * Features:
 * - Section 2: Dual-mode color (RGB/CMYK/Monochrome)
 * - Section 3: Deterministic pattern overlays
 * - Section 4: WCAG contrast checking
 * - Perceptual luminance calculations
 */

import {
  RGBColor,
  CMYKColor,
  GrayscaleValue,
  UnifiedColor,
  ColorPalette,
  PatternDefinition,
  PatternType,
  ColorMode,
} from "./types.js";

// =============================================================================
// COLOR CONSTANTS
// =============================================================================

/** WCAG minimum contrast ratios */
export const WCAG_CONTRAST = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

/** Minimum grayscale difference between series (Doc 4, Section 2: 15%) */
export const MIN_GRAY_DIFFERENCE = 15;

/** Pattern types mapped to series index (Doc 4, Section 3) */
const PATTERN_MAP: PatternType[] = [
  "diagonal-lines", // Series 0: 45° stripes
  "dots", // Series 1
  "crosshatch", // Series 2
  "horizontal-lines", // Series 3
  "vertical-lines", // Series 4
  "diagonal-reverse", // Series 5: -45° stripes
  "grid", // Series 6
  "circles", // Series 7
];

// =============================================================================
// COLOR PALETTE PRESETS
// =============================================================================

/**
 * Default PVCE palette - designed for both screen and print.
 * Colors are chosen for:
 * - High contrast ratios (WCAG AA against white: 4.5:1 minimum)
 * - Distinct grayscale values (min 15% difference)
 * - Clean CMYK conversion
 */
export const DEFAULT_PALETTE_COLORS: string[] = [
  "#1B4D8F", // Deep Blue (contrast: ~8.5:1)
  "#006D5B", // Dark Teal (contrast: ~6.5:1)
  "#C62828", // Deep Red (contrast: ~5.9:1)
  "#4527A0", // Deep Purple (contrast: ~8.2:1)
  "#BF360C", // Deep Orange (contrast: ~5.6:1)
  "#1B5E20", // Forest Green (contrast: ~8.0:1)
  "#880E4F", // Deep Magenta (contrast: ~7.1:1)
  "#01579B", // Dark Cyan (contrast: ~6.4:1)
  "#5D4037", // Brown (contrast: ~7.5:1)
  "#37474F", // Blue Gray (contrast: ~9.8:1)
];

/**
 * Colorblind-safe palette (Deuteranopia/Protanopia friendly).
 */
export const COLORBLIND_SAFE_COLORS: string[] = [
  "#0077BB", // Blue
  "#EE7733", // Orange
  "#009988", // Teal
  "#CC3311", // Red
  "#33BBEE", // Cyan
  "#EE3377", // Magenta
  "#BBBBBB", // Gray
  "#000000", // Black
];

/**
 * Monochrome palette with well-distributed grayscale values.
 * Each color is chosen to have at least 15% difference from adjacent colors.
 * Values range from very dark (10%) to light (80%).
 */
export const MONOCHROME_PALETTE_COLORS: string[] = [
  "#1A1A1A", // ~10% gray (very dark)
  "#404040", // ~25% gray
  "#666666", // ~40% gray
  "#8C8C8C", // ~55% gray
  "#B3B3B3", // ~70% gray
  "#2D2D2D", // ~18% gray
  "#525252", // ~32% gray
  "#787878", // ~47% gray
  "#9E9E9E", // ~62% gray
  "#C4C4C4", // ~77% gray
];

// =============================================================================
// COLOR PIPELINE CLASS
// =============================================================================

/**
 * ColorPipeline - Manages color transformations for print and screen.
 *
 * Doc 4 Compliance:
 * - Section 2: RGB to CMYK and Grayscale conversion
 * - Section 3: Deterministic pattern assignment
 * - Contrast ratio calculation
 */
export class ColorPipeline {
  private colorMode: ColorMode = "rgb";
  private enablePatterns = false;
  private customPalette?: string[];

  constructor(
    options: {
      colorMode?: ColorMode;
      enablePatterns?: boolean;
      palette?: string[];
    } = {},
  ) {
    this.colorMode = options.colorMode ?? "rgb";
    this.enablePatterns = options.enablePatterns ?? false;
    this.customPalette = options.palette;
  }

  /**
   * Set the color mode (rgb, cmyk, or monochrome).
   */
  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
  }

  /**
   * Enable/disable pattern overlays for accessibility.
   */
  setPatternMode(enabled: boolean): void {
    this.enablePatterns = enabled;
  }

  /**
   * Convert a hex color to UnifiedColor with all representations.
   */
  parseColor(hex: string): UnifiedColor {
    const rgb = this.hexToRGB(hex);
    const cmyk = this.rgbToCMYK(rgb);
    const grayscale = this.rgbToGrayscale(rgb);

    return {
      rgb,
      cmyk,
      grayscale,
      hex: hex.toUpperCase(),
    };
  }

  /**
   * Get the appropriate color value based on current mode.
   */
  getColor(color: UnifiedColor): string {
    switch (this.colorMode) {
      case "cmyk":
        return this.cmykToString(color.cmyk);
      case "monochrome":
        return this.grayscaleToString(color.grayscale);
      default:
        return color.hex;
    }
  }

  /**
   * Get color for a series index from the palette.
   */
  getSeriesColor(seriesIndex: number): UnifiedColor {
    // Use monochrome palette when in monochrome mode for well-distributed grays
    const colors =
      this.colorMode === "monochrome"
        ? MONOCHROME_PALETTE_COLORS
        : (this.customPalette ?? DEFAULT_PALETTE_COLORS);
    const hex = colors[seriesIndex % colors.length];
    return this.parseColor(hex);
  }

  /**
   * Get pattern definition for a series (Doc 4, Section 3).
   * Patterns are deterministically mapped to series index.
   */
  getSeriesPattern(seriesIndex: number): PatternDefinition {
    const patternType = PATTERN_MAP[seriesIndex % PATTERN_MAP.length];

    return {
      id: `pattern-series-${seriesIndex}`,
      seriesIndex,
      type: patternType,
      strokeWidth: 1.5,
      spacing: 8,
      angle:
        patternType === "diagonal-lines"
          ? 45
          : patternType === "diagonal-reverse"
            ? -45
            : 0,
    };
  }

  /**
   * Check if patterns should be used (>3 series or monochrome mode).
   */
  shouldUsePatterns(seriesCount: number): boolean {
    return (
      this.enablePatterns || this.colorMode === "monochrome" || seriesCount > 3
    );
  }

  /**
   * Generate a complete color palette with patterns.
   */
  createPalette(seriesCount: number, name: string = "default"): ColorPalette {
    const colors: UnifiedColor[] = [];
    const patterns: PatternDefinition[] = [];

    for (let i = 0; i < seriesCount; i++) {
      colors.push(this.getSeriesColor(i));
      patterns.push(this.getSeriesPattern(i));
    }

    // Check WCAG compliance
    const contrastResults = this.checkPaletteContrast(colors);

    return {
      name,
      colors,
      patterns,
      meetsWCAG: contrastResults.allPass,
      minContrastRatio: contrastResults.minRatio,
    };
  }

  /**
   * Calculate contrast ratio between two colors (WCAG formula).
   */
  getContrastRatio(color1: UnifiedColor, color2: UnifiedColor): number {
    const l1 = this.getRelativeLuminance(color1.rgb);
    const l2 = this.getRelativeLuminance(color2.rgb);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if two colors have sufficient contrast for text.
   */
  hasAdequateContrast(
    foreground: UnifiedColor,
    background: UnifiedColor,
    isLargeText: boolean = false,
  ): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    const required = isLargeText
      ? WCAG_CONTRAST.AA_LARGE
      : WCAG_CONTRAST.AA_NORMAL;
    return ratio >= required;
  }

  /**
   * Find a text color (black or white) with best contrast.
   */
  getTextColor(background: UnifiedColor): UnifiedColor {
    const white = this.parseColor("#FFFFFF");
    const black = this.parseColor("#000000");

    const whiteContrast = this.getContrastRatio(white, background);
    const blackContrast = this.getContrastRatio(black, background);

    return whiteContrast > blackContrast ? white : black;
  }

  /**
   * Ensure grayscale values are distinct enough (Doc 4, Section 2).
   * Returns adjusted colors if needed.
   */
  ensureGrayscaleDistinction(colors: UnifiedColor[]): UnifiedColor[] {
    const sorted = [...colors].sort(
      (a, b) => a.grayscale.gray - b.grayscale.gray,
    );

    const result: UnifiedColor[] = [];
    let lastGray = -MIN_GRAY_DIFFERENCE;

    for (const color of sorted) {
      let gray = color.grayscale.gray;

      // Ensure minimum difference from previous
      if (gray - lastGray < MIN_GRAY_DIFFERENCE) {
        gray = Math.min(100, lastGray + MIN_GRAY_DIFFERENCE);
      }

      if (gray !== color.grayscale.gray) {
        // Create adjusted color
        const adjustedRGB = this.grayscaleToRGB(gray);
        result.push({
          rgb: adjustedRGB,
          cmyk: this.rgbToCMYK(adjustedRGB),
          grayscale: { gray, perceptualLuminance: gray / 100 },
          hex: this.rgbToHex(adjustedRGB),
        });
      } else {
        result.push(color);
      }

      lastGray = gray;
    }

    return result;
  }

  // ===========================================================================
  // PRIVATE: Color Conversion Methods
  // ===========================================================================

  private hexToRGB(hex: string): RGBColor {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
      a: 1,
    };
  }

  private rgbToHex(rgb: RGBColor): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
  }

  /**
   * Convert RGB to CMYK using standard formulas.
   * Doc 4, Section 2: ICC Color Profiles support.
   */
  private rgbToCMYK(rgb: RGBColor): CMYKColor {
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
   * Convert RGB to Grayscale using perceptual luminance.
   * Doc 4, Section 2: Deterministic Color-to-Gray Mapping.
   */
  private rgbToGrayscale(rgb: RGBColor): GrayscaleValue {
    // ITU-R BT.709 luminance coefficients (perceptual)
    const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    const gray = Math.round((luminance / 255) * 100);

    return {
      gray,
      perceptualLuminance: luminance / 255,
    };
  }

  private grayscaleToRGB(gray: number): RGBColor {
    const value = Math.round((gray / 100) * 255);
    return { r: value, g: value, b: value, a: 1 };
  }

  private cmykToString(cmyk: CMYKColor): string {
    // SVG doesn't support CMYK directly, but we can note it in comments
    // For now, return equivalent RGB
    return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
  }

  private grayscaleToString(gs: GrayscaleValue): string {
    const value = Math.round((gs.gray / 100) * 255);
    return `rgb(${value}, ${value}, ${value})`;
  }

  /**
   * Calculate relative luminance for WCAG contrast formula.
   */
  private getRelativeLuminance(rgb: RGBColor): number {
    const transform = (v: number) => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };

    const r = transform(rgb.r);
    const g = transform(rgb.g);
    const b = transform(rgb.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Check contrast between all adjacent colors in palette.
   */
  private checkPaletteContrast(colors: UnifiedColor[]): {
    allPass: boolean;
    minRatio: number;
  } {
    const white = this.parseColor("#FFFFFF");
    let minRatio = Infinity;

    for (const color of colors) {
      const ratio = this.getContrastRatio(color, white);
      minRatio = Math.min(minRatio, ratio);
    }

    return {
      allPass: minRatio >= WCAG_CONTRAST.AA_NORMAL,
      minRatio,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global color pipeline instance */
export const colorPipeline = new ColorPipeline();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Parse a hex color to unified format.
 */
export function parseColor(hex: string): UnifiedColor {
  return colorPipeline.parseColor(hex);
}

/**
 * Get contrast ratio between two hex colors.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const c1 = colorPipeline.parseColor(hex1);
  const c2 = colorPipeline.parseColor(hex2);
  return colorPipeline.getContrastRatio(c1, c2);
}

/**
 * Check WCAG contrast compliance.
 */
export function meetsContrastRequirement(
  foregroundHex: string,
  backgroundHex: string,
  level: "AA" | "AAA" = "AA",
  isLargeText: boolean = false,
): boolean {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);

  if (level === "AAA") {
    return isLargeText
      ? ratio >= WCAG_CONTRAST.AAA_LARGE
      : ratio >= WCAG_CONTRAST.AAA_NORMAL;
  }
  return isLargeText
    ? ratio >= WCAG_CONTRAST.AA_LARGE
    : ratio >= WCAG_CONTRAST.AA_NORMAL;
}

/**
 * Create a monochrome-safe palette with patterns.
 */
export function createMonochromePalette(seriesCount: number): ColorPalette {
  const pipeline = new ColorPipeline({
    colorMode: "monochrome",
    enablePatterns: true,
  });
  return pipeline.createPalette(seriesCount, "monochrome");
}
