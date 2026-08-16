/**
 * PVCE Glyph Oracle - Text Measurement Engine
 * ============================================
 * Document 2, Section 2: The Text Measurement Oracle
 *
 * Provides deterministic text measurement without DOM dependency.
 * Uses pre-calculated glyph metrics with caching for performance.
 */

import { GlyphMetrics, GlyphCacheEntry, TextBox, LBU, Point } from "./types.js";

// =============================================================================
// FONT METRICS DATABASE
// =============================================================================

/**
 * Pre-calculated font metrics for common fonts.
 * These values are derived from actual font measurements and provide
 * deterministic sizing without DOM access (Doc 2, Section 2).
 *
 * Metrics are normalized to fontSize = 1, then scaled.
 */
const FONT_METRICS: Record<string, FontMetricsData> = {
  Arial: {
    avgCharWidth: 0.52,
    capHeight: 0.72,
    xHeight: 0.52,
    ascent: 0.91,
    descent: 0.21,
    lineHeight: 1.15,
    charWidths: {
      // Common characters with specific widths
      " ": 0.28,
      "!": 0.28,
      '"': 0.35,
      "#": 0.56,
      $: 0.56,
      "%": 0.89,
      "&": 0.67,
      "'": 0.19,
      "(": 0.33,
      ")": 0.33,
      "*": 0.39,
      "+": 0.58,
      ",": 0.28,
      "-": 0.33,
      ".": 0.28,
      "/": 0.28,
      "0": 0.56,
      "1": 0.56,
      "2": 0.56,
      "3": 0.56,
      "4": 0.56,
      "5": 0.56,
      "6": 0.56,
      "7": 0.56,
      "8": 0.56,
      "9": 0.56,
      ":": 0.28,
      ";": 0.28,
      "<": 0.58,
      "=": 0.58,
      ">": 0.58,
      "?": 0.56,
      "@": 1.02,
      A: 0.67,
      B: 0.67,
      C: 0.72,
      D: 0.72,
      E: 0.67,
      F: 0.61,
      G: 0.78,
      H: 0.72,
      I: 0.28,
      J: 0.5,
      K: 0.67,
      L: 0.56,
      M: 0.83,
      N: 0.72,
      O: 0.78,
      P: 0.67,
      Q: 0.78,
      R: 0.72,
      S: 0.67,
      T: 0.61,
      U: 0.72,
      V: 0.67,
      W: 0.94,
      X: 0.67,
      Y: 0.67,
      Z: 0.61,
      a: 0.56,
      b: 0.56,
      c: 0.5,
      d: 0.56,
      e: 0.56,
      f: 0.28,
      g: 0.56,
      h: 0.56,
      i: 0.22,
      j: 0.22,
      k: 0.5,
      l: 0.22,
      m: 0.83,
      n: 0.56,
      o: 0.56,
      p: 0.56,
      q: 0.56,
      r: 0.33,
      s: 0.5,
      t: 0.28,
      u: 0.56,
      v: 0.5,
      w: 0.72,
      x: 0.5,
      y: 0.5,
      z: 0.5,
    },
  },
  Helvetica: {
    avgCharWidth: 0.52,
    capHeight: 0.72,
    xHeight: 0.52,
    ascent: 0.91,
    descent: 0.21,
    lineHeight: 1.15,
    charWidths: {
      // Similar to Arial
      " ": 0.28,
      "!": 0.28,
      '"': 0.36,
      "#": 0.56,
      $: 0.56,
      "%": 0.89,
      "&": 0.67,
      "'": 0.22,
      "(": 0.33,
      ")": 0.33,
      "*": 0.39,
      "+": 0.58,
      ",": 0.28,
      "-": 0.33,
      ".": 0.28,
      "/": 0.28,
      "0": 0.56,
      "1": 0.56,
      "2": 0.56,
      "3": 0.56,
      "4": 0.56,
      "5": 0.56,
      "6": 0.56,
      "7": 0.56,
      "8": 0.56,
      "9": 0.56,
      ":": 0.28,
      ";": 0.28,
      "<": 0.58,
      "=": 0.58,
      ">": 0.58,
      "?": 0.56,
      "@": 1.01,
      A: 0.67,
      B: 0.67,
      C: 0.72,
      D: 0.72,
      E: 0.67,
      F: 0.61,
      G: 0.78,
      H: 0.72,
      I: 0.28,
      J: 0.5,
      K: 0.67,
      L: 0.56,
      M: 0.83,
      N: 0.72,
      O: 0.78,
      P: 0.67,
      Q: 0.78,
      R: 0.72,
      S: 0.67,
      T: 0.61,
      U: 0.72,
      V: 0.67,
      W: 0.94,
      X: 0.67,
      Y: 0.67,
      Z: 0.61,
      a: 0.56,
      b: 0.56,
      c: 0.5,
      d: 0.56,
      e: 0.56,
      f: 0.28,
      g: 0.56,
      h: 0.56,
      i: 0.22,
      j: 0.22,
      k: 0.5,
      l: 0.22,
      m: 0.83,
      n: 0.56,
      o: 0.56,
      p: 0.56,
      q: 0.56,
      r: 0.33,
      s: 0.5,
      t: 0.28,
      u: 0.56,
      v: 0.5,
      w: 0.72,
      x: 0.5,
      y: 0.5,
      z: 0.5,
    },
  },
  "Open Sans": {
    avgCharWidth: 0.54,
    capHeight: 0.71,
    xHeight: 0.54,
    ascent: 0.93,
    descent: 0.26,
    lineHeight: 1.2,
    charWidths: {
      " ": 0.26,
      "!": 0.26,
      '"': 0.41,
      "#": 0.63,
      $: 0.54,
      "%": 0.84,
      "&": 0.69,
      "'": 0.21,
      "(": 0.31,
      ")": 0.31,
      "*": 0.43,
      "+": 0.54,
      ",": 0.23,
      "-": 0.33,
      ".": 0.26,
      "/": 0.36,
      "0": 0.54,
      "1": 0.54,
      "2": 0.54,
      "3": 0.54,
      "4": 0.54,
      "5": 0.54,
      "6": 0.54,
      "7": 0.54,
      "8": 0.54,
      "9": 0.54,
      ":": 0.24,
      ";": 0.24,
      "<": 0.54,
      "=": 0.54,
      ">": 0.54,
      "?": 0.45,
      "@": 0.93,
      A: 0.65,
      B: 0.63,
      C: 0.65,
      D: 0.7,
      E: 0.55,
      F: 0.52,
      G: 0.72,
      H: 0.72,
      I: 0.27,
      J: 0.41,
      K: 0.62,
      L: 0.51,
      M: 0.9,
      N: 0.74,
      O: 0.76,
      P: 0.6,
      Q: 0.76,
      R: 0.62,
      S: 0.56,
      T: 0.56,
      U: 0.7,
      V: 0.62,
      W: 0.94,
      X: 0.6,
      Y: 0.57,
      Z: 0.57,
      a: 0.53,
      b: 0.58,
      c: 0.48,
      d: 0.58,
      e: 0.54,
      f: 0.33,
      g: 0.54,
      h: 0.58,
      i: 0.24,
      j: 0.24,
      k: 0.52,
      l: 0.24,
      m: 0.89,
      n: 0.58,
      o: 0.57,
      p: 0.58,
      q: 0.58,
      r: 0.37,
      s: 0.47,
      t: 0.36,
      u: 0.58,
      v: 0.5,
      w: 0.77,
      x: 0.49,
      y: 0.5,
      z: 0.46,
    },
  },
  Roboto: {
    avgCharWidth: 0.53,
    capHeight: 0.71,
    xHeight: 0.53,
    ascent: 0.93,
    descent: 0.24,
    lineHeight: 1.17,
    charWidths: {
      " ": 0.25,
      "!": 0.26,
      '"': 0.35,
      "#": 0.59,
      $: 0.53,
      "%": 0.74,
      "&": 0.62,
      "'": 0.19,
      "(": 0.33,
      ")": 0.33,
      "*": 0.41,
      "+": 0.53,
      ",": 0.21,
      "-": 0.3,
      ".": 0.26,
      "/": 0.39,
      "0": 0.53,
      "1": 0.53,
      "2": 0.53,
      "3": 0.53,
      "4": 0.53,
      "5": 0.53,
      "6": 0.53,
      "7": 0.53,
      "8": 0.53,
      "9": 0.53,
      ":": 0.24,
      ";": 0.24,
      "<": 0.5,
      "=": 0.53,
      ">": 0.5,
      "?": 0.45,
      "@": 0.89,
      A: 0.64,
      B: 0.61,
      C: 0.64,
      D: 0.66,
      E: 0.55,
      F: 0.53,
      G: 0.69,
      H: 0.69,
      I: 0.27,
      J: 0.51,
      K: 0.61,
      L: 0.52,
      M: 0.85,
      N: 0.69,
      O: 0.71,
      P: 0.61,
      Q: 0.71,
      R: 0.61,
      S: 0.57,
      T: 0.57,
      U: 0.66,
      V: 0.61,
      W: 0.89,
      X: 0.6,
      Y: 0.58,
      Z: 0.58,
      a: 0.51,
      b: 0.55,
      c: 0.48,
      d: 0.55,
      e: 0.51,
      f: 0.34,
      g: 0.53,
      h: 0.55,
      i: 0.24,
      j: 0.24,
      k: 0.5,
      l: 0.24,
      m: 0.87,
      n: 0.55,
      o: 0.55,
      p: 0.55,
      q: 0.55,
      r: 0.35,
      s: 0.47,
      t: 0.35,
      u: 0.55,
      v: 0.49,
      w: 0.74,
      x: 0.49,
      y: 0.49,
      z: 0.47,
    },
  },
  // Default/fallback metrics
  default: {
    avgCharWidth: 0.55,
    capHeight: 0.72,
    xHeight: 0.52,
    ascent: 0.92,
    descent: 0.23,
    lineHeight: 1.15,
    charWidths: {},
  },
};

/** Font metrics data structure */
interface FontMetricsData {
  avgCharWidth: number;
  capHeight: number;
  xHeight: number;
  ascent: number;
  descent: number;
  lineHeight: number;
  charWidths: Record<string, number>;
}

// =============================================================================
// GLYPH ORACLE CLASS
// =============================================================================

/**
 * GlyphOracle - Deterministic text measurement engine
 *
 * Features (Doc 2 compliance):
 * - Pre-calculated glyph metrics (no DOM dependency)
 * - Session-based caching for performance (Doc 2, Section 7)
 * - Sub-pixel precision for accurate layout
 * - Multi-font support with fallback
 */
export class GlyphOracle {
  private cache: Map<string, GlyphCacheEntry> = new Map();
  private readonly maxCacheSize: number;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(options: { maxCacheSize?: number } = {}) {
    this.maxCacheSize = options.maxCacheSize ?? 10000;
  }

  /**
   * Measure text dimensions deterministically.
   * Doc 2, Section 2: "Exact bounding box of every string"
   */
  measureText(
    text: string,
    fontSize: number,
    fontFamily: string = "Arial",
  ): GlyphMetrics {
    // Check cache first (Doc 2, Section 7: Batched Metric Caching)
    const cacheKey = this.getCacheKey(text, fontSize, fontFamily);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      cached.lastAccessed = Date.now();
      this.cacheHits++;
      return cached.metrics;
    }

    this.cacheMisses++;

    // Get font metrics (with fallback)
    const fontData = FONT_METRICS[fontFamily] || FONT_METRICS["default"];

    // Calculate width character by character
    let width = 0;
    for (const char of text) {
      const charWidth = fontData.charWidths[char] ?? fontData.avgCharWidth;
      width += charWidth * fontSize;
    }

    // Calculate height metrics
    const height = fontSize * fontData.lineHeight;
    const ascent = fontSize * fontData.ascent;
    const descent = fontSize * fontData.descent;

    const metrics: GlyphMetrics = {
      text,
      width,
      height,
      ascent,
      descent,
      fontFamily,
      fontSize,
    };

    // Store in cache
    this.addToCache(cacheKey, metrics);

    return metrics;
  }

  /**
   * Get raw font metrics for a font family.
   * Used by E-BBox calculator for glyph envelope calculations.
   */
  getFontMetrics(fontFamily: string): {
    avgCharWidth: number;
    capHeight: number;
    xHeight: number;
    ascent: number;
    descent: number;
    lineHeight: number;
  } {
    const fontData = FONT_METRICS[fontFamily] || FONT_METRICS["default"];
    return {
      avgCharWidth: fontData.avgCharWidth,
      capHeight: fontData.capHeight,
      xHeight: fontData.xHeight,
      ascent: fontData.ascent,
      descent: fontData.descent,
      lineHeight: fontData.lineHeight,
    };
  }

  /**
   * Create a TextBox with full positioning information.
   * Doc 2, Section 2: TextBox interface
   */
  createTextBox(
    text: string,
    fontSize: number,
    options: {
      fontFamily?: string;
      anchor?: "start" | "middle" | "end";
      rotation?: number;
      padding?: number;
    } = {},
  ): TextBox {
    const {
      fontFamily = "Arial",
      anchor = "start",
      rotation = 0,
      padding = 0,
    } = options;

    const metrics = this.measureText(text, fontSize, fontFamily);

    return {
      text,
      width: metrics.width + padding * 2,
      height: metrics.height + padding * 2,
      anchor,
      rotation,
      padding,
      baseline: "top",
    };
  }

  /**
   * Calculate the maximum label width for a set of labels.
   * Used for "Fixed Gutter Strategy" (Doc 1, Section 5).
   */
  getMaxLabelWidth(
    labels: string[],
    fontSize: number,
    fontFamily: string = "Arial",
  ): number {
    let maxWidth = 0;
    for (const label of labels) {
      const metrics = this.measureText(label, fontSize, fontFamily);
      maxWidth = Math.max(maxWidth, metrics.width);
    }
    return maxWidth;
  }

  /**
   * Get bounding box for rotated text.
   * Used for 45° and 90° label rotation (Doc 2, Section 3).
   */
  getRotatedBounds(textBox: TextBox): { width: LBU; height: LBU } {
    const rad = (textBox.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));

    return {
      width: textBox.width * cos + textBox.height * sin,
      height: textBox.width * sin + textBox.height * cos,
    };
  }

  /**
   * Check if two text boxes overlap.
   * Used for collision detection (Doc 2, Section 3).
   */
  boxesOverlap(
    box1: TextBox,
    pos1: Point,
    box2: TextBox,
    pos2: Point,
  ): boolean {
    // Get effective bounds (accounting for rotation)
    const bounds1 = this.getRotatedBounds(box1);
    const bounds2 = this.getRotatedBounds(box2);

    // Adjust position based on anchor
    const x1 = this.getAnchoredX(pos1.x, box1.anchor, bounds1.width);
    const x2 = this.getAnchoredX(pos2.x, box2.anchor, bounds2.width);

    // Simple AABB collision check
    return !(
      x1 + bounds1.width < x2 ||
      x2 + bounds2.width < x1 ||
      pos1.y + bounds1.height < pos2.y ||
      pos2.y + bounds2.height < pos1.y
    );
  }

  /**
   * Format number for display (e.g., currency, percentage).
   * Pre-measures result for consistent layout.
   */
  formatAndMeasure(
    value: number,
    format: "number" | "currency" | "percent" | "compact",
    fontSize: number,
    fontFamily: string = "Arial",
    options: { currency?: string; decimals?: number; locale?: string } = {},
  ): { text: string; metrics: GlyphMetrics } {
    const { currency = "USD", decimals = 2, locale = "en-US" } = options;

    let text: string;
    switch (format) {
      case "currency":
        text = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);
        break;
      case "percent":
        text = new Intl.NumberFormat(locale, {
          style: "percent",
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);
        break;
      case "compact":
        text = this.compactNumber(value);
        break;
      default:
        text = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);
    }

    return {
      text,
      metrics: this.measureText(text, fontSize, fontFamily),
    };
  }

  /**
   * Get cache statistics.
   */
  getStats(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Clear the glyph cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  private getCacheKey(
    text: string,
    fontSize: number,
    fontFamily: string,
  ): string {
    return `${fontFamily}|${fontSize}|${text}`;
  }

  private addToCache(key: string, metrics: GlyphMetrics): void {
    // Evict old entries if cache is full (LRU)
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }

    this.cache.set(key, {
      key,
      metrics,
      lastAccessed: Date.now(),
    });
  }

  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private getAnchoredX(
    x: number,
    anchor: "start" | "middle" | "end",
    width: number,
  ): number {
    switch (anchor) {
      case "middle":
        return x - width / 2;
      case "end":
        return x - width;
      default:
        return x;
    }
  }

  private compactNumber(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1e12) return (value / 1e12).toFixed(1) + "T";
    if (abs >= 1e9) return (value / 1e9).toFixed(1) + "B";
    if (abs >= 1e6) return (value / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
    return value.toString();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global GlyphOracle instance for shared caching */
export const glyphOracle = new GlyphOracle();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Measure text using the global oracle.
 */
export function measureText(
  text: string,
  fontSize: number,
  fontFamily?: string,
): GlyphMetrics {
  return glyphOracle.measureText(text, fontSize, fontFamily);
}

/**
 * Get max width of labels.
 */
export function getMaxLabelWidth(
  labels: string[],
  fontSize: number,
  fontFamily?: string,
): number {
  return glyphOracle.getMaxLabelWidth(labels, fontSize, fontFamily);
}
