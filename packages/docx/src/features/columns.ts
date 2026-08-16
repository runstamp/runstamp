/**
 * Multi-column layout support for DOCX.
 *
 * Enables 2-4 column layouts in documents.
 */

import type { StructuredElement } from '../types';
import { inchesToTwips } from '../utils/units';

/**
 * Extended style interface for column detection.
 */
interface ExtendedStyle {
  display?: string;
  columnCount?: number | string;
  [key: string]: unknown;
}

/**
 * Column configuration.
 */
export interface ColumnConfig {
  count: number; // 1-4
  space: number; // twips between columns
  separate?: boolean; // Line between columns
  equalWidth?: boolean; // All columns same width
  widths?: number[]; // Custom widths in twips (if not equal)
}

/**
 * Default column spacing (0.5 inch).
 */
export const DEFAULT_COLUMN_SPACE = inchesToTwips(0.5);

/**
 * Create column configuration.
 */
export function createColumnConfig(
  count: number,
  options: {
    space?: number;
    separate?: boolean;
    widths?: number[];
  } = {}
): ColumnConfig {
  const validCount = Math.max(1, Math.min(count, 4));

  return {
    count: validCount,
    space: options.space ?? DEFAULT_COLUMN_SPACE,
    separate: options.separate ?? false,
    equalWidth: !options.widths || options.widths.length === 0,
    widths: options.widths,
  };
}

/**
 * Detect column count from CSS styles.
 */
export function detectColumnsFromStyle(style: ExtendedStyle): number {
  // CSS columns property
  if (style.columnCount !== undefined) {
    const count = typeof style.columnCount === 'number'
      ? style.columnCount
      : parseInt(String(style.columnCount), 10);

    if (!isNaN(count) && count > 1) {
      return Math.min(count, 4);
    }
  }

  // Check for flex/grid that might indicate columns
  if (style.display === 'flex' || style.display === 'grid') {
    // Would need child analysis to determine column count
    // For now, return 1
  }

  return 1;
}

/**
 * Detect columns from element children (flex/grid layouts).
 */
export function detectColumnsFromChildren(children: StructuredElement[]): number {
  if (children.length < 2 || children.length > 4) {
    return 1;
  }

  // Check if all children have similar widths
  const widths = children
    .filter(child => child.position?.width)
    .map(child => child.position!.width);

  if (widths.length < 2) {
    return 1;
  }

  // Calculate average width
  const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;

  // Check if widths are roughly equal (within 20%)
  const areEqual = widths.every(w => Math.abs(w - avgWidth) < avgWidth * 0.2);

  if (areEqual && children.length >= 2 && children.length <= 4) {
    return children.length;
  }

  return 1;
}

/**
 * Convert column config to DOCX section properties.
 * Returns basic column configuration (custom widths not supported in this simplified version).
 */
export function columnConfigToDocx(config: ColumnConfig) {
  if (config.count <= 1) {
    return undefined;
  }

  // Note: Custom column widths require docx Column class which has complex instantiation.
  // For simplicity, we only support equal-width columns here.
  return {
    column: {
      count: config.count,
      space: config.space,
      separate: config.separate,
    },
  };
}

/**
 * Calculate equal column widths.
 */
export function calculateEqualColumnWidths(
  contentWidth: number, // twips
  columnCount: number,
  gapWidth: number = DEFAULT_COLUMN_SPACE
): number[] {
  if (columnCount <= 1) {
    return [contentWidth];
  }

  const totalGaps = (columnCount - 1) * gapWidth;
  const columnWidth = Math.floor((contentWidth - totalGaps) / columnCount);

  return Array(columnCount).fill(columnWidth);
}

/**
 * Create a two-column layout configuration.
 */
export function createTwoColumnConfig(options: {
  space?: number;
  separate?: boolean;
} = {}): ColumnConfig {
  return createColumnConfig(2, options);
}

/**
 * Create a three-column layout configuration.
 */
export function createThreeColumnConfig(options: {
  space?: number;
  separate?: boolean;
} = {}): ColumnConfig {
  return createColumnConfig(3, options);
}

/**
 * Create a left-narrow, right-wide layout (sidebar style).
 */
export function createSidebarLayout(
  contentWidth: number,
  sidebarWidth: number = inchesToTwips(2),
  space: number = DEFAULT_COLUMN_SPACE
): ColumnConfig {
  return {
    count: 2,
    space,
    separate: false,
    equalWidth: false,
    widths: [sidebarWidth, contentWidth - sidebarWidth - space],
  };
}

/**
 * Create a newspaper-style layout (multiple equal columns).
 */
export function createNewspaperLayout(
  columns: number = 3,
  space: number = inchesToTwips(0.25)
): ColumnConfig {
  return {
    count: Math.min(columns, 4),
    space,
    separate: true, // Lines between columns
    equalWidth: true,
  };
}

/**
 * Determine if content should be in columns based on element type.
 */
export function shouldUseColumns(elementType: string): boolean {
  // Tables and images usually shouldn't span columns
  const noColumnTypes = ['table', 'image', 'chart', 'figure'];
  return !noColumnTypes.includes(elementType.toLowerCase());
}
