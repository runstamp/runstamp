/**
 * Pre-Press Furniture (Doc 2, Section 4)
 * ======================================
 *
 * Implements professional print-ready PDF structure:
 * - MediaBox, BleedBox, TrimBox definitions
 * - Crop marks and registration marks
 * - Color bars for print verification
 *
 * Doc 2: "Professional PDF prepress spec differentiates three main boxes:
 * MediaBox (physical page), BleedBox (extends beyond trim), TrimBox (final cut)"
 */

import {
  PrePressConfig,
  PrePressBoxes,
  CropMarkConfig,
  PT,
  MM,
  INCH,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Standard bleed sizes in points */
export const BLEED_SIZES = {
  none: 0,
  standard: 9, // 3mm (0.125")
  extended: 18, // 6mm (0.25")
  maximum: 36, // 12.7mm (0.5")
} as const;

/** Standard crop mark settings */
const DEFAULT_CROP_MARK: CropMarkConfig = {
  length: 18, // 6mm
  offset: 9, // 3mm from trim
  strokeWidth: 0.25,
  color: "registration", // 100% of all inks
};

/** Registration mark colors - uses all process colors */
const REGISTRATION_BLACK = "#000000";

// =============================================================================
// UNIT CONVERSIONS
// =============================================================================

/** Points per millimeter */
const PT_PER_MM = 72 / 25.4;

/** Points per inch */
const PT_PER_INCH = 72;

/**
 * Convert millimeters to points
 */
export function mmToPt(mm: MM): PT {
  return mm * PT_PER_MM;
}

/**
 * Convert inches to points
 */
export function inchToPt(inches: INCH): PT {
  return inches * PT_PER_INCH;
}

/**
 * Convert points to millimeters
 */
export function ptToMm(pt: PT): MM {
  return pt / PT_PER_MM;
}

// =============================================================================
// PRE-PRESS BOX CALCULATOR
// =============================================================================

/**
 * PrePressBoxCalculator - Calculates media, bleed, trim, and art boxes
 */
export class PrePressBoxCalculator {
  private config: PrePressConfig;

  constructor(config: PrePressConfig) {
    this.config = config;
  }

  /**
   * Calculate all pre-press boxes from trim size
   *
   * Doc 2: "MediaBox encompasses everything, BleedBox extends
   * 3mm beyond the TrimBox, TrimBox defines the actual final page."
   */
  calculateBoxes(trimWidth: PT, trimHeight: PT): PrePressBoxes {
    const bleed = this.config.bleed ?? BLEED_SIZES.standard;
    const safeMargin = this.config.safeMargin ?? 18; // 6mm default

    // TrimBox - the final page size after cutting
    const trimBox = {
      x: 0,
      y: 0,
      width: trimWidth,
      height: trimHeight,
    };

    // BleedBox - extends beyond trim by bleed amount
    const bleedBox = {
      x: -bleed,
      y: -bleed,
      width: trimWidth + bleed * 2,
      height: trimHeight + bleed * 2,
    };

    // MediaBox - encompasses bleed plus crop marks
    const cropMarkSpace = this.config.cropMarks
      ? (this.config.cropMarkLength ?? DEFAULT_CROP_MARK.length) +
        (this.config.cropMarkOffset ?? DEFAULT_CROP_MARK.offset)
      : 0;

    const mediaBox = {
      x: -bleed - cropMarkSpace,
      y: -bleed - cropMarkSpace,
      width: trimWidth + (bleed + cropMarkSpace) * 2,
      height: trimHeight + (bleed + cropMarkSpace) * 2,
    };

    // ArtBox - safe area inside trim (no content cut off)
    const artBox = {
      x: safeMargin,
      y: safeMargin,
      width: trimWidth - safeMargin * 2,
      height: trimHeight - safeMargin * 2,
    };

    return {
      mediaBox,
      bleedBox,
      trimBox,
      artBox,
    };
  }

  /**
   * Get CSS for bleed-safe content area
   */
  getBleedSafeCSS(): string {
    const safeMargin = this.config.safeMargin ?? 18;
    return `
      .bleed-safe {
        margin: ${safeMargin}pt;
        position: relative;
        box-sizing: border-box;
      }
      
      .bleed-extends {
        position: absolute;
        margin: -${this.config.bleed ?? BLEED_SIZES.standard}pt;
      }
    `;
  }
}

// =============================================================================
// CROP MARKS GENERATOR
// =============================================================================

/**
 * CropMarksGenerator - Creates crop marks and registration marks
 */
export class CropMarksGenerator {
  private config: CropMarkConfig;

  constructor(config: Partial<CropMarkConfig> = {}) {
    this.config = { ...DEFAULT_CROP_MARK, ...config };
  }

  /**
   * Generate crop marks SVG for a page
   *
   * Crop marks are placed at all four corners, indicating where to cut.
   */
  generateCropMarks(trimWidth: PT, trimHeight: PT): string {
    const { length, offset, strokeWidth, color } = this.config;
    const strokeColor = color === "registration" ? REGISTRATION_BLACK : color;

    const marks: string[] = [];

    // Helper to create a crop mark line
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
      `stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;

    // Top-left corner
    marks.push(line(-offset - length, 0, -offset, 0)); // horizontal
    marks.push(line(0, -offset - length, 0, -offset)); // vertical

    // Top-right corner
    marks.push(line(trimWidth + offset, 0, trimWidth + offset + length, 0));
    marks.push(line(trimWidth, -offset - length, trimWidth, -offset));

    // Bottom-left corner
    marks.push(line(-offset - length, trimHeight, -offset, trimHeight));
    marks.push(line(0, trimHeight + offset, 0, trimHeight + offset + length));

    // Bottom-right corner
    marks.push(
      line(
        trimWidth + offset,
        trimHeight,
        trimWidth + offset + length,
        trimHeight,
      ),
    );
    marks.push(
      line(
        trimWidth,
        trimHeight + offset,
        trimWidth,
        trimHeight + offset + length,
      ),
    );

    return `<g class="crop-marks">\n  ${marks.join("\n  ")}\n</g>`;
  }

  /**
   * Generate registration marks
   *
   * Registration marks help align color separations in multi-color printing.
   */
  generateRegistrationMarks(trimWidth: PT, trimHeight: PT): string {
    const offset = this.config.offset + this.config.length / 2;
    const size = 12; // Standard registration mark size
    const { strokeWidth } = this.config;

    const marks: string[] = [];

    // Registration mark positions (outside each edge)
    const positions = [
      { x: trimWidth / 2, y: -offset }, // top center
      { x: trimWidth / 2, y: trimHeight + offset }, // bottom center
      { x: -offset, y: trimHeight / 2 }, // left center
      { x: trimWidth + offset, y: trimHeight / 2 }, // right center
    ];

    for (const pos of positions) {
      marks.push(`
        <g transform="translate(${pos.x}, ${pos.y})">
          <circle cx="0" cy="0" r="${size / 2}" fill="none" stroke="${REGISTRATION_BLACK}" stroke-width="${strokeWidth}" />
          <line x1="${-size / 2}" y1="0" x2="${size / 2}" y2="0" stroke="${REGISTRATION_BLACK}" stroke-width="${strokeWidth}" />
          <line x1="0" y1="${-size / 2}" x2="0" y2="${size / 2}" stroke="${REGISTRATION_BLACK}" stroke-width="${strokeWidth}" />
        </g>
      `);
    }

    return `<g class="registration-marks">\n${marks.join("\n")}\n</g>`;
  }

  /**
   * Generate color bar for print verification
   *
   * Color bars help printers verify color density and registration.
   */
  generateColorBar(trimWidth: PT, trimHeight: PT): string {
    const barHeight = 9; // 3mm
    const patchWidth = 18; // 6mm
    const offset = this.config.offset + this.config.length + 3;

    // Standard process colors + grey patches
    const colors = [
      "#00FFFF", // Cyan
      "#FF00FF", // Magenta
      "#FFFF00", // Yellow
      "#000000", // Black
      "#FF0000", // Red (M+Y)
      "#00FF00", // Green (C+Y)
      "#0000FF", // Blue (C+M)
      "#CCCCCC", // 20% grey
      "#999999", // 40% grey
      "#666666", // 60% grey
      "#333333", // 80% grey
    ];

    const totalWidth = colors.length * patchWidth;
    const startX = (trimWidth - totalWidth) / 2;
    const y = trimHeight + offset;

    const patches = colors.map(
      (color, i) =>
        `<rect x="${startX + i * patchWidth}" y="${y}" width="${patchWidth}" height="${barHeight}" fill="${color}" />`,
    );

    return `
<g class="color-bar">
  ${patches.join("\n  ")}
</g>`.trim();
  }
}

// =============================================================================
// SLUG CONTENT GENERATOR
// =============================================================================

/**
 * SlugContentGenerator - Creates slug area content (job info, dates, etc.)
 */
export class SlugContentGenerator {
  /**
   * Generate slug with job information
   */
  generateSlug(
    trimWidth: PT,
    trimHeight: PT,
    info: {
      filename?: string;
      date?: string;
      pageNumber?: number;
      totalPages?: number;
      plateColor?: string;
    },
    offset: PT = 36,
  ): string {
    const y = trimHeight + offset;
    const fontSize = 6;
    const parts: string[] = [];

    if (info.filename) {
      parts.push(info.filename);
    }
    if (info.date) {
      parts.push(info.date);
    }
    if (info.pageNumber !== undefined) {
      const pageText = info.totalPages
        ? `Page ${info.pageNumber} of ${info.totalPages}`
        : `Page ${info.pageNumber}`;
      parts.push(pageText);
    }
    if (info.plateColor) {
      parts.push(`[${info.plateColor}]`);
    }

    const text = parts.join(" | ");

    return `
<text x="${trimWidth / 2}" y="${y}" 
      font-family="Helvetica, Arial, sans-serif" 
      font-size="${fontSize}" 
      text-anchor="middle" 
      fill="#666666">
  ${text}
</text>`.trim();
  }
}

// =============================================================================
// PRE-PRESS PAGE GENERATOR
// =============================================================================

/**
 * PrePressPageGenerator - Creates complete pre-press ready pages
 */
export class PrePressPageGenerator {
  private boxCalculator: PrePressBoxCalculator;
  private cropMarksGenerator: CropMarksGenerator;
  private slugGenerator: SlugContentGenerator;
  private config: PrePressConfig;

  constructor(config: PrePressConfig) {
    this.config = config;
    this.boxCalculator = new PrePressBoxCalculator(config);
    this.cropMarksGenerator = new CropMarksGenerator({
      length: config.cropMarkLength,
      offset: config.cropMarkOffset,
    });
    this.slugGenerator = new SlugContentGenerator();
  }

  /**
   * Generate complete pre-press SVG wrapper
   */
  generatePrePressWrapper(
    trimWidth: PT,
    trimHeight: PT,
    content: string,
    pageInfo?: {
      filename?: string;
      date?: string;
      pageNumber?: number;
      totalPages?: number;
    },
  ): string {
    const boxes = this.boxCalculator.calculateBoxes(trimWidth, trimHeight);
    const elements: string[] = [];

    // Bleed area background (if specified)
    if (this.config.bleedColor) {
      elements.push(`
<rect x="${boxes.bleedBox.x}" y="${boxes.bleedBox.y}" 
      width="${boxes.bleedBox.width}" height="${boxes.bleedBox.height}" 
      fill="${this.config.bleedColor}" class="bleed-area" />`);
    }

    // Page content area (white by default)
    elements.push(`
<rect x="0" y="0" width="${trimWidth}" height="${trimHeight}" 
      fill="white" class="page-area" />`);

    // Main content
    elements.push(`<g class="page-content">\n${content}\n</g>`);

    // Crop marks
    if (this.config.cropMarks) {
      elements.push(
        this.cropMarksGenerator.generateCropMarks(trimWidth, trimHeight),
      );
    }

    // Registration marks
    if (this.config.registrationMarks) {
      elements.push(
        this.cropMarksGenerator.generateRegistrationMarks(
          trimWidth,
          trimHeight,
        ),
      );
    }

    // Color bar
    if (this.config.colorBar) {
      elements.push(
        this.cropMarksGenerator.generateColorBar(trimWidth, trimHeight),
      );
    }

    // Slug content
    if (this.config.slug && pageInfo) {
      elements.push(
        this.slugGenerator.generateSlug(trimWidth, trimHeight, {
          ...pageInfo,
          date: pageInfo.date ?? new Date().toISOString().split("T")[0],
        }),
      );
    }

    // Calculate viewBox from mediaBox
    const viewBox = `${boxes.mediaBox.x} ${boxes.mediaBox.y} ${boxes.mediaBox.width} ${boxes.mediaBox.height}`;

    return `
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${boxes.mediaBox.width}pt" 
     height="${boxes.mediaBox.height}pt"
     viewBox="${viewBox}">
  <!-- Pre-press boxes metadata -->
  <metadata>
    <prepress:boxes xmlns:prepress="http://ns.adobe.com/prepress/1.0/">
      <prepress:MediaBox x="${boxes.mediaBox.x}" y="${boxes.mediaBox.y}" width="${boxes.mediaBox.width}" height="${boxes.mediaBox.height}" />
      <prepress:BleedBox x="${boxes.bleedBox.x}" y="${boxes.bleedBox.y}" width="${boxes.bleedBox.width}" height="${boxes.bleedBox.height}" />
      <prepress:TrimBox x="${boxes.trimBox.x}" y="${boxes.trimBox.y}" width="${boxes.trimBox.width}" height="${boxes.trimBox.height}" />
      <prepress:ArtBox x="${boxes.artBox.x}" y="${boxes.artBox.y}" width="${boxes.artBox.width}" height="${boxes.artBox.height}" />
    </prepress:boxes>
  </metadata>
  
  ${elements.join("\n  ")}
</svg>`.trim();
  }

  /**
   * Get pre-press boxes for external use
   */
  getBoxes(trimWidth: PT, trimHeight: PT): PrePressBoxes {
    return this.boxCalculator.calculateBoxes(trimWidth, trimHeight);
  }
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

/** Pre-press configuration presets */
export const PREPRESS_PRESETS = {
  /** Standard commercial print */
  commercial: {
    bleed: BLEED_SIZES.standard,
    safeMargin: 18,
    cropMarks: true,
    registrationMarks: true,
    colorBar: true,
    slug: true,
  } as PrePressConfig,

  /** High-end printing with extended bleed */
  premium: {
    bleed: BLEED_SIZES.extended,
    safeMargin: 27,
    cropMarks: true,
    cropMarkLength: 24,
    registrationMarks: true,
    colorBar: true,
    slug: true,
  } as PrePressConfig,

  /** Digital/office printing (no marks) */
  digital: {
    bleed: BLEED_SIZES.none,
    safeMargin: 18,
    cropMarks: false,
    registrationMarks: false,
    colorBar: false,
    slug: false,
  } as PrePressConfig,

  /** Proof printing (marks but no bleed) */
  proof: {
    bleed: BLEED_SIZES.none,
    safeMargin: 18,
    cropMarks: true,
    registrationMarks: false,
    colorBar: true,
    slug: true,
  } as PrePressConfig,
};

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default pre-press generator (commercial preset) */
export const defaultPrePressGenerator = new PrePressPageGenerator(
  PREPRESS_PRESETS.commercial,
);
