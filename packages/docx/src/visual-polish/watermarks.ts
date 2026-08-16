/**
 * Watermark System (Doc 3, Section 6)
 * ====================================
 *
 * Implements document protective furniture including watermarks,
 * confidentiality stamps, and draft indicators.
 *
 * Doc 3: "Watermarks provide document protection and status
 * indication without interfering with content readability."
 */

import {
  WatermarkConfig,
  WatermarkPosition,
  PT,
  HexColor,
} from "./types";

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  type: "text",
  text: "DRAFT",
  position: "diagonal",
  rotation: -45,
  opacity: 0.1,
  fontSize: 72,
  fontFamily: "sans-serif",
  color: "#000000",
  blendMode: "multiply",
  pages: "all",
  layer: 0,
};

// =============================================================================
// WATERMARK GENERATOR
// =============================================================================

/**
 * WatermarkGenerator - Creates watermark SVG elements
 */
export class WatermarkGenerator {
  /**
   * Generate a text watermark
   */
  generateTextWatermark(
    config: WatermarkConfig,
    pageWidth: PT,
    pageHeight: PT,
  ): string {
    const {
      text = "WATERMARK",
      position = "diagonal",
      rotation = -45,
      opacity = 0.1,
      fontSize = 72,
      fontFamily = "sans-serif",
      color = "#000000",
    } = config;

    const { x, y } = this.getPosition(position, pageWidth, pageHeight);
    const transform = this.getTransform(
      position,
      rotation,
      pageWidth,
      pageHeight,
    );

    return `
<svg class="watermark watermark-text" 
     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: ${config.layer};">
  <text 
    x="${x}" 
    y="${y}" 
    font-family="${fontFamily}" 
    font-size="${fontSize}pt" 
    fill="${color}" 
    fill-opacity="${opacity}"
    text-anchor="middle"
    dominant-baseline="middle"
    transform="${transform}"
  >
    ${text}
  </text>
</svg>`.trim();
  }

  /**
   * Generate an image watermark
   */
  generateImageWatermark(
    config: WatermarkConfig,
    pageWidth: PT,
    pageHeight: PT,
  ): string {
    const {
      imageUrl = "",
      position = "center",
      rotation = 0,
      opacity = 0.1,
    } = config;

    if (!imageUrl) return "";

    const { x, y } = this.getPosition(position, pageWidth, pageHeight);
    const transform = rotation !== 0 ? `rotate(${rotation}, ${x}, ${y})` : "";

    // Assume watermark image is ~20% of page width
    const imgWidth = pageWidth * 0.2;
    const imgHeight = imgWidth; // Assume square for simplicity

    return `
<svg class="watermark watermark-image" 
     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: ${config.layer};">
  <image 
    href="${imageUrl}"
    x="${x - imgWidth / 2}" 
    y="${y - imgHeight / 2}"
    width="${imgWidth}"
    height="${imgHeight}"
    opacity="${opacity}"
    transform="${transform}"
    preserveAspectRatio="xMidYMid meet"
  />
</svg>`.trim();
  }

  /**
   * Generate watermark based on type
   */
  generate(config: WatermarkConfig, pageWidth: PT, pageHeight: PT): string {
    if (config.type === "image" && config.imageUrl) {
      return this.generateImageWatermark(config, pageWidth, pageHeight);
    }
    return this.generateTextWatermark(config, pageWidth, pageHeight);
  }

  /**
   * Get position coordinates for watermark placement
   */
  private getPosition(
    position: WatermarkPosition,
    pageWidth: PT,
    pageHeight: PT,
  ): { x: number; y: number } {
    const margin = 72; // 1 inch margin for corners

    switch (position) {
      case "top-left":
        return { x: margin, y: margin };
      case "top-right":
        return { x: pageWidth - margin, y: margin };
      case "bottom-left":
        return { x: margin, y: pageHeight - margin };
      case "bottom-right":
        return { x: pageWidth - margin, y: pageHeight - margin };
      case "diagonal":
      case "center":
      default:
        return { x: pageWidth / 2, y: pageHeight / 2 };
    }
  }

  /**
   * Get transform string for rotation
   */
  private getTransform(
    position: WatermarkPosition,
    rotation: number,
    pageWidth: PT,
    pageHeight: PT,
  ): string {
    const { x, y } = this.getPosition(position, pageWidth, pageHeight);

    if (position === "diagonal" && rotation === 0) {
      // Auto-calculate diagonal angle
      const diagonalAngle = Math.atan2(pageHeight, pageWidth) * (180 / Math.PI);
      return `rotate(${-diagonalAngle}, ${x}, ${y})`;
    }

    if (rotation !== 0) {
      return `rotate(${rotation}, ${x}, ${y})`;
    }

    return "";
  }
}

// =============================================================================
// WATERMARK APPLICATOR
// =============================================================================

/**
 * WatermarkApplicator - Applies watermarks to pages
 */
export class WatermarkApplicator {
  private generator: WatermarkGenerator;
  private watermarks: WatermarkConfig[] = [];

  constructor(generator?: WatermarkGenerator) {
    this.generator = generator || new WatermarkGenerator();
  }

  /**
   * Add a watermark configuration
   */
  addWatermark(config: Partial<WatermarkConfig>): void {
    this.watermarks.push({
      ...DEFAULT_WATERMARK_CONFIG,
      ...config,
      layer: this.watermarks.length,
    });
  }

  /**
   * Check if watermark should appear on a page
   */
  shouldApplyToPage(config: WatermarkConfig, pageNumber: number): boolean {
    const { pages } = config;

    if (pages === "all") return true;
    if (pages === "odd") return pageNumber % 2 === 1;
    if (pages === "even") return pageNumber % 2 === 0;
    if (Array.isArray(pages)) return pages.includes(pageNumber);

    return true;
  }

  /**
   * Generate watermarks for a page
   */
  generateForPage(pageNumber: number, pageWidth: PT, pageHeight: PT): string[] {
    return this.watermarks
      .filter((config) => this.shouldApplyToPage(config, pageNumber))
      .sort((a, b) => a.layer - b.layer)
      .map((config) => this.generator.generate(config, pageWidth, pageHeight));
  }

  /**
   * Clear all watermarks
   */
  clear(): void {
    this.watermarks = [];
  }
}

// =============================================================================
// WATERMARK PRESETS
// =============================================================================

/** Common watermark presets */
export const WATERMARK_PRESETS = {
  /** Draft document */
  draft: {
    type: "text" as const,
    text: "DRAFT",
    position: "diagonal" as const,
    rotation: -45,
    opacity: 0.08,
    fontSize: 96,
    fontFamily: "Arial, sans-serif",
    color: "#FF0000",
    blendMode: "multiply" as const,
    pages: "all" as const,
    layer: 0,
  } satisfies WatermarkConfig,

  /** Confidential document */
  confidential: {
    type: "text" as const,
    text: "CONFIDENTIAL",
    position: "diagonal" as const,
    rotation: -45,
    opacity: 0.06,
    fontSize: 72,
    fontFamily: "Arial, sans-serif",
    color: "#333333",
    blendMode: "multiply" as const,
    pages: "all" as const,
    layer: 0,
  } satisfies WatermarkConfig,

  /** Sample/Preview document */
  sample: {
    type: "text" as const,
    text: "SAMPLE",
    position: "diagonal" as const,
    rotation: -45,
    opacity: 0.1,
    fontSize: 120,
    fontFamily: "Arial, sans-serif",
    color: "#0066CC",
    blendMode: "multiply" as const,
    pages: "all" as const,
    layer: 0,
  } satisfies WatermarkConfig,

  /** Not for distribution */
  doNotDistribute: {
    type: "text" as const,
    text: "DO NOT DISTRIBUTE",
    position: "diagonal" as const,
    rotation: -45,
    opacity: 0.05,
    fontSize: 64,
    fontFamily: "Arial, sans-serif",
    color: "#990000",
    blendMode: "multiply" as const,
    pages: "all" as const,
    layer: 0,
  } satisfies WatermarkConfig,

  /** Approved stamp */
  approved: {
    type: "text" as const,
    text: "APPROVED",
    position: "top-right" as const,
    rotation: -15,
    opacity: 0.3,
    fontSize: 36,
    fontFamily: "Impact, sans-serif",
    color: "#006600",
    blendMode: "multiply" as const,
    pages: [1] as number[], // First page only
    layer: 1,
  } satisfies WatermarkConfig,

  /** Void/Cancelled */
  void: {
    type: "text" as const,
    text: "VOID",
    position: "center" as const,
    rotation: 0,
    opacity: 0.15,
    fontSize: 200,
    fontFamily: "Impact, sans-serif",
    color: "#FF0000",
    blendMode: "multiply" as const,
    pages: "all" as const,
    layer: 0,
  } satisfies WatermarkConfig,

  /** Copy watermark */
  copy: {
    type: "text" as const,
    text: "COPY",
    position: "bottom-right" as const,
    rotation: 0,
    opacity: 0.2,
    fontSize: 24,
    fontFamily: "Courier New, monospace",
    color: "#666666",
    blendMode: "multiply" as const,
    pages: "all" as const,
    layer: 0,
  } satisfies WatermarkConfig,
};

// =============================================================================
// TILED WATERMARK GENERATOR
// =============================================================================

/**
 * TiledWatermarkGenerator - Creates repeating tile patterns
 */
export class TiledWatermarkGenerator {
  /**
   * Generate a tiled watermark pattern
   */
  generateTiledWatermark(
    text: string,
    pageWidth: PT,
    pageHeight: PT,
    options: {
      fontSize?: PT;
      color?: HexColor;
      opacity?: number;
      spacing?: PT;
      rotation?: number;
    } = {},
  ): string {
    const {
      fontSize = 24,
      color = "#666666",
      opacity = 0.05,
      spacing = 150,
      rotation = -30,
    } = options;

    const patternId = `tiled-watermark-${Date.now()}`;

    // Create pattern definition
    const patternWidth = spacing * 2;
    const patternHeight = spacing;

    return `
<svg class="watermark watermark-tiled" 
     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
  <defs>
    <pattern id="${patternId}" width="${patternWidth}" height="${patternHeight}" patternUnits="userSpaceOnUse">
      <text 
        x="0" 
        y="${fontSize}" 
        font-family="sans-serif" 
        font-size="${fontSize}pt" 
        fill="${color}" 
        fill-opacity="${opacity}"
        transform="rotate(${rotation}, ${patternWidth / 2}, ${patternHeight / 2})"
      >
        ${text}
      </text>
      <text 
        x="${spacing}" 
        y="${fontSize + patternHeight / 2}" 
        font-family="sans-serif" 
        font-size="${fontSize}pt" 
        fill="${color}" 
        fill-opacity="${opacity}"
        transform="rotate(${rotation}, ${patternWidth / 2}, ${patternHeight / 2})"
      >
        ${text}
      </text>
    </pattern>
  </defs>
  <rect width="${pageWidth}" height="${pageHeight}" fill="url(#${patternId})" />
</svg>`.trim();
  }
}

// =============================================================================
// TIMESTAMP WATERMARK
// =============================================================================

/**
 * TimestampWatermark - Adds print date/time watermark
 */
export class TimestampWatermark {
  /**
   * Generate timestamp watermark
   */
  generate(
    pageWidth: PT,
    pageHeight: PT,
    options: {
      position?: WatermarkPosition;
      format?: "date" | "datetime" | "iso";
      prefix?: string;
      fontSize?: PT;
      color?: HexColor;
      opacity?: number;
    } = {},
  ): string {
    const {
      position = "bottom-left",
      format = "datetime",
      prefix = "Printed: ",
      fontSize = 8,
      color = "#999999",
      opacity = 0.5,
    } = options;

    const timestamp = this.formatTimestamp(format);
    const text = `${prefix}${timestamp}`;

    const { x, y, anchor } = this.getPositionAndAnchor(
      position,
      pageWidth,
      pageHeight,
    );

    return `
<svg class="watermark watermark-timestamp" 
     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
  <text 
    x="${x}" 
    y="${y}" 
    font-family="monospace" 
    font-size="${fontSize}pt" 
    fill="${color}" 
    fill-opacity="${opacity}"
    text-anchor="${anchor}"
  >
    ${text}
  </text>
</svg>`.trim();
  }

  /**
   * Format timestamp string
   */
  private formatTimestamp(format: "date" | "datetime" | "iso"): string {
    const now = new Date();

    switch (format) {
      case "date":
        return now.toLocaleDateString();
      case "iso":
        return now.toISOString();
      case "datetime":
      default:
        return now.toLocaleString();
    }
  }

  /**
   * Get position and text anchor
   */
  private getPositionAndAnchor(
    position: WatermarkPosition,
    pageWidth: PT,
    pageHeight: PT,
  ): { x: number; y: number; anchor: string } {
    const margin = 18;

    switch (position) {
      case "top-left":
        return { x: margin, y: margin + 8, anchor: "start" };
      case "top-right":
        return { x: pageWidth - margin, y: margin + 8, anchor: "end" };
      case "bottom-right":
        return { x: pageWidth - margin, y: pageHeight - margin, anchor: "end" };
      case "bottom-left":
      default:
        return { x: margin, y: pageHeight - margin, anchor: "start" };
    }
  }
}

// =============================================================================
// WATERMARK PROCESSOR
// =============================================================================

/**
 * WatermarkProcessor - Full pipeline for document watermarks
 */
export class WatermarkProcessor {
  private applicator: WatermarkApplicator;
  private tiledGenerator: TiledWatermarkGenerator;
  private timestampGenerator: TimestampWatermark;

  constructor() {
    this.applicator = new WatermarkApplicator();
    this.tiledGenerator = new TiledWatermarkGenerator();
    this.timestampGenerator = new TimestampWatermark();
  }

  /**
   * Add a preset watermark
   */
  addPreset(presetName: keyof typeof WATERMARK_PRESETS): void {
    const preset = WATERMARK_PRESETS[presetName];
    if (preset) {
      this.applicator.addWatermark(preset);
    }
  }

  /**
   * Add a custom watermark
   */
  addCustom(config: Partial<WatermarkConfig>): void {
    this.applicator.addWatermark(config);
  }

  /**
   * Add timestamp watermark
   */
  addTimestamp(options?: Parameters<TimestampWatermark["generate"]>[2]): void {
    // Store timestamp options for later rendering
    this._timestampOptions = options;
  }

  private _timestampOptions?: Parameters<TimestampWatermark["generate"]>[2];
  private _tiledConfig?: {
    text: string;
    options: Parameters<TiledWatermarkGenerator["generateTiledWatermark"]>[3];
  };

  /**
   * Add tiled watermark
   */
  addTiled(
    text: string,
    options?: Parameters<TiledWatermarkGenerator["generateTiledWatermark"]>[3],
  ): void {
    this._tiledConfig = { text, options };
  }

  /**
   * Generate all watermarks for a page
   */
  generateForPage(pageNumber: number, pageWidth: PT, pageHeight: PT): string {
    const watermarks: string[] = [];

    // Standard watermarks
    watermarks.push(
      ...this.applicator.generateForPage(pageNumber, pageWidth, pageHeight),
    );

    // Tiled watermark
    if (this._tiledConfig) {
      watermarks.push(
        this.tiledGenerator.generateTiledWatermark(
          this._tiledConfig.text,
          pageWidth,
          pageHeight,
          this._tiledConfig.options,
        ),
      );
    }

    // Timestamp
    if (
      this._timestampOptions !== undefined ||
      (this._timestampOptions === undefined && this._addTimestamp)
    ) {
      watermarks.push(
        this.timestampGenerator.generate(
          pageWidth,
          pageHeight,
          this._timestampOptions,
        ),
      );
    }

    return watermarks.join("\n");
  }

  private _addTimestamp = false;

  /**
   * Generate CSS for watermarks
   */
  generateCSS(): string {
    return `
.watermark {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.watermark-text {
  overflow: visible;
}

@media print {
  .watermark {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`.trim();
  }

  /**
   * Reset all watermarks
   */
  reset(): void {
    this.applicator.clear();
    this._timestampOptions = undefined;
    this._tiledConfig = undefined;
    this._addTimestamp = false;
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default watermark generator */
export const watermarkGenerator = new WatermarkGenerator();

/** Default watermark applicator */
export const watermarkApplicator = new WatermarkApplicator();

/** Default watermark processor */
export const watermarkProcessor = new WatermarkProcessor();
