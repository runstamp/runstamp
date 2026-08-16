/**
 * Baseline Grid & Vertical Rhythm (Doc 1, Section 3)
 * ===================================================
 *
 * Implements the SOTA baseline grid system that ensures all elements
 * snap to a consistent grid, creating visual harmony across the document.
 *
 * Key Features:
 * - Snap-to-grid calculations
 * - Bottom spacer injection
 * - Cross-column baseline alignment
 */

import { PT, GridAlignment, BaselineGridConfig } from "./types";
import { designTokenManager } from "./design-tokens";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default baseline grid configuration */
export const DEFAULT_GRID_CONFIG: BaselineGridConfig = {
  gridBase: 4,
  strictMode: true,
  tolerance: 0.01,
};

// =============================================================================
// BASELINE GRID CALCULATOR
// =============================================================================

/**
 * BaselineGridCalculator - Handles all snap-to-grid calculations
 *
 * Doc 1, Section 3: "All line-heights, margins, and padding must be
 * multiples of the grid-base (e.g., 4pt)."
 */
export class BaselineGridCalculator {
  private config: BaselineGridConfig;

  constructor(config: Partial<BaselineGridConfig> = {}) {
    this.config = { ...DEFAULT_GRID_CONFIG, ...config };
  }

  /**
   * Get the grid base from theme or config
   */
  getGridBase(): PT {
    try {
      return designTokenManager.getGridBase();
    } catch {
      return this.config.gridBase;
    }
  }

  /**
   * Snap a value to the nearest grid line
   *
   * Doc 1: "If an element is measured at 102.5pt but the grid is 4pt,
   * the engine automatically adds a 1.5pt 'Bottom Spacer' to snap
   * the next element to the next baseline (104pt)."
   */
  snapToGrid(value: PT): GridAlignment {
    const gridBase = this.getGridBase();
    const gridUnits = Math.ceil(value / gridBase);
    const alignedHeight = gridUnits * gridBase;
    const spacerHeight = alignedHeight - value;

    return {
      originalHeight: value,
      alignedHeight,
      spacerHeight,
      gridUnits,
    };
  }

  /**
   * Snap a value down to the nearest grid line
   */
  snapToGridFloor(value: PT): GridAlignment {
    const gridBase = this.getGridBase();
    const gridUnits = Math.floor(value / gridBase);
    const alignedHeight = gridUnits * gridBase;
    const spacerHeight = value - alignedHeight;

    return {
      originalHeight: value,
      alignedHeight,
      spacerHeight: -spacerHeight, // Negative indicates removed height
      gridUnits,
    };
  }

  /**
   * Round to nearest grid line (up or down)
   */
  roundToGrid(value: PT): GridAlignment {
    const gridBase = this.getGridBase();
    const gridUnits = Math.round(value / gridBase);
    const alignedHeight = gridUnits * gridBase;
    const spacerHeight = alignedHeight - value;

    return {
      originalHeight: value,
      alignedHeight,
      spacerHeight,
      gridUnits,
    };
  }

  /**
   * Check if a value is aligned to the grid
   */
  isAligned(value: PT): boolean {
    const gridBase = this.getGridBase();
    const remainder = value % gridBase;
    return (
      remainder < this.config.tolerance ||
      gridBase - remainder < this.config.tolerance
    );
  }

  /**
   * Calculate the spacer needed to align an element
   */
  calculateSpacer(currentHeight: PT): PT {
    const alignment = this.snapToGrid(currentHeight);
    return alignment.spacerHeight;
  }

  /**
   * Calculate line height that aligns to the grid
   */
  calculateAlignedLineHeight(fontSize: PT, baseLineHeight: number): PT {
    const rawLineHeight = fontSize * baseLineHeight;
    const alignment = this.snapToGrid(rawLineHeight);
    return alignment.alignedHeight;
  }

  /**
   * Calculate margin that aligns to the grid
   */
  calculateAlignedMargin(desiredMargin: PT): PT {
    const alignment = this.snapToGrid(desiredMargin);
    return alignment.alignedHeight;
  }

  /**
   * Calculate the cumulative height with grid alignment
   */
  accumulateAlignedHeights(heights: PT[]): {
    total: PT;
    alignments: GridAlignment[];
    spacers: PT[];
  } {
    const alignments: GridAlignment[] = [];
    const spacers: PT[] = [];
    let runningTotal = 0;

    for (const height of heights) {
      // Snap each element to grid
      const alignment = this.snapToGrid(height);
      alignments.push(alignment);
      spacers.push(alignment.spacerHeight);
      runningTotal += alignment.alignedHeight;
    }

    return {
      total: runningTotal,
      alignments,
      spacers,
    };
  }

  /**
   * Ensure cross-column alignment
   *
   * Doc 1: "This creates a visual 'harmony' where text in the left column
   * perfectly aligns with text in the right column, even if they have
   * different font sizes."
   */
  alignColumns(
    leftColumnHeights: PT[],
    rightColumnHeights: PT[],
  ): {
    left: { heights: PT[]; spacers: PT[] };
    right: { heights: PT[]; spacers: PT[] };
    aligned: boolean;
  } {
    // Calculate aligned heights for each column
    const leftAligned = this.accumulateAlignedHeights(leftColumnHeights);
    const rightAligned = this.accumulateAlignedHeights(rightColumnHeights);

    // Check if totals align
    const difference = Math.abs(leftAligned.total - rightAligned.total);
    const aligned = difference < this.config.tolerance;

    return {
      left: {
        heights: leftAligned.alignments.map((a) => a.alignedHeight),
        spacers: leftAligned.spacers,
      },
      right: {
        heights: rightAligned.alignments.map((a) => a.alignedHeight),
        spacers: rightAligned.spacers,
      },
      aligned,
    };
  }

  /**
   * Generate CSS for baseline grid visualization (debugging)
   */
  generateGridOverlayCSS(): string {
    const gridBase = this.getGridBase();
    return `
      .baseline-grid-overlay {
        background-image: linear-gradient(
          to bottom,
          rgba(0, 119, 255, 0.1) 1px,
          transparent 1px
        );
        background-size: 100% ${gridBase}pt;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 9999;
      }
    `;
  }

  /**
   * Generate SVG baseline grid for verification
   */
  generateGridSVG(width: number, height: number): string {
    const gridBase = this.getGridBase();
    const lines: string[] = [];

    for (let y = 0; y < height; y += gridBase) {
      const isMajor = y % (gridBase * 4) === 0;
      lines.push(`
        <line 
          x1="0" y1="${y}" 
          x2="${width}" y2="${y}" 
          stroke="${isMajor ? "#0077FF" : "#00AAFF"}" 
          stroke-width="${isMajor ? 0.5 : 0.25}"
          stroke-opacity="${isMajor ? 0.5 : 0.2}"
        />
      `);
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" 
           width="${width}" height="${height}" 
           viewBox="0 0 ${width} ${height}">
        <defs>
          <pattern id="baselineGrid" width="${gridBase}" height="${gridBase}" patternUnits="userSpaceOnUse">
            <line x1="0" y1="${gridBase}" x2="${width}" y2="${gridBase}" 
                  stroke="#00AAFF" stroke-width="0.25" stroke-opacity="0.2"/>
          </pattern>
        </defs>
        ${lines.join("\n")}
      </svg>
    `;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BaselineGridConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BaselineGridConfig {
    return { ...this.config };
  }
}

// =============================================================================
// VERTICAL RHYTHM MANAGER
// =============================================================================

/**
 * VerticalRhythmManager - Higher-level manager for document rhythm
 */
export class VerticalRhythmManager {
  private gridCalculator: BaselineGridCalculator;
  private cursorY: PT = 0;

  constructor(gridCalculator?: BaselineGridCalculator) {
    this.gridCalculator = gridCalculator || new BaselineGridCalculator();
  }

  /**
   * Reset cursor position
   */
  reset(): void {
    this.cursorY = 0;
  }

  /**
   * Get current cursor position
   */
  getCursor(): PT {
    return this.cursorY;
  }

  /**
   * Advance cursor by element height (with grid alignment)
   */
  advanceCursor(elementHeight: PT): GridAlignment {
    const alignment = this.gridCalculator.snapToGrid(elementHeight);
    this.cursorY += alignment.alignedHeight;
    return alignment;
  }

  /**
   * Advance cursor with explicit spacer
   */
  advanceWithSpacer(elementHeight: PT, explicitSpacer?: PT): PT {
    const alignment = this.gridCalculator.snapToGrid(elementHeight);
    const spacer = explicitSpacer ?? alignment.spacerHeight;
    this.cursorY += elementHeight + spacer;
    return spacer;
  }

  /**
   * Check if cursor is on a grid line
   */
  isOnGrid(): boolean {
    return this.gridCalculator.isAligned(this.cursorY);
  }

  /**
   * Snap cursor to next grid line
   */
  snapCursor(): PT {
    const spacer = this.gridCalculator.calculateSpacer(this.cursorY);
    this.cursorY += spacer;
    return spacer;
  }

  /**
   * Calculate element placement with proper rhythm
   */
  placeElement(
    elementHeight: PT,
    marginTop: PT = 0,
    marginBottom: PT = 0,
  ): {
    position: PT;
    height: PT;
    totalSpace: PT;
    spacer: PT;
  } {
    // Align margin top
    const alignedMarginTop =
      this.gridCalculator.calculateAlignedMargin(marginTop);

    // Record start position
    const position = this.cursorY + alignedMarginTop;

    // Align element height
    const alignment = this.gridCalculator.snapToGrid(elementHeight);

    // Align margin bottom
    const alignedMarginBottom =
      this.gridCalculator.calculateAlignedMargin(marginBottom);

    // Calculate total space
    const totalSpace =
      alignedMarginTop + alignment.alignedHeight + alignedMarginBottom;

    // Advance cursor
    this.cursorY += totalSpace;

    return {
      position,
      height: alignment.alignedHeight,
      totalSpace,
      spacer: alignment.spacerHeight,
    };
  }

  /**
   * Calculate proper line height for font size
   */
  getAlignedLineHeight(fontSize: PT): PT {
    const baseLineHeight =
      designTokenManager.getTypography("line-height") || 1.5;
    return this.gridCalculator.calculateAlignedLineHeight(
      fontSize,
      baseLineHeight,
    );
  }

  /**
   * Get the underlying grid calculator
   */
  getGridCalculator(): BaselineGridCalculator {
    return this.gridCalculator;
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default baseline grid calculator */
export const baselineGridCalculator = new BaselineGridCalculator();

/** Default vertical rhythm manager */
export const verticalRhythmManager = new VerticalRhythmManager(
  baselineGridCalculator,
);
