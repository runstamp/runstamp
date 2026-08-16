/**
 * Validators Unit Tests
 * =====================
 */

import type { Rect, PageDimensions, PolyglotNode, PolyglotDocument } from '../../../src/core/types';
import type { NormalizedRect } from '../../../src/core/coordinates/normalized-rect';
import { createNormalizedRect, createNormalizedRectUnsafe } from '../../../src/core/coordinates/normalized-rect';
import {
  validateNormalized,
  assertNormalizedValid,
  validateVLTRect,
  validateTableInvariants,
  assertTableInvariants,
  validateDocumentCoordinates,
  assertDocumentCoordinatesValid,
  validateColumnWidths,
  validateRowHeights,
} from '../../../src/core/coordinates/validators';

describe('Validators', () => {
  const pageDimensions: PageDimensions = {
    width: 960,
    height: 540,
    margin: { top: 36, right: 36, bottom: 36, left: 36 },
  };

  // ==========================================================================
  // NORMALIZED RECT VALIDATION
  // ==========================================================================

  describe('validateNormalized', () => {
    it('passes for valid rect in bounds', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes for rect at boundaries', () => {
      const rect = createNormalizedRect(0, 0, 1, 1);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(true);
    });

    it('fails for NaN nx', () => {
      const rect = createNormalizedRectUnsafe(NaN, 0.2, 0.3, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NAN_VALUE' && e.field === 'nx')).toBe(true);
    });

    it('fails for NaN ny', () => {
      const rect = createNormalizedRectUnsafe(0.1, NaN, 0.3, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NAN_VALUE' && e.field === 'ny')).toBe(true);
    });

    it('fails for Infinity values', () => {
      const rect = createNormalizedRectUnsafe(Infinity, 0.2, 0.3, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INFINITE_VALUE')).toBe(true);
    });

    it('fails for negative width', () => {
      const rect = createNormalizedRectUnsafe(0.1, 0.2, -0.3, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NEGATIVE_DIMENSION' && e.field === 'nw')).toBe(true);
    });

    it('fails for negative height', () => {
      const rect = createNormalizedRectUnsafe(0.1, 0.2, 0.3, -0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NEGATIVE_DIMENSION' && e.field === 'nh')).toBe(true);
    });

    it('fails for zero width', () => {
      const rect = createNormalizedRectUnsafe(0.1, 0.2, 0, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'ZERO_DIMENSION' && e.field === 'nw')).toBe(true);
    });

    it('warns for overflow right (default mode)', () => {
      const rect = createNormalizedRect(0.8, 0.2, 0.5, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(true); // Warnings don't invalidate
      expect(result.warnings.some(e => e.code === 'OVERFLOW_RIGHT')).toBe(true);
    });

    it('warns for overflow bottom', () => {
      const rect = createNormalizedRect(0.1, 0.8, 0.3, 0.5);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(e => e.code === 'OVERFLOW_BOTTOM')).toBe(true);
    });

    it('warns for negative X position', () => {
      const rect = createNormalizedRect(-0.1, 0.2, 0.3, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(e => e.code === 'UNDERFLOW_LEFT')).toBe(true);
    });

    it('warns for negative Y position', () => {
      const rect = createNormalizedRect(0.1, -0.2, 0.3, 0.4);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(e => e.code === 'UNDERFLOW_TOP')).toBe(true);
    });

    it('respects allowOverflow option', () => {
      const rect = createNormalizedRect(0.8, 0.8, 0.5, 0.5);
      const result = validateNormalized(rect, { allowOverflow: true });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('respects strictMode option (treats warnings as errors)', () => {
      const rect = createNormalizedRect(-0.1, 0.2, 0.3, 0.4);
      const result = validateNormalized(rect, { strictMode: true });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'UNDERFLOW_LEFT')).toBe(true);
    });

    it('respects tolerance option', () => {
      // Slightly outside bounds but within tolerance
      const rect = createNormalizedRect(0, 0, 1.0005, 1);
      const result = validateNormalized(rect, { tolerance: 0.001 });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('fails for unreasonably large dimensions', () => {
      const rect = createNormalizedRectUnsafe(0, 0, 100, 100);
      const result = validateNormalized(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'OUT_OF_BOUNDS')).toBe(true);
    });
  });

  describe('assertNormalizedValid', () => {
    it('does not throw for valid rect', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      expect(() => assertNormalizedValid(rect)).not.toThrow();
    });

    it('throws for invalid rect', () => {
      const rect = createNormalizedRectUnsafe(NaN, 0.2, 0.3, 0.4);
      expect(() => assertNormalizedValid(rect)).toThrow('Invalid normalized coordinates');
    });

    it('includes context in error message', () => {
      const rect = createNormalizedRectUnsafe(NaN, 0.2, 0.3, 0.4);
      expect(() => assertNormalizedValid(rect, 'table/cell[0]')).toThrow('[table/cell[0]]');
    });
  });

  // ==========================================================================
  // VLT RECT VALIDATION
  // ==========================================================================

  describe('validateVLTRect', () => {
    it('passes for valid VLT rect', () => {
      const rect: Rect = { x: 100, y: 200, width: 300, height: 150 };
      const result = validateVLTRect(rect);

      expect(result.valid).toBe(true);
    });

    it('fails for NaN values', () => {
      const rect: Rect = { x: NaN, y: 200, width: 300, height: 150 };
      const result = validateVLTRect(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NAN_VALUE')).toBe(true);
    });

    it('fails for zero width', () => {
      const rect: Rect = { x: 100, y: 200, width: 0, height: 150 };
      const result = validateVLTRect(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'ZERO_DIMENSION')).toBe(true);
    });

    it('fails for negative dimensions', () => {
      const rect: Rect = { x: 100, y: 200, width: -50, height: 150 };
      const result = validateVLTRect(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NEGATIVE_DIMENSION')).toBe(true);
    });

    it('fails for unreasonably large values', () => {
      const rect: Rect = { x: 1000000, y: 200, width: 300, height: 150 };
      const result = validateVLTRect(rect);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'OUT_OF_BOUNDS')).toBe(true);
    });
  });

  // ==========================================================================
  // TABLE INVARIANTS
  // ==========================================================================

  describe('validateTableInvariants', () => {
    function createTableNode(rows: Array<Array<{ x: number; y: number; width: number; height: number }>>): PolyglotNode {
      let tableWidth = 0;
      let tableHeight = 0;
      const minX = Math.min(...rows.flatMap(r => r.map(c => c.x)));
      const minY = Math.min(...rows.flatMap(r => r.map(c => c.y)));

      if (rows.length > 0 && rows[0].length > 0) {
        tableWidth = rows[0].reduce((sum, cell) => sum + cell.width, 0);
        tableHeight = rows.reduce((sum, row) => sum + row[0].height, 0);
      }

      return {
        id: 'table1',
        type: 'table',
        rect: { x: minX, y: minY, width: tableWidth, height: tableHeight },
        children: rows.map((rowCells, rowIndex) => ({
          id: `row${rowIndex}`,
          type: 'row' as const,
          rect: {
            x: rowCells[0]?.x || 0,
            y: rowCells[0]?.y || 0,
            width: rowCells.reduce((sum, c) => sum + c.width, 0),
            height: rowCells[0]?.height || 0,
          },
          children: rowCells.map((cell, cellIndex) => ({
            id: `cell${rowIndex}_${cellIndex}`,
            type: 'cell' as const,
            rect: { x: cell.x, y: cell.y, width: cell.width, height: cell.height },
          })),
        })),
      };
    }

    it('passes for valid table with adjacent cells', () => {
      const table = createTableNode([
        [
          { x: 36, y: 100, width: 444, height: 30 },
          { x: 480, y: 100, width: 444, height: 30 },
        ],
        [
          { x: 36, y: 130, width: 444, height: 30 },
          { x: 480, y: 130, width: 444, height: 30 },
        ],
      ]);

      const result = validateTableInvariants(table, pageDimensions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.rowCount).toBe(2);
      expect(result.details.cellCount).toBe(4);
    });

    it('fails when cells in row have different Y positions', () => {
      const table = createTableNode([
        [
          { x: 36, y: 100, width: 444, height: 30 },
          { x: 480, y: 150, width: 444, height: 30 }, // Different Y!
        ],
      ]);

      const result = validateTableInvariants(table, pageDimensions);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not horizontally aligned'))).toBe(true);
      expect(result.details.rowsHorizontallyAligned).toBe(false);
    });

    it('warns when cells have gaps', () => {
      const table = createTableNode([
        [
          { x: 36, y: 100, width: 400, height: 30 },
          { x: 500, y: 100, width: 400, height: 30 }, // Gap of 64px
        ],
      ]);

      const result = validateTableInvariants(table, pageDimensions);

      expect(result.warnings.some(e => e.includes('Gap'))).toBe(true);
      expect(result.details.cellsAdjacent).toBe(false);
    });

    it('warns when cell widths do not sum to table width', () => {
      const table = createTableNode([
        [
          { x: 36, y: 100, width: 300, height: 30 },
          { x: 336, y: 100, width: 300, height: 30 },
        ],
      ]);
      // Table width is 600, but we manually set it higher
      table.rect.width = 888;

      const result = validateTableInvariants(table, pageDimensions);

      expect(result.warnings.some(e => e.includes("don't match table width"))).toBe(true);
      expect(result.details.tableWidthMatch).toBe(false);
    });

    it('warns for empty table', () => {
      const table: PolyglotNode = {
        id: 'table1',
        type: 'table',
        rect: { x: 36, y: 100, width: 888, height: 60 },
        children: [],
      };

      const result = validateTableInvariants(table, pageDimensions);

      expect(result.valid).toBe(true); // Empty is valid, just warned
      expect(result.warnings.some(e => e.includes('no rows'))).toBe(true);
    });

    it('warns for inconsistent column counts', () => {
      const table = createTableNode([
        [
          { x: 36, y: 100, width: 444, height: 30 },
          { x: 480, y: 100, width: 444, height: 30 },
        ],
        [
          { x: 36, y: 130, width: 888, height: 30 }, // Only 1 cell in this row
        ],
      ]);

      const result = validateTableInvariants(table, pageDimensions);

      expect(result.warnings.some(e => e.includes('Inconsistent column counts'))).toBe(true);
    });
  });

  describe('assertTableInvariants', () => {
    it('does not throw for valid table', () => {
      const table: PolyglotNode = {
        id: 'table1',
        type: 'table',
        rect: { x: 36, y: 100, width: 888, height: 30 },
        children: [
          {
            id: 'row1',
            type: 'row',
            rect: { x: 36, y: 100, width: 888, height: 30 },
            children: [
              { id: 'cell1', type: 'cell', rect: { x: 36, y: 100, width: 444, height: 30 } },
              { id: 'cell2', type: 'cell', rect: { x: 480, y: 100, width: 444, height: 30 } },
            ],
          },
        ],
      };

      expect(() => assertTableInvariants(table, pageDimensions)).not.toThrow();
    });

    it('throws for invalid table', () => {
      const table: PolyglotNode = {
        id: 'table1',
        type: 'table',
        rect: { x: 36, y: 100, width: 888, height: 30 },
        children: [
          {
            id: 'row1',
            type: 'row',
            rect: { x: 36, y: 100, width: 888, height: 30 },
            children: [
              { id: 'cell1', type: 'cell', rect: { x: 36, y: 100, width: 444, height: 30 } },
              { id: 'cell2', type: 'cell', rect: { x: 480, y: 200, width: 444, height: 30 } }, // Wrong Y
            ],
          },
        ],
      };

      expect(() => assertTableInvariants(table, pageDimensions)).toThrow('Table invariant violations');
    });
  });

  // ==========================================================================
  // COLUMN/ROW VALIDATION
  // ==========================================================================

  describe('validateColumnWidths', () => {
    it('passes for valid column widths', () => {
      const widths = [4.625, 4.625];
      const result = validateColumnWidths(widths, 9.25);

      expect(result.valid).toBe(true);
      expect(result.actualSum).toBeCloseTo(9.25, 4);
    });

    it('fails for empty array', () => {
      const result = validateColumnWidths([], 10);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('fails for non-finite values', () => {
      const widths = [4.625, NaN];
      const result = validateColumnWidths(widths, 9.25);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not finite'))).toBe(true);
    });

    it('fails for non-positive values', () => {
      const widths = [4.625, 0];
      const result = validateColumnWidths(widths, 4.625);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not positive'))).toBe(true);
    });

    it('fails when sum differs from expected', () => {
      const widths = [4, 4];
      const result = validateColumnWidths(widths, 10, 0.01);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('differs from expected'))).toBe(true);
    });

    it('respects tolerance', () => {
      const widths = [4.6, 4.6];
      const result = validateColumnWidths(widths, 9.25, 0.05);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateRowHeights', () => {
    it('passes for valid row heights', () => {
      const heights = [0.3, 0.3, 0.3];
      const result = validateRowHeights(heights);

      expect(result.valid).toBe(true);
    });

    it('fails for non-finite values', () => {
      const heights = [0.3, Infinity];
      const result = validateRowHeights(heights);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not finite'))).toBe(true);
    });

    it('fails for heights below minimum', () => {
      const heights = [0.3, 0.001];
      const result = validateRowHeights(heights, 0.01);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('below minimum'))).toBe(true);
    });

    it('fails for heights above maximum', () => {
      const heights = [0.3, 2.0];
      const result = validateRowHeights(heights, 0.01, 1.0);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });
  });

  // ==========================================================================
  // DOCUMENT VALIDATION
  // ==========================================================================

  describe('validateDocumentCoordinates', () => {
    function createSimpleDocument(): PolyglotDocument {
      return {
        version: '1.0',
        targetFormat: 'pptx',
        metadata: {},
        defaultDimensions: pageDimensions,
        pages: [
          {
            index: 0,
            dimensions: pageDimensions,
            content: {
              id: 'doc1',
              type: 'document',
              rect: { x: 0, y: 0, width: 960, height: 540 },
              children: [
                {
                  id: 'text1',
                  type: 'text',
                  rect: { x: 36, y: 36, width: 888, height: 50 },
                },
              ],
            },
          },
        ],
        nodeMap: new Map(),
        buildTimestamp: Date.now(),
      };
    }

    it('passes for valid document', () => {
      const doc = createSimpleDocument();
      const result = validateDocumentCoordinates(doc);

      expect(result.valid).toBe(true);
      expect(result.totalErrors).toBe(0);
    });

    it('reports errors for invalid coordinates', () => {
      const doc = createSimpleDocument();
      doc.pages[0].content.children![0].rect.width = 0;

      const result = validateDocumentCoordinates(doc);

      expect(result.valid).toBe(false);
      expect(result.totalErrors).toBeGreaterThan(0);
    });

    it('counts nodes correctly', () => {
      const doc = createSimpleDocument();
      const result = validateDocumentCoordinates(doc);

      expect(result.totalNodes).toBe(2); // document + text
    });

    it('reports page-level results', () => {
      const doc = createSimpleDocument();
      const result = validateDocumentCoordinates(doc);

      expect(result.pageResults).toHaveLength(1);
      expect(result.pageResults[0].pageIndex).toBe(0);
      expect(result.pageResults[0].nodeCount).toBe(2);
    });
  });

  describe('assertDocumentCoordinatesValid', () => {
    it('does not throw for valid document', () => {
      const doc: PolyglotDocument = {
        version: '1.0',
        targetFormat: 'pptx',
        metadata: {},
        defaultDimensions: pageDimensions,
        pages: [
          {
            index: 0,
            dimensions: pageDimensions,
            content: {
              id: 'doc1',
              type: 'document',
              rect: { x: 0, y: 0, width: 960, height: 540 },
            },
          },
        ],
        nodeMap: new Map(),
        buildTimestamp: Date.now(),
      };

      expect(() => assertDocumentCoordinatesValid(doc)).not.toThrow();
    });

    it('throws for document with invalid coordinates', () => {
      const doc: PolyglotDocument = {
        version: '1.0',
        targetFormat: 'pptx',
        metadata: {},
        defaultDimensions: pageDimensions,
        pages: [
          {
            index: 0,
            dimensions: pageDimensions,
            content: {
              id: 'doc1',
              type: 'document',
              rect: { x: 0, y: 0, width: 0, height: 540 }, // Invalid width
            },
          },
        ],
        nodeMap: new Map(),
        buildTimestamp: Date.now(),
      };

      expect(() => assertDocumentCoordinatesValid(doc)).toThrow('Document coordinate validation failed');
    });
  });
});
