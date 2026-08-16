/**
 * Text Measurer Edge Case Tests
 * ==============================
 * Comprehensive edge case validation for text measurement system.
 */

import { describe, it, expect } from 'vitest';
import { EstimatingTextMeasurer } from '../../src/core/text-measurer';
import type { TextStyle } from '../../src/core/text-measurer';

describe('Text Measurer Edge Cases', () => {
  const measurer = new EstimatingTextMeasurer();

  describe('Empty and whitespace-only text', () => {
    it('should handle empty string', () => {
      const result = measurer.measureText('', { fontSize: 16 }, 500);
      expect(result.width).toBe(0);
      expect(result.height).toBeGreaterThanOrEqual(0); // May be 0 or lineHeight depending on impl
      expect(result.lineCount).toBe(0);
    });

    it('should measure single space', () => {
      const result = measurer.measureText(' ', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should measure multiple spaces', () => {
      const result = measurer.measureText('     ', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle tabs', () => {
      const result = measurer.measureText('\t\t', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle newlines only', () => {
      const result = measurer.measureText('\n\n\n', { fontSize: 16 }, 500);
      expect(result.lineCount).toBeGreaterThan(1);
    });
  });

  describe('Font size edge cases', () => {
    it('should handle very small font size', () => {
      const result = measurer.measureText('Hello', { fontSize: 1 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should handle very large font size', () => {
      const result = measurer.measureText('Hello', { fontSize: 500 }, 1000);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should handle zero font size', () => {
      const result = measurer.measureText('Hello', { fontSize: 0 }, 500);
      expect(result.width).toBeGreaterThanOrEqual(0);
      expect(result.height).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative font size', () => {
      const result = measurer.measureText('Hello', { fontSize: -10 }, 500);
      // Should clamp to 0 or use fallback
      expect(result.width).toBeGreaterThanOrEqual(0);
    });

    it('should handle fractional font sizes', () => {
      const result = measurer.measureText('Hello', { fontSize: 12.5 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should handle Infinity font size', () => {
      const result = measurer.measureText('Hello', { fontSize: Infinity }, 500);
      expect(result.width).toBeGreaterThanOrEqual(0);
      expect(result.height).toBeGreaterThanOrEqual(0);
    });

    it('should handle NaN font size', () => {
      const result = measurer.measureText('Hello', { fontSize: NaN }, 500);
      expect(result.width).toBeGreaterThanOrEqual(0);
      expect(result.height).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Container width edge cases', () => {
    it('should handle very narrow container (1px)', () => {
      const result = measurer.measureText('Hello World', { fontSize: 16 }, 1);
      expect(result.lineCount).toBeGreaterThan(1); // Should wrap aggressively
    });

    it('should handle very wide container', () => {
      const result = measurer.measureText('Hello World', { fontSize: 16 }, 10000);
      expect(result.lineCount).toBe(1); // Should fit on one line
    });

    it('should handle zero container width', () => {
      const result = measurer.measureText('Hello', { fontSize: 16 }, 0);
      // Should handle gracefully
      expect(result.lineCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle negative container width', () => {
      const result = measurer.measureText('Hello', { fontSize: 16 }, -100);
      // Should handle gracefully
      expect(result.lineCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle Infinity container width', () => {
      const result = measurer.measureText('Hello World', { fontSize: 16 }, Infinity);
      expect(result.lineCount).toBe(1);
    });
  });

  describe('Text content edge cases', () => {
    it('should handle single character', () => {
      const result = measurer.measureText('A', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle very long single word (> 1000 chars)', () => {
      const longWord = 'a'.repeat(2000);
      const result = measurer.measureText(longWord, { fontSize: 16 }, 500);
      expect(result.lineCount).toBeGreaterThan(1); // Should wrap
    });

    it('should handle text with no spaces (continuous characters)', () => {
      const noSpaces = 'abcdefghijklmnopqrstuvwxyz'.repeat(10);
      const result = measurer.measureText(noSpaces, { fontSize: 16 }, 500);
      expect(result.lineCount).toBeGreaterThan(1);
    });

    it('should handle mixed newlines and regular text', () => {
      const result = measurer.measureText('Line 1\nLine 2\nLine 3', { fontSize: 16 }, 500);
      expect(result.lineCount).toBe(3);
    });

    it('should handle consecutive newlines', () => {
      const result = measurer.measureText('A\n\n\nB', { fontSize: 16 }, 500);
      expect(result.lineCount).toBeGreaterThan(2);
    });

    it('should handle text with only punctuation', () => {
      const result = measurer.measureText('!!!???...', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle text with only numbers', () => {
      const result = measurer.measureText('1234567890', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });
  });

  describe('Unicode and special characters', () => {
    it('should handle CJK characters', () => {
      const result = measurer.measureText('\u4F60\u597D\u4E16\u754C', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle Arabic text', () => {
      const result = measurer.measureText('\u0645\u0631\u062D\u0628\u0627', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle emoji', () => {
      const result = measurer.measureText('\uD83D\uDD25\uD83C\uDF0D\uD83D\uDCBB', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle multi-byte emoji sequences', () => {
      const result = measurer.measureText('\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle mixed Latin and CJK', () => {
      const result = measurer.measureText('Hello \u4E16\u754C World', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.lineCount).toBe(1);
    });

    it('should handle accented characters', () => {
      const result = measurer.measureText('caf\u00E9 r\u00E9sum\u00E9 na\u00EFve', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle currency symbols', () => {
      const result = measurer.measureText('\u20AC\u00A3\u00A5$\u20B9', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle mathematical symbols', () => {
      const result = measurer.measureText('\u00B1\u00D7\u00F7\u2248\u2260\u221E', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });
  });

  describe('Font family variations', () => {
    it('should handle Arial', () => {
      const result = measurer.measureText('Hello', { fontFamily: 'Arial', fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle Times New Roman', () => {
      const result = measurer.measureText('Hello', { fontFamily: 'Times New Roman', fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle monospace fonts', () => {
      const result = measurer.measureText('Hello', { fontFamily: 'Courier', fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle unknown font family', () => {
      const result = measurer.measureText('Hello', { fontFamily: 'NonExistentFont', fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0); // Should fallback
    });

    it('should handle undefined font family', () => {
      const result = measurer.measureText('Hello', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle font stack', () => {
      const result = measurer.measureText('Hello', {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 16
      }, 500);
      expect(result.width).toBeGreaterThan(0);
    });
  });

  describe('Font weight variations', () => {
    it('should handle numeric weight 100 (thin)', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, fontWeight: 100 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle numeric weight 400 (normal)', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, fontWeight: 400 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle numeric weight 700 (bold)', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, fontWeight: 700 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle numeric weight 900 (black)', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, fontWeight: 900 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle string weight "normal"', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, fontWeight: 'normal' }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle string weight "bold"', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, fontWeight: 'bold' }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle undefined weight', () => {
      const result = measurer.measureText('Hello', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle invalid weight', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, fontWeight: 'invalid' as any }, 500);
      expect(result.width).toBeGreaterThan(0); // Should fallback
    });
  });

  describe('Line height variations', () => {
    it('should handle normal line height', () => {
      const result = measurer.measureText('Line 1\nLine 2', { fontSize: 16, lineHeight: 1.5 }, 500);
      expect(result.height).toBeGreaterThan(32); // 2 lines x 16px x 1.5
    });

    it('should handle tight line height', () => {
      const result = measurer.measureText('Line 1\nLine 2', { fontSize: 16, lineHeight: 1 }, 500);
      expect(result.height).toBeCloseTo(32, 1); // 2 lines x 16px x 1
    });

    it('should handle loose line height', () => {
      const result = measurer.measureText('Line 1\nLine 2', { fontSize: 16, lineHeight: 2 }, 500);
      expect(result.height).toBeGreaterThanOrEqual(64); // 2 lines x 16px x 2
    });

    it('should handle zero line height', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, lineHeight: 0 }, 500);
      expect(result.height).toBeGreaterThanOrEqual(0);
    });

    it('should handle undefined line height', () => {
      const result = measurer.measureText('Hello', { fontSize: 16 }, 500);
      expect(result.height).toBeGreaterThan(0); // Should use default
    });
  });

  describe('Letter spacing variations', () => {
    it('should handle positive letter spacing', () => {
      const normal = measurer.measureText('Hello', { fontSize: 16 }, 500);
      const spaced = measurer.measureText('Hello', { fontSize: 16, letterSpacing: 2 }, 500);
      expect(spaced.width).toBeGreaterThan(normal.width);
    });

    it('should handle negative letter spacing', () => {
      const normal = measurer.measureText('Hello', { fontSize: 16 }, 500);
      const tight = measurer.measureText('Hello', { fontSize: 16, letterSpacing: -1 }, 500);
      expect(tight.width).toBeLessThan(normal.width);
    });

    it('should handle zero letter spacing', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, letterSpacing: 0 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle extreme positive spacing', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, letterSpacing: 100 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle extreme negative spacing', () => {
      const result = measurer.measureText('Hello', { fontSize: 16, letterSpacing: -100 }, 500);
      expect(result.width).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Wrapping behavior', () => {
    it('should wrap long text', () => {
      const longText = 'Hello World '.repeat(50);
      const result = measurer.measureText(longText, { fontSize: 16 }, 200);
      expect(result.lineCount).toBeGreaterThan(10);
    });

    it('should not wrap short text in wide container', () => {
      const result = measurer.measureText('Hello', { fontSize: 16 }, 1000);
      expect(result.lineCount).toBe(1);
    });

    it('should wrap at word boundaries', () => {
      const result = measurer.measureText('Hello World', { fontSize: 16 }, 60);
      expect(result.lineCount).toBeGreaterThan(1);
    });

    it('should handle text exactly at container width', () => {
      // Measure first to get exact width
      const measurement = measurer.measureText('Hello', { fontSize: 16 }, 1000);
      const result = measurer.measureText('Hello', { fontSize: 16 }, measurement.width);
      expect(result.lineCount).toBe(1);
    });

    it('should break very long words', () => {
      const longWord = 'Supercalifragilisticexpialidocious'.repeat(10);
      const result = measurer.measureText(longWord, { fontSize: 16 }, 200);
      expect(result.lineCount).toBeGreaterThan(1);
    });
  });

  describe('Complex style combinations', () => {
    it('should handle all style properties together', () => {
      const style: TextStyle = {
        fontFamily: 'Arial',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 1.5,
        letterSpacing: 1,
      };
      const result = measurer.measureText('Hello World\nNew Line', style, 500);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.lineCount).toBe(2);
    });

    it('should handle empty style object', () => {
      const result = measurer.measureText('Hello', {}, 500);
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle style with only fontSize', () => {
      const result = measurer.measureText('Hello', { fontSize: 16 }, 500);
      expect(result.width).toBeGreaterThan(0);
    });
  });

  describe('Line breaks edge cases', () => {
    it('should correctly track line breaks', () => {
      const result = measurer.measureText('Line 1\nLine 2\nLine 3', { fontSize: 16 }, 500);
      expect(result.lineBreaks.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle text with no breaks', () => {
      const result = measurer.measureText('NoBreaks', { fontSize: 16 }, 1000);
      expect(result.lineBreaks.length).toBeLessThanOrEqual(1);
    });

    it('should track breaks from wrapping', () => {
      const longText = 'Word '.repeat(100);
      const result = measurer.measureText(longText, { fontSize: 16 }, 200);
      expect(result.lineBreaks.length).toBeGreaterThan(0);
    });
  });
});
