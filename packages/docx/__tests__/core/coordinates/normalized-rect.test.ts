/**
 * NormalizedRect Unit Tests
 * =========================
 */

import {
  createNormalizedRect,
  createFrozenNormalizedRect,
  createNormalizedRectUnsafe,
  getRight,
  getBottom,
  getCenterX,
  getCenterY,
  getArea,
  rectsOverlap,
  rectContains,
  rectContainsPoint,
  rectIntersection,
  boundingBox,
  rectsEqual,
  rectsHorizontallyAdjacent,
  rectsVerticallyAdjacent,
  scaleRect,
  translateRect,
  insetRect,
  expandRect,
  clampRect,
  toPlainObject,
  fromPlainObject,
  formatRect,
  formatRectAsPercent,
} from '../../../src/core/coordinates/normalized-rect';
import type { NormalizedRect } from '../../../src/core/coordinates/normalized-rect';

describe('NormalizedRect', () => {
  // ==========================================================================
  // FACTORY FUNCTIONS
  // ==========================================================================

  describe('createNormalizedRect', () => {
    it('creates a rect with valid values', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      expect(rect.nx).toBe(0.1);
      expect(rect.ny).toBe(0.2);
      expect(rect.nw).toBe(0.3);
      expect(rect.nh).toBe(0.4);
    });

    it('accepts zero values', () => {
      const rect = createNormalizedRect(0, 0, 0.5, 0.5);
      expect(rect.nx).toBe(0);
      expect(rect.ny).toBe(0);
    });

    it('accepts values at bounds', () => {
      const rect = createNormalizedRect(0, 0, 1, 1);
      expect(rect.nw).toBe(1);
      expect(rect.nh).toBe(1);
    });

    it('accepts negative positions (overflow left/top)', () => {
      const rect = createNormalizedRect(-0.1, -0.2, 0.5, 0.5);
      expect(rect.nx).toBe(-0.1);
      expect(rect.ny).toBe(-0.2);
    });

    it('throws on NaN nx', () => {
      expect(() => createNormalizedRect(NaN, 0, 0.5, 0.5)).toThrow('Invalid nx value');
    });

    it('throws on NaN ny', () => {
      expect(() => createNormalizedRect(0, NaN, 0.5, 0.5)).toThrow('Invalid ny value');
    });

    it('throws on NaN nw', () => {
      expect(() => createNormalizedRect(0, 0, NaN, 0.5)).toThrow('Invalid nw value');
    });

    it('throws on NaN nh', () => {
      expect(() => createNormalizedRect(0, 0, 0.5, NaN)).toThrow('Invalid nh value');
    });

    it('throws on Infinity', () => {
      expect(() => createNormalizedRect(Infinity, 0, 0.5, 0.5)).toThrow();
      expect(() => createNormalizedRect(0, Infinity, 0.5, 0.5)).toThrow();
      expect(() => createNormalizedRect(0, 0, Infinity, 0.5)).toThrow();
      expect(() => createNormalizedRect(0, 0, 0.5, Infinity)).toThrow();
    });

    it('throws on negative Infinity', () => {
      expect(() => createNormalizedRect(-Infinity, 0, 0.5, 0.5)).toThrow();
    });
  });

  describe('createFrozenNormalizedRect', () => {
    it('creates a frozen (immutable) rect', () => {
      const rect = createFrozenNormalizedRect(0.1, 0.2, 0.3, 0.4);
      expect(Object.isFrozen(rect)).toBe(true);
    });

    it('prevents modification', () => {
      const rect = createFrozenNormalizedRect(0.1, 0.2, 0.3, 0.4);
      expect(() => {
        (rect as any).nx = 0.5;
      }).toThrow();
    });
  });

  describe('createNormalizedRectUnsafe', () => {
    it('creates a rect without validation', () => {
      const rect = createNormalizedRectUnsafe(NaN, NaN, NaN, NaN);
      expect(Number.isNaN(rect.nx)).toBe(true);
    });
  });

  // ==========================================================================
  // GEOMETRIC OPERATIONS
  // ==========================================================================

  describe('getRight', () => {
    it('returns nx + nw', () => {
      const rect = createNormalizedRect(0.1, 0, 0.3, 0.5);
      expect(getRight(rect)).toBeCloseTo(0.4, 10);
    });

    it('handles edge case at boundary', () => {
      const rect = createNormalizedRect(0, 0, 1, 1);
      expect(getRight(rect)).toBe(1);
    });
  });

  describe('getBottom', () => {
    it('returns ny + nh', () => {
      const rect = createNormalizedRect(0, 0.2, 0.5, 0.3);
      expect(getBottom(rect)).toBeCloseTo(0.5, 10);
    });
  });

  describe('getCenterX', () => {
    it('returns center X coordinate', () => {
      const rect = createNormalizedRect(0.2, 0, 0.4, 0.5);
      expect(getCenterX(rect)).toBeCloseTo(0.4, 10);
    });
  });

  describe('getCenterY', () => {
    it('returns center Y coordinate', () => {
      const rect = createNormalizedRect(0, 0.1, 0.5, 0.6);
      expect(getCenterY(rect)).toBeCloseTo(0.4, 10);
    });
  });

  describe('getArea', () => {
    it('returns nw * nh', () => {
      const rect = createNormalizedRect(0, 0, 0.5, 0.4);
      expect(getArea(rect)).toBeCloseTo(0.2, 10);
    });

    it('returns 1 for full page', () => {
      const rect = createNormalizedRect(0, 0, 1, 1);
      expect(getArea(rect)).toBe(1);
    });
  });

  describe('rectsOverlap', () => {
    it('returns true for overlapping rects', () => {
      const a = createNormalizedRect(0, 0, 0.5, 0.5);
      const b = createNormalizedRect(0.4, 0.4, 0.5, 0.5);
      expect(rectsOverlap(a, b)).toBe(true);
    });

    it('returns false for non-overlapping rects', () => {
      const a = createNormalizedRect(0, 0, 0.3, 0.3);
      const b = createNormalizedRect(0.5, 0.5, 0.3, 0.3);
      expect(rectsOverlap(a, b)).toBe(false);
    });

    it('returns false for adjacent rects (touching edges)', () => {
      const a = createNormalizedRect(0, 0, 0.5, 0.5);
      const b = createNormalizedRect(0.5, 0, 0.5, 0.5);
      expect(rectsOverlap(a, b)).toBe(false);
    });

    it('returns true for identical rects', () => {
      const rect = createNormalizedRect(0.2, 0.2, 0.3, 0.3);
      expect(rectsOverlap(rect, rect)).toBe(true);
    });
  });

  describe('rectContains', () => {
    it('returns true when outer contains inner', () => {
      const outer = createNormalizedRect(0, 0, 1, 1);
      const inner = createNormalizedRect(0.2, 0.2, 0.3, 0.3);
      expect(rectContains(outer, inner)).toBe(true);
    });

    it('returns false when inner extends outside outer', () => {
      const outer = createNormalizedRect(0.2, 0.2, 0.5, 0.5);
      const inner = createNormalizedRect(0.1, 0.1, 0.3, 0.3);
      expect(rectContains(outer, inner)).toBe(false);
    });

    it('returns true for identical rects', () => {
      const rect = createNormalizedRect(0.2, 0.2, 0.3, 0.3);
      expect(rectContains(rect, rect)).toBe(true);
    });
  });

  describe('rectContainsPoint', () => {
    it('returns true for point inside rect', () => {
      const rect = createNormalizedRect(0.2, 0.2, 0.5, 0.5);
      expect(rectContainsPoint(rect, 0.4, 0.4)).toBe(true);
    });

    it('returns true for point on edge', () => {
      const rect = createNormalizedRect(0.2, 0.2, 0.5, 0.5);
      expect(rectContainsPoint(rect, 0.2, 0.2)).toBe(true);
      expect(rectContainsPoint(rect, 0.7, 0.7)).toBe(true);
    });

    it('returns false for point outside rect', () => {
      const rect = createNormalizedRect(0.2, 0.2, 0.5, 0.5);
      expect(rectContainsPoint(rect, 0.1, 0.1)).toBe(false);
      expect(rectContainsPoint(rect, 0.8, 0.8)).toBe(false);
    });
  });

  describe('rectIntersection', () => {
    it('returns intersection of overlapping rects', () => {
      const a = createNormalizedRect(0, 0, 0.5, 0.5);
      const b = createNormalizedRect(0.3, 0.3, 0.5, 0.5);
      const result = rectIntersection(a, b);

      expect(result).not.toBeNull();
      expect(result!.nx).toBeCloseTo(0.3, 10);
      expect(result!.ny).toBeCloseTo(0.3, 10);
      expect(result!.nw).toBeCloseTo(0.2, 10);
      expect(result!.nh).toBeCloseTo(0.2, 10);
    });

    it('returns null for non-overlapping rects', () => {
      const a = createNormalizedRect(0, 0, 0.3, 0.3);
      const b = createNormalizedRect(0.5, 0.5, 0.3, 0.3);
      expect(rectIntersection(a, b)).toBeNull();
    });
  });

  describe('boundingBox', () => {
    it('returns bounding box of multiple rects', () => {
      const rects = [
        createNormalizedRect(0.1, 0.1, 0.2, 0.2),
        createNormalizedRect(0.5, 0.5, 0.3, 0.3),
      ];
      const result = boundingBox(rects);

      expect(result).not.toBeNull();
      expect(result!.nx).toBeCloseTo(0.1, 10);
      expect(result!.ny).toBeCloseTo(0.1, 10);
      expect(result!.nw).toBeCloseTo(0.7, 10); // 0.8 - 0.1
      expect(result!.nh).toBeCloseTo(0.7, 10); // 0.8 - 0.1
    });

    it('returns null for empty array', () => {
      expect(boundingBox([])).toBeNull();
    });

    it('returns same rect for single element', () => {
      const rect = createNormalizedRect(0.2, 0.3, 0.4, 0.5);
      const result = boundingBox([rect]);

      expect(result!.nx).toBeCloseTo(rect.nx, 10);
      expect(result!.ny).toBeCloseTo(rect.ny, 10);
      expect(result!.nw).toBeCloseTo(rect.nw, 10);
      expect(result!.nh).toBeCloseTo(rect.nh, 10);
    });
  });

  // ==========================================================================
  // COMPARISON OPERATIONS
  // ==========================================================================

  describe('rectsEqual', () => {
    it('returns true for equal rects', () => {
      const a = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const b = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      expect(rectsEqual(a, b)).toBe(true);
    });

    it('returns false for different rects', () => {
      const a = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const b = createNormalizedRect(0.1, 0.2, 0.3, 0.5);
      expect(rectsEqual(a, b)).toBe(false);
    });

    it('respects tolerance', () => {
      const a = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const b = createNormalizedRect(0.1001, 0.2, 0.3, 0.4);
      expect(rectsEqual(a, b, 0.001)).toBe(true);
      expect(rectsEqual(a, b, 0.00001)).toBe(false);
    });
  });

  describe('rectsHorizontallyAdjacent', () => {
    it('returns true for adjacent horizontal rects', () => {
      const left = createNormalizedRect(0, 0, 0.5, 0.3);
      const right = createNormalizedRect(0.5, 0, 0.5, 0.3);
      expect(rectsHorizontallyAdjacent(left, right)).toBe(true);
    });

    it('returns false for different Y positions', () => {
      const left = createNormalizedRect(0, 0, 0.5, 0.3);
      const right = createNormalizedRect(0.5, 0.1, 0.5, 0.3);
      expect(rectsHorizontallyAdjacent(left, right)).toBe(false);
    });

    it('returns false for gap between rects', () => {
      const left = createNormalizedRect(0, 0, 0.4, 0.3);
      const right = createNormalizedRect(0.5, 0, 0.4, 0.3);
      expect(rectsHorizontallyAdjacent(left, right)).toBe(false);
    });

    it('returns false for different heights', () => {
      const left = createNormalizedRect(0, 0, 0.5, 0.3);
      const right = createNormalizedRect(0.5, 0, 0.5, 0.4);
      expect(rectsHorizontallyAdjacent(left, right)).toBe(false);
    });
  });

  describe('rectsVerticallyAdjacent', () => {
    it('returns true for adjacent vertical rects', () => {
      const top = createNormalizedRect(0, 0, 0.5, 0.3);
      const bottom = createNormalizedRect(0, 0.3, 0.5, 0.3);
      expect(rectsVerticallyAdjacent(top, bottom)).toBe(true);
    });

    it('returns false for different X positions', () => {
      const top = createNormalizedRect(0, 0, 0.5, 0.3);
      const bottom = createNormalizedRect(0.1, 0.3, 0.5, 0.3);
      expect(rectsVerticallyAdjacent(top, bottom)).toBe(false);
    });
  });

  // ==========================================================================
  // TRANSFORMATION OPERATIONS
  // ==========================================================================

  describe('scaleRect', () => {
    it('scales uniformly', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const scaled = scaleRect(rect, 2);

      expect(scaled.nx).toBeCloseTo(0.2, 10);
      expect(scaled.ny).toBeCloseTo(0.4, 10);
      expect(scaled.nw).toBeCloseTo(0.6, 10);
      expect(scaled.nh).toBeCloseTo(0.8, 10);
    });

    it('scales non-uniformly', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const scaled = scaleRect(rect, 2, 0.5);

      expect(scaled.nx).toBeCloseTo(0.2, 10);
      expect(scaled.ny).toBeCloseTo(0.1, 10);
      expect(scaled.nw).toBeCloseTo(0.6, 10);
      expect(scaled.nh).toBeCloseTo(0.2, 10);
    });
  });

  describe('translateRect', () => {
    it('translates by offset', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const translated = translateRect(rect, 0.1, -0.1);

      expect(translated.nx).toBeCloseTo(0.2, 10);
      expect(translated.ny).toBeCloseTo(0.1, 10);
      expect(translated.nw).toBe(rect.nw);
      expect(translated.nh).toBe(rect.nh);
    });
  });

  describe('insetRect', () => {
    it('shrinks rect by margin', () => {
      const rect = createNormalizedRect(0.1, 0.1, 0.5, 0.5);
      const inset = insetRect(rect, 0.05);

      expect(inset.nx).toBeCloseTo(0.15, 10);
      expect(inset.ny).toBeCloseTo(0.15, 10);
      expect(inset.nw).toBeCloseTo(0.4, 10);
      expect(inset.nh).toBeCloseTo(0.4, 10);
    });

    it('clamps to zero if margin exceeds half dimension', () => {
      const rect = createNormalizedRect(0, 0, 0.1, 0.1);
      const inset = insetRect(rect, 0.1);

      expect(inset.nw).toBe(0);
      expect(inset.nh).toBe(0);
    });
  });

  describe('expandRect', () => {
    it('expands rect by margin', () => {
      const rect = createNormalizedRect(0.2, 0.2, 0.3, 0.3);
      const expanded = expandRect(rect, 0.05);

      expect(expanded.nx).toBeCloseTo(0.15, 10);
      expect(expanded.ny).toBeCloseTo(0.15, 10);
      expect(expanded.nw).toBeCloseTo(0.4, 10);
      expect(expanded.nh).toBeCloseTo(0.4, 10);
    });
  });

  describe('clampRect', () => {
    it('clamps rect to [0, 1] bounds', () => {
      const rect = createNormalizedRectUnsafe(-0.1, -0.1, 1.5, 1.5);
      const clamped = clampRect(rect);

      expect(clamped.nx).toBe(0);
      expect(clamped.ny).toBe(0);
      expect(clamped.nw).toBe(1);
      expect(clamped.nh).toBe(1);
    });

    it('leaves valid rect unchanged', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const clamped = clampRect(rect);

      expect(clamped.nx).toBe(rect.nx);
      expect(clamped.ny).toBe(rect.ny);
      expect(clamped.nw).toBe(rect.nw);
      expect(clamped.nh).toBe(rect.nh);
    });
  });

  // ==========================================================================
  // SERIALIZATION
  // ==========================================================================

  describe('toPlainObject / fromPlainObject', () => {
    it('round-trips correctly', () => {
      const original = createNormalizedRect(0.1, 0.2, 0.3, 0.4);
      const plain = toPlainObject(original);
      const restored = fromPlainObject(plain);

      expect(restored.nx).toBe(original.nx);
      expect(restored.ny).toBe(original.ny);
      expect(restored.nw).toBe(original.nw);
      expect(restored.nh).toBe(original.nh);
    });
  });

  describe('formatRect', () => {
    it('formats with default precision', () => {
      const rect = createNormalizedRect(0.1234, 0.5678, 0.3333, 0.4444);
      const formatted = formatRect(rect);

      expect(formatted).toContain('0.1234');
      expect(formatted).toContain('0.5678');
      expect(formatted).toContain('NormalizedRect');
    });

    it('respects precision parameter', () => {
      const rect = createNormalizedRect(0.123456, 0.5, 0.3, 0.4);
      const formatted = formatRect(rect, 2);

      expect(formatted).toContain('0.12');
    });
  });

  describe('formatRectAsPercent', () => {
    it('formats as percentages', () => {
      const rect = createNormalizedRect(0.1, 0.2, 0.5, 0.3);
      const formatted = formatRectAsPercent(rect);

      expect(formatted).toContain('10.0%');
      expect(formatted).toContain('20.0%');
      expect(formatted).toContain('50.0%');
      expect(formatted).toContain('30.0%');
    });
  });
});
