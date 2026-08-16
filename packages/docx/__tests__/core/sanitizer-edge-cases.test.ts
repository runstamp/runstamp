/**
 * Sanitizer Edge Case Tests
 * ==========================
 * Comprehensive edge case validation for input sanitization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeTextContent,
  hasProblematicCharacters,
  sanitizeRect,
  sanitizeNode,
} from '../../src/core/sanitizer';
import type { PolyglotNode, Rect } from '../../src/core/types';
import * as errorHandler from '../../src/core/error-handler';

// Mock the error collector
vi.mock('../../src/core/error-handler', () => ({
  getErrorCollector: vi.fn(() => ({
    addWarning: vi.fn(),
    addError: vi.fn(),
  })),
}));

describe('sanitizeTextContent', () => {
  it('should return empty string for null', () => {
    expect(sanitizeTextContent(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(sanitizeTextContent(undefined)).toBe('');
  });

  it('should preserve normal text', () => {
    expect(sanitizeTextContent('Hello World')).toBe('Hello World');
  });

  it('should remove null bytes', () => {
    expect(sanitizeTextContent('Hello\x00World')).toBe('HelloWorld');
    expect(sanitizeTextContent('\x00\x00text')).toBe('text');
    expect(sanitizeTextContent('end\x00\x00')).toBe('end');
  });

  it('should handle text with only null bytes', () => {
    expect(sanitizeTextContent('\x00\x00\x00')).toBe('');
  });

  it('should truncate extremely long text (> 1MB chars)', () => {
    const longText = 'a'.repeat(1_500_000);
    const result = sanitizeTextContent(longText);
    expect(result.length).toBe(1_000_000);
    expect(result).toBe('a'.repeat(1_000_000));
  });

  it('should handle Unicode characters correctly', () => {
    expect(sanitizeTextContent('Hello \u4E16\u754C \uD83C\uDF0D')).toBe('Hello \u4E16\u754C \uD83C\uDF0D');
    expect(sanitizeTextContent('Emoji: \uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66')).toBe('Emoji: \uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66');
  });

  it('should handle mixed null bytes and Unicode', () => {
    expect(sanitizeTextContent('Hello\x00\u4E16\u754C\x00\uD83C\uDF0D')).toBe('Hello\u4E16\u754C\uD83C\uDF0D');
  });

  it('should handle empty string', () => {
    expect(sanitizeTextContent('')).toBe('');
  });

  it('should preserve whitespace', () => {
    expect(sanitizeTextContent('  spaces  ')).toBe('  spaces  ');
    expect(sanitizeTextContent('\n\r\t')).toBe('\n\r\t');
  });
});

describe('hasProblematicCharacters', () => {
  it('should detect null bytes', () => {
    expect(hasProblematicCharacters('\x00')).toBe(true);
    expect(hasProblematicCharacters('text\x00more')).toBe(true);
  });

  it('should detect control characters', () => {
    expect(hasProblematicCharacters('\x01')).toBe(true);
    expect(hasProblematicCharacters('\x02')).toBe(true);
    expect(hasProblematicCharacters('\x08')).toBe(true);
    expect(hasProblematicCharacters('\x0B')).toBe(true); // Vertical tab
    expect(hasProblematicCharacters('\x0C')).toBe(true); // Form feed
    expect(hasProblematicCharacters('\x0E')).toBe(true);
    expect(hasProblematicCharacters('\x1F')).toBe(true);
  });

  it('should allow newlines and tabs', () => {
    expect(hasProblematicCharacters('\n')).toBe(false);
    expect(hasProblematicCharacters('\r')).toBe(false);
    expect(hasProblematicCharacters('\t')).toBe(false);
  });

  it('should allow normal text', () => {
    expect(hasProblematicCharacters('Hello World')).toBe(false);
    expect(hasProblematicCharacters('Numbers 123')).toBe(false);
    expect(hasProblematicCharacters('Symbols !@#$%')).toBe(false);
  });

  it('should allow Unicode', () => {
    expect(hasProblematicCharacters('\u4E16\u754C')).toBe(false);
    expect(hasProblematicCharacters('\uD83C\uDF0D')).toBe(false);
  });
});

describe('sanitizeRect', () => {
  it('should return zero rect for undefined', () => {
    expect(sanitizeRect(undefined)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('should preserve valid rect', () => {
    const rect: Rect = { x: 10, y: 20, width: 100, height: 50 };
    expect(sanitizeRect(rect)).toEqual(rect);
  });

  it('should clamp NaN to 0', () => {
    expect(sanitizeRect({ x: NaN, y: 10, width: 100, height: 50 })).toEqual({
      x: 0, y: 10, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: NaN, width: 100, height: 50 })).toEqual({
      x: 10, y: 0, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: NaN, height: 50 })).toEqual({
      x: 10, y: 20, width: 0, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: 100, height: NaN })).toEqual({
      x: 10, y: 20, width: 100, height: 0
    });
  });

  it('should clamp Infinity to 0 (not finite)', () => {
    expect(sanitizeRect({ x: Infinity, y: 10, width: 100, height: 50 })).toEqual({
      x: 0, y: 10, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: Infinity, width: 100, height: 50 })).toEqual({
      x: 10, y: 0, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: Infinity, height: 50 })).toEqual({
      x: 10, y: 20, width: 0, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: 100, height: Infinity })).toEqual({
      x: 10, y: 20, width: 100, height: 0
    });
  });

  it('should clamp -Infinity to 0', () => {
    expect(sanitizeRect({ x: -Infinity, y: 10, width: 100, height: 50 })).toEqual({
      x: 0, y: 10, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: -Infinity, width: 100, height: 50 })).toEqual({
      x: 10, y: 0, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: -Infinity, height: 50 })).toEqual({
      x: 10, y: 20, width: 0, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: 100, height: -Infinity })).toEqual({
      x: 10, y: 20, width: 100, height: 0
    });
  });

  it('should clamp negative values to 0', () => {
    expect(sanitizeRect({ x: -10, y: 20, width: 100, height: 50 })).toEqual({
      x: 0, y: 20, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: -20, width: 100, height: 50 })).toEqual({
      x: 10, y: 0, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: -100, height: 50 })).toEqual({
      x: 10, y: 20, width: 0, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: 100, height: -50 })).toEqual({
      x: 10, y: 20, width: 100, height: 0
    });
  });

  it('should clamp extremely large coordinates', () => {
    expect(sanitizeRect({ x: 50000, y: 20, width: 100, height: 50 })).toEqual({
      x: 10000, y: 20, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 200000, width: 100, height: 50 })).toEqual({
      x: 10, y: 100000, width: 100, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: 50000, height: 50 })).toEqual({
      x: 10, y: 20, width: 10000, height: 50
    });
    expect(sanitizeRect({ x: 10, y: 20, width: 100, height: 50000 })).toEqual({
      x: 10, y: 20, width: 100, height: 10000
    });
  });

  it('should handle all invalid values at once', () => {
    expect(sanitizeRect({ x: NaN, y: -Infinity, width: Infinity, height: -100 })).toEqual({
      x: 0, y: 0, width: 0, height: 0
    });
  });

  it('should handle edge case at exact boundaries', () => {
    expect(sanitizeRect({ x: 10000, y: 100000, width: 10000, height: 10000 })).toEqual({
      x: 10000, y: 100000, width: 10000, height: 10000
    });
    expect(sanitizeRect({ x: 0, y: 0, width: 0, height: 0 })).toEqual({
      x: 0, y: 0, width: 0, height: 0
    });
  });
});

describe('sanitizeNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sanitize a simple text node', () => {
    const node: PolyglotNode = {
      id: 'node1',
      type: 'text',
      rect: { x: 10, y: 20, width: 100, height: 50 },
      textContent: {
        plain: 'Hello\x00World',
        spans: [{ text: 'Hello\x00World', bold: true }],
      },
    };

    const result = sanitizeNode(node);
    expect(result.textContent?.plain).toBe('HelloWorld');
    expect(result.textContent?.spans?.[0].text).toBe('HelloWorld');
  });

  it('should sanitize nested children', () => {
    const node: PolyglotNode = {
      id: 'parent',
      type: 'block',
      rect: { x: 0, y: 0, width: 200, height: 100 },
      children: [
        {
          id: 'child1',
          type: 'text',
          rect: { x: 10, y: 10, width: 50, height: 20 },
          textContent: { plain: 'Child\x001' },
        },
        {
          id: 'child2',
          type: 'text',
          rect: { x: 70, y: 10, width: 50, height: 20 },
          textContent: { plain: 'Child\x002' },
        },
      ],
    };

    const result = sanitizeNode(node);
    expect(result.children).toHaveLength(2);
    expect(result.children?.[0].textContent?.plain).toBe('Child1');
    expect(result.children?.[1].textContent?.plain).toBe('Child2');
  });

  it('should truncate deeply nested trees (> 100 levels)', () => {
    // Build a 150-level deep tree
    let node: PolyglotNode = {
      id: 'leaf',
      type: 'text',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      textContent: { plain: 'Deep leaf' },
    };

    for (let i = 0; i < 150; i++) {
      node = {
        id: `level-${i}`,
        type: 'block',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        children: [node],
      };
    }

    const result = sanitizeNode(node);

    // Count depth
    let depth = 0;
    let current: PolyglotNode | undefined = result;
    while (current?.children && current.children.length > 0) {
      depth++;
      current = current.children[0];
    }

    // Should be truncated at or near max depth (100)
    // Implementation may truncate at depth 100, meaning children at 101 are removed
    expect(depth).toBeLessThanOrEqual(101);
  });

  it('should sanitize alt text', () => {
    const node: PolyglotNode = {
      id: 'img1',
      type: 'image',
      rect: { x: 0, y: 0, width: 100, height: 100 },
      altText: 'Image\x00description',
    };

    const result = sanitizeNode(node);
    expect(result.altText).toBe('Imagedescription');
  });

  it('should sanitize invalid rect coordinates', () => {
    const node: PolyglotNode = {
      id: 'node1',
      type: 'text',
      rect: { x: NaN, y: -Infinity, width: Infinity, height: -100 },
      textContent: { plain: 'Text' },
    };

    const result = sanitizeNode(node);
    // All become 0 because NaN/Infinity are !isFinite, -100 is negative
    expect(result.rect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('should handle node without textContent', () => {
    const node: PolyglotNode = {
      id: 'container1',
      type: 'block',
      rect: { x: 0, y: 0, width: 100, height: 100 },
    };

    const result = sanitizeNode(node);
    expect(result.textContent).toBeUndefined();
  });

  it('should handle node without children', () => {
    const node: PolyglotNode = {
      id: 'leaf',
      type: 'text',
      rect: { x: 0, y: 0, width: 50, height: 20 },
      textContent: { plain: 'Leaf node' },
    };

    const result = sanitizeNode(node);
    expect(result.children).toBeUndefined();
  });

  it('should handle empty children array', () => {
    const node: PolyglotNode = {
      id: 'empty',
      type: 'block',
      rect: { x: 0, y: 0, width: 100, height: 100 },
      children: [],
    };

    const result = sanitizeNode(node);
    expect(result.children).toEqual([]);
  });

  it('should preserve node properties during sanitization', () => {
    const node: PolyglotNode = {
      id: 'styled',
      type: 'text',
      rect: { x: 10, y: 20, width: 100, height: 50 },
      textContent: { plain: 'Styled text' },
      styles: {
        fontFamily: 'Arial',
        fontSize: 16,
      },
    };

    const result = sanitizeNode(node);
    expect(result.id).toBe('styled');
    expect(result.type).toBe('text');
    expect(result.styles).toEqual({
      fontFamily: 'Arial',
      fontSize: 16,
    });
  });

  it('should handle complex nested structures with mixed issues', () => {
    const node: PolyglotNode = {
      id: 'root',
      type: 'block',
      rect: { x: -10, y: NaN, width: 500, height: 300 },
      children: [
        {
          id: 'text1',
          type: 'text',
          rect: { x: 10, y: 10, width: 100, height: 20 },
          textContent: {
            plain: 'Text\x00with\x00nulls',
            spans: [
              { text: 'Text\x00with', bold: true },
              { text: '\x00nulls', italic: true },
            ],
          },
          altText: 'Alt\x00text',
        },
        {
          id: 'container2',
          type: 'block',
          rect: { x: Infinity, y: 50, width: -100, height: 150 },
          children: [
            {
              id: 'text2',
              type: 'text',
              rect: { x: 20, y: 60, width: 80, height: 15 },
              textContent: { plain: 'Nested\x00text' },
            },
          ],
        },
      ],
    };

    const result = sanitizeNode(node);

    // Root rect sanitized (negative x becomes 0, NaN y becomes 0)
    expect(result.rect).toEqual({ x: 0, y: 0, width: 500, height: 300 });

    // First child sanitized
    expect(result.children?.[0].textContent?.plain).toBe('Textwithnulls');
    expect(result.children?.[0].textContent?.spans?.[0].text).toBe('Textwith');
    expect(result.children?.[0].textContent?.spans?.[1].text).toBe('nulls');
    expect(result.children?.[0].altText).toBe('Alttext');

    // Second child (container) rect sanitized (Infinity becomes 0, negative width becomes 0)
    expect(result.children?.[1].rect).toEqual({ x: 0, y: 50, width: 0, height: 150 });

    // Nested child sanitized
    expect(result.children?.[1].children?.[0].textContent?.plain).toBe('Nestedtext');
  });
});
