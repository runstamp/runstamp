/**
 * Anti-Banding Gradient Dithering (Doc 2, Section 3)
 * ==================================================
 *
 * Implements perceptual dithering for smooth gradients using SVG filters.
 *
 * Doc 2: "When the engine detects a gradient with a low color delta...
 * it automatically injects a Deterministic Noise Grain via an SVG filter."
 *
 * Technical: Using feTurbulence with low base frequency and mode="multiply"
 */

import {
  GradientConfig,
  DitherFilter,
  HexColor,
  PT,
} from "./types";
import { hexToRgb } from "./design-tokens";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Threshold for "low color delta" gradient detection */
const LOW_DELTA_THRESHOLD = 30; // RGB units

/** Minimum distance for dithering (in pt) */
const MIN_DITHER_DISTANCE: PT = 100;

/** Default turbulence settings for dithering */
const DEFAULT_TURBULENCE = {
  baseFrequency: 0.65,
  numOctaves: 4,
  seed: 42,
  type: "fractalNoise" as const,
};

// =============================================================================
// GRADIENT UTILITIES
// =============================================================================

/**
 * Calculate the color difference (delta) between two hex colors
 */
function calculateColorDelta(color1: HexColor, color2: HexColor): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  // Simple RGB distance
  const dr = Math.abs(rgb1.r - rgb2.r);
  const dg = Math.abs(rgb1.g - rgb2.g);
  const db = Math.abs(rgb1.b - rgb2.b);

  return Math.max(dr, dg, db);
}

/**
 * Check if gradient needs dithering
 */
function needsDithering(config: GradientConfig, distance: PT): boolean {
  if (config.dither === false) {
    return false;
  }

  if (distance < MIN_DITHER_DISTANCE) {
    return false;
  }

  // Check color deltas between adjacent stops
  for (let i = 0; i < config.stops.length - 1; i++) {
    const delta = calculateColorDelta(
      config.stops[i].color,
      config.stops[i + 1].color,
    );

    if (delta < LOW_DELTA_THRESHOLD) {
      return true; // Low delta detected, needs dithering
    }
  }

  return config.dither === true;
}

// =============================================================================
// GRADIENT GENERATOR
// =============================================================================

let gradientCounter = 0;
let ditherFilterCounter = 0;

/**
 * GradientGenerator - Creates smooth, dithered gradients
 */
export class GradientGenerator {
  private gradientCache: Map<string, string> = new Map();
  private ditherFilterCache: Map<string, DitherFilter> = new Map();

  /**
   * Generate unique gradient ID
   */
  private generateGradientId(): string {
    return `gradient-${++gradientCounter}`;
  }

  /**
   * Generate unique dither filter ID
   */
  private generateDitherFilterId(): string {
    return `dither-filter-${++ditherFilterCounter}`;
  }

  /**
   * Generate SVG linear gradient definition
   */
  generateLinearGradient(config: GradientConfig): {
    gradientId: string;
    gradientDef: string;
    fill: string;
  } {
    const gradientId = this.generateGradientId();
    const angle = config.angle ?? 180;

    // Convert angle to x1, y1, x2, y2 coordinates
    const angleRad = ((angle - 90) * Math.PI) / 180;
    const x1 = 50 + Math.cos(angleRad + Math.PI) * 50;
    const y1 = 50 + Math.sin(angleRad + Math.PI) * 50;
    const x2 = 50 + Math.cos(angleRad) * 50;
    const y2 = 50 + Math.sin(angleRad) * 50;

    const stops = config.stops
      .map(
        (stop) =>
          `  <stop offset="${stop.position}%" stop-color="${stop.color}"/>`,
      )
      .join("\n");

    const gradientDef = `
<linearGradient id="${gradientId}" 
                x1="${x1.toFixed(2)}%" y1="${y1.toFixed(2)}%" 
                x2="${x2.toFixed(2)}%" y2="${y2.toFixed(2)}%">
${stops}
</linearGradient>`.trim();

    return {
      gradientId,
      gradientDef,
      fill: `url(#${gradientId})`,
    };
  }

  /**
   * Generate SVG radial gradient definition
   */
  generateRadialGradient(config: GradientConfig): {
    gradientId: string;
    gradientDef: string;
    fill: string;
  } {
    const gradientId = this.generateGradientId();

    const stops = config.stops
      .map(
        (stop) =>
          `  <stop offset="${stop.position}%" stop-color="${stop.color}"/>`,
      )
      .join("\n");

    const gradientDef = `
<radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
${stops}
</radialGradient>`.trim();

    return {
      gradientId,
      gradientDef,
      fill: `url(#${gradientId})`,
    };
  }

  /**
   * Generate dither noise filter
   *
   * Doc 2: "Using feTurbulence with a very low base frequency
   * and mode='multiply'"
   */
  generateDitherFilter(intensity: number = 0.03): DitherFilter {
    const cacheKey = intensity.toString();

    if (this.ditherFilterCache.has(cacheKey)) {
      return this.ditherFilterCache.get(cacheKey)!;
    }

    const filterId = this.generateDitherFilterId();

    // Doc 2: "Deterministic Noise Grain" - use fixed seed for consistency
    const filterDef = `
<filter id="${filterId}" x="0%" y="0%" width="100%" height="100%">
  <!-- Generate noise pattern -->
  <feTurbulence 
    type="${DEFAULT_TURBULENCE.type}"
    baseFrequency="${DEFAULT_TURBULENCE.baseFrequency}"
    numOctaves="${DEFAULT_TURBULENCE.numOctaves}"
    seed="${DEFAULT_TURBULENCE.seed}"
    result="noise"
  />
  
  <!-- Convert to grayscale and reduce intensity -->
  <feColorMatrix 
    in="noise"
    type="matrix"
    values="
      ${intensity} 0 0 0 ${0.5 - intensity / 2}
      0 ${intensity} 0 0 ${0.5 - intensity / 2}
      0 0 ${intensity} 0 ${0.5 - intensity / 2}
      0 0 0 1 0
    "
    result="reducedNoise"
  />
  
  <!-- Blend with source using multiply -->
  <feBlend in="SourceGraphic" in2="reducedNoise" mode="multiply" result="dithered"/>
</filter>`.trim();

    const filter: DitherFilter = {
      filterId,
      filterDef,
    };

    this.ditherFilterCache.set(cacheKey, filter);
    return filter;
  }

  /**
   * Generate gradient with automatic dithering
   */
  generateGradientWithDither(
    config: GradientConfig,
    width: PT,
    height: PT,
  ): {
    gradientId: string;
    gradientDef: string;
    ditherFilter?: DitherFilter;
    fill: string;
    filter?: string;
  } {
    // Generate base gradient
    const gradient =
      config.type === "radial"
        ? this.generateRadialGradient(config)
        : this.generateLinearGradient(config);

    // Check if dithering is needed
    const distance = Math.max(width, height);
    if (needsDithering(config, distance)) {
      // Calculate dither intensity based on color delta
      const minDelta = Math.min(
        ...config.stops
          .slice(0, -1)
          .map((stop, i) =>
            calculateColorDelta(stop.color, config.stops[i + 1].color),
          ),
      );

      // Lower delta = more visible banding = higher dither intensity
      const intensity = Math.max(
        0.02,
        Math.min(0.08, (LOW_DELTA_THRESHOLD - minDelta) / 500),
      );
      const ditherFilter = this.generateDitherFilter(intensity);

      return {
        ...gradient,
        ditherFilter,
        filter: `url(#${ditherFilter.filterId})`,
      };
    }

    return gradient;
  }

  /**
   * Generate a smooth grey-to-white gradient (common banding case)
   */
  generateSubtleGradient(
    startColor: HexColor = "#FFFFFF",
    endColor: HexColor = "#F0F0F0",
    angle: number = 180,
  ): GradientConfig {
    return {
      type: "linear",
      angle,
      stops: [
        { color: startColor, position: 0 },
        { color: endColor, position: 100 },
      ],
      dither: true,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.gradientCache.clear();
    this.ditherFilterCache.clear();
    gradientCounter = 0;
    ditherFilterCounter = 0;
  }
}

// =============================================================================
// GRADIENT RECT GENERATOR
// =============================================================================

/**
 * GradientRectGenerator - Creates complete SVG elements with gradients
 */
export class GradientRectGenerator {
  private generator: GradientGenerator;
  private collectedDefs: string[] = [];

  constructor(generator?: GradientGenerator) {
    this.generator = generator || new GradientGenerator();
  }

  /**
   * Generate a rect with gradient fill and optional dithering
   */
  generateGradientRect(
    x: number,
    y: number,
    width: number,
    height: number,
    config: GradientConfig,
    additionalAttrs: Record<string, string> = {},
  ): { rect: string; defs: string } {
    const result = this.generator.generateGradientWithDither(
      config,
      width,
      height,
    );

    const defs: string[] = [result.gradientDef];
    if (result.ditherFilter) {
      defs.push(result.ditherFilter.filterDef);
    }

    this.collectedDefs.push(...defs);

    const attrs = Object.entries(additionalAttrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");

    const filterAttr = result.filter ? `filter="${result.filter}"` : "";
    const rect = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${result.fill}" ${filterAttr} ${attrs}/>`;

    return {
      rect,
      defs: `<defs>\n${defs.join("\n")}\n</defs>`,
    };
  }

  /**
   * Generate a full-page gradient background
   */
  generatePageBackground(
    width: number,
    height: number,
    config: GradientConfig,
  ): string {
    const { rect, defs } = this.generateGradientRect(
      0,
      0,
      width,
      height,
      config,
    );

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  ${rect}
</svg>`.trim();
  }

  /**
   * Get all collected definitions
   */
  getCollectedDefs(): string {
    if (this.collectedDefs.length === 0) {
      return "";
    }
    return `<defs>\n${this.collectedDefs.join("\n")}\n</defs>`;
  }

  /**
   * Reset collected definitions
   */
  reset(): void {
    this.collectedDefs = [];
  }
}

// =============================================================================
// PRESET GRADIENTS
// =============================================================================

/** Common gradient presets */
export const GRADIENT_PRESETS = {
  /** Subtle white to light grey (common banding case) */
  subtleGrey: {
    type: "linear" as const,
    angle: 180,
    stops: [
      { color: "#FFFFFF", position: 0 },
      { color: "#F0F0F0", position: 100 },
    ],
    dither: true,
  },

  /** Soft blue gradient */
  softBlue: {
    type: "linear" as const,
    angle: 135,
    stops: [
      { color: "#E3F2FD", position: 0 },
      { color: "#BBDEFB", position: 100 },
    ],
    dither: true,
  },

  /** Professional header gradient */
  headerDark: {
    type: "linear" as const,
    angle: 180,
    stops: [
      { color: "#1A1A2E", position: 0 },
      { color: "#16213E", position: 100 },
    ],
    dither: true,
  },

  /** Warm sunset gradient */
  warmSunset: {
    type: "linear" as const,
    angle: 45,
    stops: [
      { color: "#FF6B6B", position: 0 },
      { color: "#FEC89A", position: 100 },
    ],
    dither: false, // High contrast, no dithering needed
  },

  /** Radial spotlight */
  spotlight: {
    type: "radial" as const,
    stops: [
      { color: "#FFFFFF", position: 0 },
      { color: "#F5F5F5", position: 50 },
      { color: "#E0E0E0", position: 100 },
    ],
    dither: true,
  },
};

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default gradient generator */
export const gradientGenerator = new GradientGenerator();

/** Default gradient rect generator */
export const gradientRectGenerator = new GradientRectGenerator(
  gradientGenerator,
);
