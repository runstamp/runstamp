/**
 * Property-Based Coordinate Tests
 * ================================
 * Tests mathematical properties that should ALWAYS hold for coordinate transformations.
 * These tests use randomized inputs to catch edge cases.
 */

import {
  createNormalizedRect,
  vltToNormalized,
  normalizedToPPTXInches,
  normalizedToDOCXTwips,
  vltToPPTXInches,
  vltToDOCXTwips,
  pxToNormalizedWidth,
  pxToNormalizedHeight,
  normalizedWidthToInches,
  normalizedHeightToInches,
} from '../../../src/core/coordinates/index';
import type { Rect, PageDimensions } from '../../../src/core/types';

describe('Coordinate Property-Based Tests', () => {
  // Generators for random test data
  function randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  function randomRect(maxWidth: number, maxHeight: number): Rect {
    const x = randomInRange(0, maxWidth * 0.8);
    const y = randomInRange(0, maxHeight * 0.8);
    const width = randomInRange(10, maxWidth - x);
    const height = randomInRange(10, maxHeight - y);
    return { x, y, width, height };
  }

  function randomPageDimensions(): PageDimensions {
    const width = randomInRange(400, 2000);
    const height = randomInRange(300, 1500);
    const marginH = randomInRange(0, width * 0.1);
    const marginV = randomInRange(0, height * 0.1);
    return {
      width,
      height,
      margin: { top: marginV, right: marginH, bottom: marginV, left: marginH },
    };
  }

  // ===========================================================================
  // NORMALIZATION PROPERTIES
  // ===========================================================================

  describe('normalization properties', () => {
    it('normalized values are always in [0, 1] for valid input', () => {
      for (let i = 0; i < 100; i++) {
        const page = randomPageDimensions();
        const rect = randomRect(page.width, page.height);

        const normalized = vltToNormalized(rect, page);

        expect(normalized.nx).toBeGreaterThanOrEqual(0);
        expect(normalized.ny).toBeGreaterThanOrEqual(0);
        expect(normalized.nw).toBeGreaterThanOrEqual(0);
        expect(normalized.nh).toBeGreaterThanOrEqual(0);
        // Position + size should be <= 1 for valid rects
        expect(normalized.nx + normalized.nw).toBeLessThanOrEqual(1.01); // Small tolerance
        expect(normalized.ny + normalized.nh).toBeLessThanOrEqual(1.01);
      }
    });

    it('full page rect normalizes to (0, 0, 1, 1)', () => {
      for (let i = 0; i < 20; i++) {
        const page = randomPageDimensions();
        const fullRect: Rect = { x: 0, y: 0, width: page.width, height: page.height };

        const normalized = vltToNormalized(fullRect, page);

        expect(normalized.nx).toBeCloseTo(0, 10);
        expect(normalized.ny).toBeCloseTo(0, 10);
        expect(normalized.nw).toBeCloseTo(1, 10);
        expect(normalized.nh).toBeCloseTo(1, 10);
      }
    });

    it('zero-positioned rect normalizes to nx=0, ny=0', () => {
      for (let i = 0; i < 20; i++) {
        const page = randomPageDimensions();
        const rect: Rect = { x: 0, y: 0, width: 100, height: 50 };

        const normalized = vltToNormalized(rect, page);

        expect(normalized.nx).toBe(0);
        expect(normalized.ny).toBe(0);
      }
    });
  });

  // ===========================================================================
  // TRANSFORMATION LINEARITY
  // ===========================================================================

  describe('transformation linearity', () => {
    it('doubling input width doubles normalized width', () => {
      for (let i = 0; i < 50; i++) {
        const page = randomPageDimensions();
        const width1 = randomInRange(10, page.width / 3);
        const width2 = width1 * 2;

        const norm1 = pxToNormalizedWidth(width1, page.width);
        const norm2 = pxToNormalizedWidth(width2, page.width);

        expect(norm2).toBeCloseTo(norm1 * 2, 10);
      }
    });

    it('doubling normalized width doubles inch width', () => {
      const slideWidth = 10;
      for (let i = 0; i < 50; i++) {
        const norm1 = randomInRange(0.05, 0.4);
        const norm2 = norm1 * 2;

        const inches1 = normalizedWidthToInches(norm1, slideWidth);
        const inches2 = normalizedWidthToInches(norm2, slideWidth);

        expect(inches2).toBeCloseTo(inches1 * 2, 10);
      }
    });

    it('transformation is additive: a + b transforms same as transform(a) + transform(b)', () => {
      const page = randomPageDimensions();
      const slideWidth = 10;

      for (let i = 0; i < 50; i++) {
        const px1 = randomInRange(0, page.width / 3);
        const px2 = randomInRange(0, page.width / 3);
        const pxSum = px1 + px2;

        const norm1 = pxToNormalizedWidth(px1, page.width);
        const norm2 = pxToNormalizedWidth(px2, page.width);
        const normSum = pxToNormalizedWidth(pxSum, page.width);

        expect(normSum).toBeCloseTo(norm1 + norm2, 10);

        const inches1 = normalizedWidthToInches(norm1, slideWidth);
        const inches2 = normalizedWidthToInches(norm2, slideWidth);
        const inchesSum = normalizedWidthToInches(normSum, slideWidth);

        expect(inchesSum).toBeCloseTo(inches1 + inches2, 10);
      }
    });
  });

  // ===========================================================================
  // ROUND-TRIP CONSISTENCY
  // ===========================================================================

  describe('round-trip consistency', () => {
    it('normalize then scale preserves proportions', () => {
      const page: PageDimensions = { width: 960, height: 540, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
      const slideWidth = 10;
      const slideHeight = 5.625;

      for (let i = 0; i < 50; i++) {
        const rect = randomRect(page.width, page.height);
        const normalized = vltToNormalized(rect, page);
        const inches = normalizedToPPTXInches(normalized, slideWidth, slideHeight);

        // Width ratio should be preserved
        const originalRatio = rect.width / rect.height;
        const inchRatio = inches.w / inches.h;

        // Account for aspect ratio change between page and slide
        const pageAspect = page.width / page.height;
        const slideAspect = slideWidth / slideHeight;
        const expectedRatio = originalRatio * (slideAspect / pageAspect);

        expect(inchRatio).toBeCloseTo(expectedRatio, 5);
      }
    });

    it('direct transformation equals pipeline transformation', () => {
      for (let i = 0; i < 50; i++) {
        const page = randomPageDimensions();
        const rect = randomRect(page.width, page.height);
        const slideWidth = randomInRange(8, 12);
        const slideHeight = randomInRange(4, 8);

        // Pipeline: vlt -> normalized -> inches
        const normalized = vltToNormalized(rect, page);
        const inches1 = normalizedToPPTXInches(normalized, slideWidth, slideHeight);

        // Direct: vlt -> inches
        const inches2 = vltToPPTXInches(rect, page, slideWidth, slideHeight);

        expect(inches1.x).toBeCloseTo(inches2.x, 10);
        expect(inches1.y).toBeCloseTo(inches2.y, 10);
        expect(inches1.w).toBeCloseTo(inches2.w, 10);
        expect(inches1.h).toBeCloseTo(inches2.h, 10);
      }
    });
  });

  // ===========================================================================
  // SCALE INVARIANCE
  // ===========================================================================

  describe('scale invariance', () => {
    it('scaling page and rect equally produces same normalized values', () => {
      for (let i = 0; i < 50; i++) {
        const page1: PageDimensions = {
          width: 960,
          height: 540,
          margin: { top: 36, right: 36, bottom: 36, left: 36 },
        };
        const rect1: Rect = { x: 100, y: 50, width: 200, height: 100 };

        // Scale everything by 2
        const scale = 2;
        const page2: PageDimensions = {
          width: page1.width * scale,
          height: page1.height * scale,
          margin: {
            top: page1.margin.top * scale,
            right: page1.margin.right * scale,
            bottom: page1.margin.bottom * scale,
            left: page1.margin.left * scale,
          },
        };
        const rect2: Rect = {
          x: rect1.x * scale,
          y: rect1.y * scale,
          width: rect1.width * scale,
          height: rect1.height * scale,
        };

        const norm1 = vltToNormalized(rect1, page1);
        const norm2 = vltToNormalized(rect2, page2);

        expect(norm1.nx).toBeCloseTo(norm2.nx, 10);
        expect(norm1.ny).toBeCloseTo(norm2.ny, 10);
        expect(norm1.nw).toBeCloseTo(norm2.nw, 10);
        expect(norm1.nh).toBeCloseTo(norm2.nh, 10);
      }
    });
  });

  // ===========================================================================
  // ORDER PRESERVATION
  // ===========================================================================

  describe('order preservation', () => {
    it('larger pixel width produces larger normalized width', () => {
      const page = randomPageDimensions();

      for (let i = 0; i < 50; i++) {
        const w1 = randomInRange(10, page.width / 2);
        const w2 = w1 + randomInRange(10, page.width / 4);

        const norm1 = pxToNormalizedWidth(w1, page.width);
        const norm2 = pxToNormalizedWidth(w2, page.width);

        expect(norm2).toBeGreaterThan(norm1);
      }
    });

    it('larger normalized width produces larger inch width', () => {
      const slideWidth = 10;

      for (let i = 0; i < 50; i++) {
        const n1 = randomInRange(0.1, 0.4);
        const n2 = n1 + randomInRange(0.1, 0.5);

        const inches1 = normalizedWidthToInches(n1, slideWidth);
        const inches2 = normalizedWidthToInches(n2, slideWidth);

        expect(inches2).toBeGreaterThan(inches1);
      }
    });

    it('element to the right has larger x position after transformation', () => {
      const page: PageDimensions = { width: 960, height: 540, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
      const slideWidth = 10;
      const slideHeight = 5.625;

      for (let i = 0; i < 50; i++) {
        const x1 = randomInRange(0, 400);
        const x2 = x1 + randomInRange(50, 300);

        const rect1: Rect = { x: x1, y: 100, width: 100, height: 50 };
        const rect2: Rect = { x: x2, y: 100, width: 100, height: 50 };

        const inches1 = vltToPPTXInches(rect1, page, slideWidth, slideHeight);
        const inches2 = vltToPPTXInches(rect2, page, slideWidth, slideHeight);

        expect(inches2.x).toBeGreaterThan(inches1.x);
      }
    });
  });

  // ===========================================================================
  // DOCX VS PPTX CONSISTENCY
  // ===========================================================================

  describe('cross-format consistency', () => {
    it('normalized values are format-agnostic', () => {
      for (let i = 0; i < 50; i++) {
        const page = randomPageDimensions();
        const rect = randomRect(page.width, page.height);

        const normalized = vltToNormalized(rect, page);

        // Same normalized values should be used for both formats
        // PPTX uses inches directly (10" x 5.625")
        // DOCX uses inches too (8.5" x 11" for Letter)
        const pptxInches = normalizedToPPTXInches(normalized, 10, 5.625);
        const docxTwips = normalizedToDOCXTwips(normalized, 8.5, 11); // Letter size in inches

        // Verify both use the same normalized source
        expect(pptxInches.x / 10).toBeCloseTo(normalized.nx, 10);
        // DOCX returns twips, so we need to convert back: twips / (pageWidthInches * 1440)
        expect(docxTwips.x / (8.5 * 1440)).toBeCloseTo(normalized.nx, 3); // Less precision due to rounding
      }
    });
  });

  // ===========================================================================
  // EDGE VALUES
  // ===========================================================================

  describe('edge values', () => {
    it('handles zero dimensions gracefully', () => {
      const page: PageDimensions = { width: 960, height: 540, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
      const zeroWidthRect: Rect = { x: 100, y: 100, width: 0, height: 50 };
      const zeroHeightRect: Rect = { x: 100, y: 100, width: 50, height: 0 };

      const norm1 = vltToNormalized(zeroWidthRect, page);
      const norm2 = vltToNormalized(zeroHeightRect, page);

      expect(norm1.nw).toBe(0);
      expect(norm2.nh).toBe(0);
      expect(Number.isFinite(norm1.nx)).toBe(true);
      expect(Number.isFinite(norm2.ny)).toBe(true);
    });

    it('handles very small dimensions', () => {
      const page: PageDimensions = { width: 960, height: 540, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
      const tinyRect: Rect = { x: 100, y: 100, width: 0.001, height: 0.001 };

      const normalized = vltToNormalized(tinyRect, page);

      expect(Number.isFinite(normalized.nx)).toBe(true);
      expect(Number.isFinite(normalized.ny)).toBe(true);
      expect(Number.isFinite(normalized.nw)).toBe(true);
      expect(Number.isFinite(normalized.nh)).toBe(true);
      expect(normalized.nw).toBeGreaterThan(0);
      expect(normalized.nh).toBeGreaterThan(0);
    });

    it('handles positions at page boundaries', () => {
      const page: PageDimensions = { width: 960, height: 540, margin: { top: 0, right: 0, bottom: 0, left: 0 } };

      const topLeft: Rect = { x: 0, y: 0, width: 100, height: 50 };
      const bottomRight: Rect = { x: 860, y: 490, width: 100, height: 50 };

      const normTL = vltToNormalized(topLeft, page);
      const normBR = vltToNormalized(bottomRight, page);

      expect(normTL.nx).toBe(0);
      expect(normTL.ny).toBe(0);
      expect(normBR.nx + normBR.nw).toBeCloseTo(1, 10);
      expect(normBR.ny + normBR.nh).toBeCloseTo(1, 10);
    });
  });

  // ===========================================================================
  // TWIPS CONSISTENCY
  // ===========================================================================

  describe('twips calculations', () => {
    // Note: normalizedToDOCXTwips takes page dimensions in INCHES, not twips
    // Letter size is 8.5" x 11", which is 12240 x 15840 twips
    const LETTER_WIDTH_INCHES = 8.5;
    const LETTER_HEIGHT_INCHES = 11;
    const TWIPS_PER_INCH = 1440;

    it('twips values are always integers', () => {
      for (let i = 0; i < 50; i++) {
        const page = randomPageDimensions();
        const rect = randomRect(page.width, page.height);

        const twips = vltToDOCXTwips(rect, page, LETTER_WIDTH_INCHES, LETTER_HEIGHT_INCHES);

        expect(Number.isInteger(twips.x)).toBe(true);
        expect(Number.isInteger(twips.y)).toBe(true);
        expect(Number.isInteger(twips.w)).toBe(true);
        expect(Number.isInteger(twips.h)).toBe(true);
      }
    });

    it('twips preserve proportions (within rounding)', () => {
      const page: PageDimensions = { width: 960, height: 540, margin: { top: 0, right: 0, bottom: 0, left: 0 } };

      for (let i = 0; i < 50; i++) {
        const rect = randomRect(page.width, page.height);
        const normalized = vltToNormalized(rect, page);
        const twips = normalizedToDOCXTwips(normalized, LETTER_WIDTH_INCHES, LETTER_HEIGHT_INCHES);

        // Convert twips back to normalized: twips / (inches * TWIPS_PER_INCH)
        const totalWidthTwips = LETTER_WIDTH_INCHES * TWIPS_PER_INCH;
        const totalHeightTwips = LETTER_HEIGHT_INCHES * TWIPS_PER_INCH;

        // Check proportions are preserved (within rounding tolerance)
        expect(twips.x / totalWidthTwips).toBeCloseTo(normalized.nx, 3);
        expect(twips.y / totalHeightTwips).toBeCloseTo(normalized.ny, 3);
        expect(twips.w / totalWidthTwips).toBeCloseTo(normalized.nw, 3);
        expect(twips.h / totalHeightTwips).toBeCloseTo(normalized.nh, 3);
      }
    });
  });
});
