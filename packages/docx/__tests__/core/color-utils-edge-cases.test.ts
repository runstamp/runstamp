/**
 * Color Utils Edge Case Tests
 * ============================
 * Comprehensive edge case validation for color parsing and conversion.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseColor,
  parseColorWithFallback,
  isValidColor,
  getSupportedNamedColors,
} from '../../src/core/color-utils';

// Mock the error collector
vi.mock('../../src/core/error-handler', () => ({
  getErrorCollector: vi.fn(() => ({
    addWarning: vi.fn(),
  })),
}));

describe('parseColor', () => {
  describe('Named colors', () => {
    it('should parse basic named colors', () => {
      expect(parseColor('black')).toBe('000000');
      expect(parseColor('white')).toBe('FFFFFF');
      expect(parseColor('red')).toBe('FF0000');
      expect(parseColor('green')).toBe('008000');
      expect(parseColor('blue')).toBe('0000FF');
    });

    it('should parse extended named colors', () => {
      expect(parseColor('aqua')).toBe('00FFFF');
      expect(parseColor('fuchsia')).toBe('FF00FF');
      expect(parseColor('lime')).toBe('00FF00');
      expect(parseColor('maroon')).toBe('800000');
      expect(parseColor('navy')).toBe('000080');
    });

    it('should parse light variants', () => {
      expect(parseColor('lightblue')).toBe('ADD8E6');
      expect(parseColor('lightgray')).toBe('D3D3D3');
      expect(parseColor('lightgrey')).toBe('D3D3D3');
      expect(parseColor('lightgreen')).toBe('90EE90');
    });

    it('should parse dark variants', () => {
      expect(parseColor('darkblue')).toBe('00008B');
      expect(parseColor('darkgray')).toBe('A9A9A9');
      expect(parseColor('darkgrey')).toBe('A9A9A9');
      expect(parseColor('darkgreen')).toBe('006400');
    });

    it('should be case-insensitive', () => {
      expect(parseColor('RED')).toBe('FF0000');
      expect(parseColor('Red')).toBe('FF0000');
      expect(parseColor('rEd')).toBe('FF0000');
      expect(parseColor('LIGHTBLUE')).toBe('ADD8E6');
    });

    it('should handle whitespace around named colors', () => {
      expect(parseColor('  red  ')).toBe('FF0000');
      expect(parseColor('\tblue\t')).toBe('0000FF');
      expect(parseColor('\ngreen\n')).toBe('008000');
    });
  });

  describe('Hex colors', () => {
    it('should parse 6-digit hex with hash', () => {
      expect(parseColor('#FF0000')).toBe('FF0000');
      expect(parseColor('#00FF00')).toBe('00FF00');
      expect(parseColor('#0000FF')).toBe('0000FF');
    });

    it('should parse 6-digit hex without hash', () => {
      expect(parseColor('FF0000')).toBe('FF0000');
      expect(parseColor('00FF00')).toBe('00FF00');
      expect(parseColor('0000FF')).toBe('0000FF');
    });

    it('should parse lowercase hex', () => {
      expect(parseColor('#ff0000')).toBe('FF0000');
      expect(parseColor('abcdef')).toBe('ABCDEF');
    });

    it('should parse 3-digit hex with hash', () => {
      expect(parseColor('#F00')).toBe('FF0000');
      expect(parseColor('#0F0')).toBe('00FF00');
      expect(parseColor('#00F')).toBe('0000FF');
      expect(parseColor('#ABC')).toBe('AABBCC');
    });

    it('should parse 3-digit hex without hash', () => {
      expect(parseColor('F00')).toBe('FF0000');
      expect(parseColor('0F0')).toBe('00FF00');
      expect(parseColor('00F')).toBe('0000FF');
    });

    it('should parse 8-digit hex (with alpha) and drop alpha', () => {
      expect(parseColor('#FF0000FF')).toBe('FF0000'); // Fully opaque
      expect(parseColor('#FF000080')).toBe('FF0000'); // Semi-transparent
      expect(parseColor('#FF000000')).toBe('FF0000'); // Fully transparent
    });

    it('should parse 4-digit hex (with alpha) and drop alpha', () => {
      expect(parseColor('#F00F')).toBe('FF0000');
      expect(parseColor('#F008')).toBe('FF0000');
      expect(parseColor('#F000')).toBe('FF0000');
    });

    it('should handle whitespace around hex', () => {
      expect(parseColor('  #FF0000  ')).toBe('FF0000');
      expect(parseColor('\t#F00\t')).toBe('FF0000');
    });
  });

  describe('RGB colors', () => {
    it('should parse rgb() format', () => {
      expect(parseColor('rgb(255, 0, 0)')).toBe('FF0000');
      expect(parseColor('rgb(0, 255, 0)')).toBe('00FF00');
      expect(parseColor('rgb(0, 0, 255)')).toBe('0000FF');
    });

    it('should parse rgba() format and ignore alpha', () => {
      expect(parseColor('rgba(255, 0, 0, 1)')).toBe('FF0000');
      expect(parseColor('rgba(0, 255, 0, 0.5)')).toBe('00FF00');
      expect(parseColor('rgba(0, 0, 255, 0)')).toBe('0000FF');
    });

    it('should clamp RGB values > 255', () => {
      expect(parseColor('rgb(300, 0, 0)')).toBe('FF0000');
      expect(parseColor('rgb(0, 500, 0)')).toBe('00FF00');
      expect(parseColor('rgb(0, 0, 1000)')).toBe('0000FF');
    });

    it('should not parse negative RGB values (regex limitation)', () => {
      // The regex only matches \d+ which doesn't include negative numbers
      expect(parseColor('rgb(-50, 128, 128)')).toBeUndefined();
      expect(parseColor('rgb(128, -100, 128)')).toBeUndefined();
      expect(parseColor('rgb(128, 128, -200)')).toBeUndefined();
    });

    it('should handle whitespace variations in rgb()', () => {
      expect(parseColor('rgb(255,0,0)')).toBe('FF0000');
      expect(parseColor('rgb( 255 , 0 , 0 )')).toBe('FF0000');
      expect(parseColor('rgb(  255  ,  0  ,  0  )')).toBe('FF0000');
    });

    it('should handle percentage-based rgb()', () => {
      expect(parseColor('rgb(100%, 0%, 0%)')).toBe('FF0000');
      expect(parseColor('rgb(0%, 100%, 0%)')).toBe('00FF00');
      expect(parseColor('rgb(0%, 0%, 100%)')).toBe('0000FF');
      expect(parseColor('rgb(50%, 50%, 50%)')).toBe('7F7F7F'); // 127.5 rounds to 127 = 0x7F
    });

    it('should handle percentage > 100%', () => {
      expect(parseColor('rgb(150%, 0%, 0%)')).toBe('FF0000');
      expect(parseColor('rgb(0%, 200%, 0%)')).toBe('00FF00');
    });

    it('should not parse negative percentages (regex limitation)', () => {
      // The regex only matches [\d.]+ which doesn't include negative numbers
      expect(parseColor('rgb(-50%, 50%, 50%)')).toBeUndefined();
    });

    it('should not parse fractional RGB values (regex limitation)', () => {
      // The regex only matches \d+ which doesn't match decimals
      expect(parseColor('rgb(128.7, 64.3, 192.5)')).toBeUndefined();
    });
  });

  describe('HSL colors', () => {
    it('should parse hsl() format', () => {
      expect(parseColor('hsl(0, 100%, 50%)')).toBe('FF0000'); // Red
      expect(parseColor('hsl(120, 100%, 50%)')).toBe('00FF00'); // Green
      expect(parseColor('hsl(240, 100%, 50%)')).toBe('0000FF'); // Blue
    });

    it('should parse hsla() format and ignore alpha', () => {
      expect(parseColor('hsla(0, 100%, 50%, 1)')).toBe('FF0000');
      expect(parseColor('hsla(120, 100%, 50%, 0.5)')).toBe('00FF00');
      expect(parseColor('hsla(240, 100%, 50%, 0)')).toBe('0000FF');
    });

    it('should handle hue wrapping (> 360)', () => {
      expect(parseColor('hsl(360, 100%, 50%)')).toBe('FF0000');
      expect(parseColor('hsl(480, 100%, 50%)')).toBe('00FF00'); // 480 % 360 = 120
      expect(parseColor('hsl(720, 100%, 50%)')).toBe('FF0000'); // 720 % 360 = 0
    });

    it('should clamp saturation to 0-100%', () => {
      expect(parseColor('hsl(0, 150%, 50%)')).toBe('FF0000'); // Clamped to 100%
      const grayResult = parseColor('hsl(0, 0%, 50%)');
      expect(grayResult).toBeDefined(); // 0% saturation = gray
      expect(grayResult?.length).toBe(6);
    });

    it('should clamp lightness to 0-100%', () => {
      expect(parseColor('hsl(0, 100%, 100%)')).toBe('FFFFFF'); // White
      expect(parseColor('hsl(0, 100%, 0%)')).toBe('000000'); // Black
    });

    it('should handle achromatic (gray) HSL', () => {
      expect(parseColor('hsl(0, 0%, 0%)')).toBe('000000'); // Black
      expect(parseColor('hsl(0, 0%, 50%)')).toBe('808080'); // Gray
      expect(parseColor('hsl(0, 0%, 100%)')).toBe('FFFFFF'); // White
    });

    it('should handle various hue values', () => {
      expect(parseColor('hsl(60, 100%, 50%)')).toBe('FFFF00'); // Yellow
      expect(parseColor('hsl(180, 100%, 50%)')).toBe('00FFFF'); // Cyan
      expect(parseColor('hsl(300, 100%, 50%)')).toBe('FF00FF'); // Magenta
    });

    it('should handle whitespace in hsl()', () => {
      expect(parseColor('hsl( 0 , 100% , 50% )')).toBe('FF0000');
      expect(parseColor('hsl(120,100%,50%)')).toBe('00FF00');
    });
  });

  describe('Invalid inputs', () => {
    it('should return undefined for null', () => {
      expect(parseColor(null as any)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseColor(undefined as any)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseColor('')).toBeUndefined();
    });

    it('should return undefined for whitespace-only', () => {
      expect(parseColor('   ')).toBeUndefined();
      expect(parseColor('\t\n')).toBeUndefined();
    });

    it('should return undefined for unknown named color', () => {
      expect(parseColor('notacolor')).toBeUndefined();
      expect(parseColor('redd')).toBeUndefined();
      expect(parseColor('blu')).toBeUndefined();
    });

    it('should return undefined for invalid hex length', () => {
      expect(parseColor('#F')).toBeUndefined();
      expect(parseColor('#FF')).toBeUndefined();
      expect(parseColor('#FFFFF')).toBeUndefined(); // 5 digits
      expect(parseColor('#FFFFFFF')).toBeUndefined(); // 7 digits
    });

    it('should return undefined for invalid hex characters', () => {
      expect(parseColor('#GGGGGG')).toBeUndefined();
      expect(parseColor('#FZ0000')).toBeUndefined();
      expect(parseColor('#FF00ZZ')).toBeUndefined();
    });

    it('should return undefined for malformed rgb()', () => {
      expect(parseColor('rgb(255)')).toBeUndefined();
      expect(parseColor('rgb(255, 0)')).toBeUndefined();
      expect(parseColor('rgb()')).toBeUndefined();
      expect(parseColor('rgb(a, b, c)')).toBeUndefined();
    });

    it('should return undefined for malformed hsl()', () => {
      expect(parseColor('hsl(0)')).toBeUndefined();
      expect(parseColor('hsl(0, 100%)')).toBeUndefined();
      expect(parseColor('hsl()')).toBeUndefined();
      expect(parseColor('hsl(a, b%, c%)')).toBeUndefined();
    });

    it('should return undefined for random strings', () => {
      expect(parseColor('random text')).toBeUndefined();
      expect(parseColor('12345')).toBeUndefined();
      expect(parseColor('color: red')).toBeUndefined();
    });
  });

  describe('Edge case color values', () => {
    it('should handle pure black in all formats', () => {
      expect(parseColor('black')).toBe('000000');
      expect(parseColor('#000000')).toBe('000000');
      expect(parseColor('#000')).toBe('000000');
      expect(parseColor('rgb(0, 0, 0)')).toBe('000000');
      expect(parseColor('hsl(0, 0%, 0%)')).toBe('000000');
    });

    it('should handle pure white in all formats', () => {
      expect(parseColor('white')).toBe('FFFFFF');
      expect(parseColor('#FFFFFF')).toBe('FFFFFF');
      expect(parseColor('#FFF')).toBe('FFFFFF');
      expect(parseColor('rgb(255, 255, 255)')).toBe('FFFFFF');
      expect(parseColor('hsl(0, 0%, 100%)')).toBe('FFFFFF');
    });

    it('should handle mid gray in all formats', () => {
      expect(parseColor('gray')).toBe('808080');
      expect(parseColor('grey')).toBe('808080');
      expect(parseColor('#808080')).toBe('808080');
      expect(parseColor('rgb(128, 128, 128)')).toBe('808080');
      expect(parseColor('rgb(50.2%, 50.2%, 50.2%)')).toBe('808080'); // 50.2% * 255 / 100 = 128.01 -> 128
    });
  });
});

describe('parseColorWithFallback', () => {
  it('should return parsed color when valid', () => {
    expect(parseColorWithFallback('red')).toBe('FF0000');
    expect(parseColorWithFallback('#00FF00')).toBe('00FF00');
  });

  it('should return default fallback (black) for invalid', () => {
    expect(parseColorWithFallback('invalid')).toBe('000000');
    expect(parseColorWithFallback('')).toBe('000000');
    expect(parseColorWithFallback(null as any)).toBe('000000');
  });

  it('should return custom fallback for invalid', () => {
    expect(parseColorWithFallback('invalid', 'FFFFFF')).toBe('FFFFFF');
    expect(parseColorWithFallback('', 'FF0000')).toBe('FF0000');
    expect(parseColorWithFallback(null as any, '00FF00')).toBe('00FF00');
  });

  it('should not use fallback for valid colors', () => {
    expect(parseColorWithFallback('blue', 'FF0000')).toBe('0000FF');
    expect(parseColorWithFallback('#000000', 'FFFFFF')).toBe('000000');
  });
});

describe('isValidColor', () => {
  it('should return true for valid colors', () => {
    expect(isValidColor('red')).toBe(true);
    expect(isValidColor('#FF0000')).toBe(true);
    expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
    expect(isValidColor('hsl(0, 100%, 50%)')).toBe(true);
  });

  it('should return false for invalid colors', () => {
    expect(isValidColor('notacolor')).toBe(false);
    expect(isValidColor('#GGGGGG')).toBe(false);
    expect(isValidColor('rgb(a, b, c)')).toBe(false);
    expect(isValidColor('')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isValidColor(null)).toBe(false);
    expect(isValidColor(undefined)).toBe(false);
  });
});

describe('getSupportedNamedColors', () => {
  it('should return array of color names', () => {
    const colors = getSupportedNamedColors();
    expect(Array.isArray(colors)).toBe(true);
    expect(colors.length).toBeGreaterThan(0);
  });

  it('should include basic colors', () => {
    const colors = getSupportedNamedColors();
    expect(colors).toContain('red');
    expect(colors).toContain('green');
    expect(colors).toContain('blue');
    expect(colors).toContain('black');
    expect(colors).toContain('white');
  });

  it('should include extended colors', () => {
    const colors = getSupportedNamedColors();
    expect(colors).toContain('aqua');
    expect(colors).toContain('fuchsia');
    expect(colors).toContain('lime');
  });

  it('should include light/dark variants', () => {
    const colors = getSupportedNamedColors();
    expect(colors).toContain('lightblue');
    expect(colors).toContain('darkblue');
    expect(colors).toContain('lightgray');
    expect(colors).toContain('darkgray');
  });
});
