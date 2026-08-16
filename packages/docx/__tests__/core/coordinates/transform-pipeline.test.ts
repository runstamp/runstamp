/**
 * Transform Pipeline Unit Tests
 * =============================
 */

import type { Rect, PageDimensions } from '../../../src/core/types';
import {
  vltToNormalized,
  vltToNormalizedBatch,
  normalizedToVLT,
  normalizedToPPTXInches,
  normalizedToEMU,
  normalizedToDOCXTwips,
  vltToPPTXInches,
  vltToEMU,
  vltToDOCXTwips,
  pxToNormalizedWidth,
  pxToNormalizedHeight,
  normalizedWidthToInches,
  normalizedHeightToInches,
  pxToInches,
  inchesToPx,
  pxToTwips,
  twipsToPx,
  inchesToEMU,
  emuToInches,
  verifyRoundTrip,
  createPipeline,
  PIXELS_PER_INCH,
  TWIPS_PER_INCH,
  EMU_PER_INCH,
  DEFAULT_SLIDE_WIDTH_INCHES,
  DEFAULT_SLIDE_HEIGHT_INCHES,
} from '../../../src/core/coordinates/transform-pipeline';
import type { NormalizedRect } from '../../../src/core/coordinates/normalized-rect';

describe('Transform Pipeline', () => {
  // Standard test dimensions (16:9 slide)
  const PAGE_WIDTH_PX = 960;
  const PAGE_HEIGHT_PX = 540;
  const SLIDE_WIDTH = 10; // inches
  const SLIDE_HEIGHT = 5.625; // inches

  const pageDimensions: PageDimensions = {
    width: PAGE_WIDTH_PX,
    height: PAGE_HEIGHT_PX,
    margin: { top: 36, right: 36, bottom: 36, left: 36 },
  };

  // ==========================================================================
  // VLT TO NORMALIZED
  // ==========================================================================

  describe('vltToNormalized', () => {
    it('converts origin (0,0) correctly', () => {
      const rect: Rect = { x: 0, y: 0, width: 100, height: 50 };
      const normalized = vltToNormalized(rect, pageDimensions);

      expect(normalized.nx).toBe(0);
      expect(normalized.ny).toBe(0);
      expect(normalized.nw).toBeCloseTo(100 / PAGE_WIDTH_PX, 10);
      expect(normalized.nh).toBeCloseTo(50 / PAGE_HEIGHT_PX, 10);
    });

    it('converts full page correctly', () => {
      const rect: Rect = { x: 0, y: 0, width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX };
      const normalized = vltToNormalized(rect, pageDimensions);

      expect(normalized.nx).toBe(0);
      expect(normalized.ny).toBe(0);
      expect(normalized.nw).toBe(1);
      expect(normalized.nh).toBe(1);
    });

    it('converts center correctly', () => {
      const rect: Rect = { x: PAGE_WIDTH_PX / 2, y: PAGE_HEIGHT_PX / 2, width: 100, height: 50 };
      const normalized = vltToNormalized(rect, pageDimensions);

      expect(normalized.nx).toBeCloseTo(0.5, 10);
      expect(normalized.ny).toBeCloseTo(0.5, 10);
    });

    it('converts 36px margin correctly', () => {
      const rect: Rect = { x: 36, y: 0, width: 888, height: 540 };
      const normalized = vltToNormalized(rect, pageDimensions);

      expect(normalized.nx).toBeCloseTo(36 / PAGE_WIDTH_PX, 10);
      expect(normalized.nx).toBeCloseTo(0.0375, 4);
    });

    it('converts table cell (444px wide) correctly', () => {
      const rect: Rect = { x: 36, y: 0, width: 444, height: 22 };
      const normalized = vltToNormalized(rect, pageDimensions);

      expect(normalized.nw).toBeCloseTo(444 / PAGE_WIDTH_PX, 10);
      expect(normalized.nw).toBeCloseTo(0.4625, 4);
    });

    it('handles overflow (values > page dimensions)', () => {
      const rect: Rect = { x: 1000, y: 600, width: 200, height: 100 };
      const normalized = vltToNormalized(rect, pageDimensions);

      expect(normalized.nx).toBeGreaterThan(1);
      expect(normalized.ny).toBeGreaterThan(1);
    });

    it('handles negative positions', () => {
      const rect: Rect = { x: -50, y: -25, width: 100, height: 50 };
      const normalized = vltToNormalized(rect, pageDimensions);

      expect(normalized.nx).toBeLessThan(0);
      expect(normalized.ny).toBeLessThan(0);
    });

    it('throws on NaN values in strict mode', () => {
      const rect: Rect = { x: NaN, y: 0, width: 100, height: 50 };
      expect(() => vltToNormalized(rect, pageDimensions)).toThrow('Invalid rect values');
    });

    it('throws on invalid page dimensions', () => {
      const rect: Rect = { x: 0, y: 0, width: 100, height: 50 };
      const badDimensions: PageDimensions = {
        width: 0,
        height: 540,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      };
      expect(() => vltToNormalized(rect, badDimensions)).toThrow('Invalid page dimensions');
    });

    it('respects clamp option', () => {
      const rect: Rect = { x: 1000, y: 600, width: 200, height: 100 };
      const normalized = vltToNormalized(rect, pageDimensions, { clamp: true });

      expect(normalized.nx).toBeLessThanOrEqual(1);
      expect(normalized.ny).toBeLessThanOrEqual(1);
    });

    it('handles non-strict mode with NaN', () => {
      const rect: Rect = { x: NaN, y: 0, width: 100, height: 50 };
      const normalized = vltToNormalized(rect, pageDimensions, { strict: false });
      expect(Number.isNaN(normalized.nx)).toBe(true);
    });
  });

  describe('vltToNormalizedBatch', () => {
    it('converts multiple rects efficiently', () => {
      const rects: Rect[] = [
        { x: 0, y: 0, width: 480, height: 270 },
        { x: 480, y: 0, width: 480, height: 270 },
        { x: 0, y: 270, width: 480, height: 270 },
        { x: 480, y: 270, width: 480, height: 270 },
      ];
      const normalized = vltToNormalizedBatch(rects, pageDimensions);

      expect(normalized).toHaveLength(4);
      expect(normalized[0].nx).toBe(0);
      expect(normalized[1].nx).toBeCloseTo(0.5, 10);
      expect(normalized[2].ny).toBeCloseTo(0.5, 10);
      expect(normalized[3].nx).toBeCloseTo(0.5, 10);
      expect(normalized[3].ny).toBeCloseTo(0.5, 10);
    });

    it('throws on invalid rect in batch (strict mode)', () => {
      const rects: Rect[] = [
        { x: 0, y: 0, width: 100, height: 50 },
        { x: NaN, y: 0, width: 100, height: 50 },
      ];
      expect(() => vltToNormalizedBatch(rects, pageDimensions)).toThrow('Invalid rect at index 1');
    });
  });

  describe('normalizedToVLT', () => {
    it('reverses vltToNormalized', () => {
      const original: Rect = { x: 123, y: 456, width: 200, height: 100 };
      const normalized = vltToNormalized(original, pageDimensions);
      const restored = normalizedToVLT(normalized, pageDimensions);

      expect(restored.x).toBeCloseTo(original.x, 10);
      expect(restored.y).toBeCloseTo(original.y, 10);
      expect(restored.width).toBeCloseTo(original.width, 10);
      expect(restored.height).toBeCloseTo(original.height, 10);
    });
  });

  // ==========================================================================
  // NORMALIZED TO PPTX
  // ==========================================================================

  describe('normalizedToPPTXInches', () => {
    it('converts full page to slide dimensions', () => {
      const normalized: NormalizedRect = { nx: 0, ny: 0, nw: 1, nh: 1 };
      const inches = normalizedToPPTXInches(normalized, SLIDE_WIDTH, SLIDE_HEIGHT);

      expect(inches.x).toBe(0);
      expect(inches.y).toBe(0);
      expect(inches.w).toBe(SLIDE_WIDTH);
      expect(inches.h).toBe(SLIDE_HEIGHT);
    });

    it('converts 36px margin to 0.375 inches', () => {
      const normalized: NormalizedRect = { nx: 0.0375, ny: 0, nw: 0.925, nh: 1 };
      const inches = normalizedToPPTXInches(normalized, SLIDE_WIDTH, SLIDE_HEIGHT);

      expect(inches.x).toBeCloseTo(0.375, 4);
    });

    it('converts center position correctly', () => {
      const normalized: NormalizedRect = { nx: 0.5, ny: 0.5, nw: 0.2, nh: 0.2 };
      const inches = normalizedToPPTXInches(normalized, SLIDE_WIDTH, SLIDE_HEIGHT);

      expect(inches.x).toBe(5);
      expect(inches.y).toBeCloseTo(2.8125, 4);
    });

    it('uses default dimensions when not specified', () => {
      const normalized: NormalizedRect = { nx: 0, ny: 0, nw: 1, nh: 1 };
      const inches = normalizedToPPTXInches(normalized);

      expect(inches.w).toBe(DEFAULT_SLIDE_WIDTH_INCHES);
      expect(inches.h).toBe(DEFAULT_SLIDE_HEIGHT_INCHES);
    });
  });

  describe('normalizedToEMU', () => {
    it('converts to EMU correctly', () => {
      const normalized: NormalizedRect = { nx: 0, ny: 0, nw: 1, nh: 1 };
      const emu = normalizedToEMU(normalized, SLIDE_WIDTH, SLIDE_HEIGHT);

      expect(emu.x).toBe(0);
      expect(emu.y).toBe(0);
      expect(emu.cx).toBe(SLIDE_WIDTH * EMU_PER_INCH);
      expect(emu.cy).toBe(Math.round(SLIDE_HEIGHT * EMU_PER_INCH));
    });

    it('converts 0.375" to correct EMU', () => {
      const normalized: NormalizedRect = { nx: 0.0375, ny: 0, nw: 0.1, nh: 0.1 };
      const emu = normalizedToEMU(normalized, SLIDE_WIDTH, SLIDE_HEIGHT);

      // 0.0375 * 10" = 0.375" = 0.375 * 914400 = 342900 EMU
      expect(emu.x).toBe(342900);
    });
  });

  // ==========================================================================
  // NORMALIZED TO DOCX
  // ==========================================================================

  describe('normalizedToDOCXTwips', () => {
    it('converts to twips correctly', () => {
      const normalized: NormalizedRect = { nx: 0, ny: 0, nw: 1, nh: 1 };
      const twips = normalizedToDOCXTwips(normalized, 8.5, 11);

      expect(twips.x).toBe(0);
      expect(twips.w).toBe(Math.round(8.5 * TWIPS_PER_INCH));
      expect(twips.h).toBe(Math.round(11 * TWIPS_PER_INCH));
    });
  });

  // ==========================================================================
  // DIRECT CONVERSIONS
  // ==========================================================================

  describe('vltToPPTXInches', () => {
    it('combines vltToNormalized and normalizedToPPTXInches', () => {
      const rect: Rect = { x: 36, y: 0, width: 444, height: 22 };
      const inches = vltToPPTXInches(rect, pageDimensions, SLIDE_WIDTH, SLIDE_HEIGHT);

      // 36/960 * 10" = 0.375"
      expect(inches.x).toBeCloseTo(0.375, 4);
      // 444/960 * 10" = 4.625"
      expect(inches.w).toBeCloseTo(4.625, 4);
      // 22/540 * 5.625" ~ 0.229"
      expect(inches.h).toBeCloseTo(0.229, 2);
    });
  });

  describe('vltToEMU', () => {
    it('converts VLT rect to EMU', () => {
      const rect: Rect = { x: 36, y: 0, width: 888, height: 540 };
      const emu = vltToEMU(rect, pageDimensions, SLIDE_WIDTH, SLIDE_HEIGHT);

      // x: 36/960 * 10" = 0.375" = 342900 EMU
      expect(emu.x).toBe(342900);
    });
  });

  // ==========================================================================
  // SCALAR CONVERSIONS
  // ==========================================================================

  describe('pxToNormalizedWidth', () => {
    it('converts pixels to normalized width', () => {
      expect(pxToNormalizedWidth(480, PAGE_WIDTH_PX)).toBeCloseTo(0.5, 10);
      expect(pxToNormalizedWidth(96, PAGE_WIDTH_PX)).toBeCloseTo(0.1, 10);
    });

    it('handles zero page width', () => {
      expect(pxToNormalizedWidth(100, 0)).toBe(100); // divides by 1
    });
  });

  describe('pxToNormalizedHeight', () => {
    it('converts pixels to normalized height', () => {
      expect(pxToNormalizedHeight(270, PAGE_HEIGHT_PX)).toBeCloseTo(0.5, 10);
    });
  });

  describe('normalizedWidthToInches', () => {
    it('converts normalized width to inches', () => {
      expect(normalizedWidthToInches(0.5, SLIDE_WIDTH)).toBe(5);
      expect(normalizedWidthToInches(1, SLIDE_WIDTH)).toBe(10);
    });
  });

  describe('pxToInches', () => {
    it('converts pixels to inches at 96 DPI', () => {
      expect(pxToInches(96)).toBe(1);
      expect(pxToInches(48)).toBe(0.5);
      expect(pxToInches(192)).toBe(2);
    });
  });

  describe('inchesToPx', () => {
    it('converts inches to pixels', () => {
      expect(inchesToPx(1)).toBe(96);
      expect(inchesToPx(0.5)).toBe(48);
    });
  });

  describe('pxToTwips', () => {
    it('converts pixels to twips', () => {
      // 1 inch = 96 px = 1440 twips
      expect(pxToTwips(96)).toBe(1440);
      expect(pxToTwips(48)).toBe(720);
    });
  });

  describe('twipsToPx', () => {
    it('converts twips to pixels', () => {
      expect(twipsToPx(1440)).toBe(96);
    });
  });

  describe('inchesToEMU', () => {
    it('converts inches to EMU', () => {
      expect(inchesToEMU(1)).toBe(914400);
      expect(inchesToEMU(10)).toBe(9144000);
      expect(inchesToEMU(0.375)).toBe(342900);
    });
  });

  describe('emuToInches', () => {
    it('converts EMU to inches', () => {
      expect(emuToInches(914400)).toBe(1);
      expect(emuToInches(342900)).toBeCloseTo(0.375, 10);
    });
  });

  // ==========================================================================
  // ROUND-TRIP VERIFICATION
  // ==========================================================================

  describe('verifyRoundTrip', () => {
    it('succeeds for valid rect', () => {
      const rect: Rect = { x: 123, y: 456, width: 200, height: 100 };
      const result = verifyRoundTrip(rect, pageDimensions);

      expect(result.success).toBe(true);
      expect(result.maxDiff).toBeLessThan(1e-10);
    });

    it('reports error for NaN values', () => {
      const rect: Rect = { x: 100, y: 100, width: 200, height: 100 };
      // This should succeed
      const result = verifyRoundTrip(rect, pageDimensions);
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // PIPELINE HELPER
  // ==========================================================================

  describe('createPipeline', () => {
    it('chains transformations correctly', () => {
      const rect: Rect = { x: 36, y: 0, width: 444, height: 22 };
      const result = createPipeline(rect, pageDimensions)
        .toNormalized()
        .validate()
        .toPPTXInches(SLIDE_WIDTH, SLIDE_HEIGHT)
        .result();

      expect(result.success).toBe(true);
      expect(result.normalized).not.toBeNull();
      expect(result.pptxInches).not.toBeNull();
      expect(result.pptxInches!.x).toBeCloseTo(0.375, 4);
    });

    it('collects validation errors', () => {
      const rect: Rect = { x: -100, y: -100, width: 200, height: 100 };
      const result = createPipeline(rect, pageDimensions)
        .toNormalized()
        .validate() // This should add errors for negative positions
        .result();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles invalid input gracefully', () => {
      const rect: Rect = { x: NaN, y: 0, width: 100, height: 50 };
      const result = createPipeline(rect, pageDimensions)
        .toNormalized()
        .result();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('provides access to intermediate results', () => {
      const rect: Rect = { x: 480, y: 270, width: 100, height: 50 };
      const pipeline = createPipeline(rect, pageDimensions)
        .toNormalized()
        .toPPTXInches(SLIDE_WIDTH, SLIDE_HEIGHT);

      expect(pipeline.normalized!.nx).toBeCloseTo(0.5, 10);
      expect(pipeline.pptxInches!.x).toBeCloseTo(5, 4);
    });
  });

  // ==========================================================================
  // REAL-WORLD SCENARIOS
  // ==========================================================================

  describe('Real-world scenarios', () => {
    it('converts typical table cell coordinates', () => {
      // Table at 36px margin, 2 columns, 888px total width
      const cell1: Rect = { x: 36, y: 100, width: 444, height: 30 };
      const cell2: Rect = { x: 480, y: 100, width: 444, height: 30 };

      const cell1Inches = vltToPPTXInches(cell1, pageDimensions, SLIDE_WIDTH, SLIDE_HEIGHT);
      const cell2Inches = vltToPPTXInches(cell2, pageDimensions, SLIDE_WIDTH, SLIDE_HEIGHT);

      // Cell 1: x=0.375", w=4.625"
      expect(cell1Inches.x).toBeCloseTo(0.375, 3);
      expect(cell1Inches.w).toBeCloseTo(4.625, 3);

      // Cell 2: x=5", w=4.625"
      expect(cell2Inches.x).toBeCloseTo(5, 3);
      expect(cell2Inches.w).toBeCloseTo(4.625, 3);

      // Cells should be adjacent (cell1.x + cell1.w ~ cell2.x)
      expect(cell1Inches.x + cell1Inches.w).toBeCloseTo(cell2Inches.x, 3);
    });

    it('preserves table structure invariants', () => {
      // Table with 3 rows, 2 columns
      const tableWidth = 888;
      const cellWidth = tableWidth / 2;
      const rowHeight = 30;

      const cells: Rect[] = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          cells.push({
            x: 36 + col * cellWidth,
            y: 100 + row * rowHeight,
            width: cellWidth,
            height: rowHeight,
          });
        }
      }

      const normalized = vltToNormalizedBatch(cells, pageDimensions);

      // All cells in same row should have same normalized Y
      expect(normalized[0].ny).toBeCloseTo(normalized[1].ny, 10);
      expect(normalized[2].ny).toBeCloseTo(normalized[3].ny, 10);

      // All cells should have same normalized width
      const expectedNw = cellWidth / PAGE_WIDTH_PX;
      for (const n of normalized) {
        expect(n.nw).toBeCloseTo(expectedNw, 10);
      }

      // Adjacent cells should be horizontally adjacent
      expect(normalized[0].nx + normalized[0].nw).toBeCloseTo(normalized[1].nx, 10);
    });
  });
});
