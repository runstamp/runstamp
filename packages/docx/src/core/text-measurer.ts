/**
 * Text Measurement System - Phase 13 Enhanced
 * ============================================
 * Provides accurate text dimension estimation without requiring a browser.
 * Uses comprehensive font-specific metrics, character width tables, and kerning pairs.
 *
 * Accuracy improvements over basic estimation:
 * - Per-character width tables for Latin alphabet (all chars A-Z, a-z, 0-9)
 * - Common punctuation and symbol widths
 * - Unicode character class handling (CJK, Arabic, etc.)
 * - Common kerning pair adjustments
 * - Script-specific defaults
 */

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface TextMeasurement {
  /** Total width needed for the text */
  width: number;
  /** Total height needed for the text */
  height: number;
  /** Number of lines after wrapping */
  lineCount: number;
  /** Character indices where lines break */
  lineBreaks: number[];
}

export interface TextMeasurer {
  measureText(
    text: string,
    style: TextStyle,
    containerWidth: number
  ): TextMeasurement;
}

// =============================================================================
// COMPREHENSIVE CHARACTER WIDTH TABLES
// Width values are expressed as em-units (fraction of fontSize)
// Based on actual font metrics from common typefaces
// =============================================================================

interface FontMetrics {
  /** Average character width as fraction of fontSize */
  avgCharWidth: number;
  /** Full character width table */
  charWidths: Record<string, number>;
  /** Whether the font is monospace */
  monospace?: boolean;
  /** Common kerning pairs (two chars -> adjustment in em) */
  kerningPairs?: Record<string, number>;
  /** Default width for CJK characters */
  cjkWidth?: number;
}

/**
 * Complete Latin character widths for Arial/Helvetica-style sans-serif fonts
 * Measured from actual font metrics
 */
const ARIAL_CHAR_WIDTHS: Record<string, number> = {
  // Uppercase letters
  A: 0.667, B: 0.667, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778,
  H: 0.722, I: 0.278, J: 0.500, K: 0.667, L: 0.556, M: 0.833, N: 0.722,
  O: 0.778, P: 0.667, Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722,
  V: 0.667, W: 0.944, X: 0.667, Y: 0.667, Z: 0.611,
  // Lowercase letters
  a: 0.556, b: 0.556, c: 0.500, d: 0.556, e: 0.556, f: 0.278, g: 0.556,
  h: 0.556, i: 0.222, j: 0.222, k: 0.500, l: 0.222, m: 0.833, n: 0.556,
  o: 0.556, p: 0.556, q: 0.556, r: 0.333, s: 0.500, t: 0.278, u: 0.556,
  v: 0.500, w: 0.722, x: 0.500, y: 0.500, z: 0.500,
  // Numbers
  '0': 0.556, '1': 0.556, '2': 0.556, '3': 0.556, '4': 0.556,
  '5': 0.556, '6': 0.556, '7': 0.556, '8': 0.556, '9': 0.556,
  // Punctuation
  ' ': 0.278, '!': 0.278, '"': 0.355, '#': 0.556, '$': 0.556, '%': 0.889,
  '&': 0.667, "'": 0.191, '(': 0.333, ')': 0.333, '*': 0.389, '+': 0.584,
  ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278, ':': 0.278, ';': 0.278,
  '<': 0.584, '=': 0.584, '>': 0.584, '?': 0.556, '@': 1.015, '[': 0.278,
  '\\': 0.278, ']': 0.278, '^': 0.469, '_': 0.556, '`': 0.333, '{': 0.334,
  '|': 0.260, '}': 0.334, '~': 0.584,
  // Common extended Latin
  'é': 0.556, 'è': 0.556, 'ê': 0.556, 'ë': 0.556, 'à': 0.556, 'á': 0.556,
  'â': 0.556, 'ä': 0.556, 'ù': 0.556, 'ú': 0.556, 'û': 0.556, 'ü': 0.556,
  'ç': 0.500, 'ñ': 0.556, 'ß': 0.611, 'ø': 0.611, 'æ': 0.889, 'œ': 0.944,
  // Common symbols
  '€': 0.556, '£': 0.556, '¥': 0.556, '©': 0.737, '®': 0.737, '™': 0.980,
  '°': 0.400, '±': 0.584, '×': 0.584, '÷': 0.584, '•': 0.350, '–': 0.556,
  '—': 1.000, '\u201c': 0.333, '\u201d': 0.333, '\u2018': 0.191, '\u2019': 0.191, '…': 1.000,
};

/**
 * Complete Latin character widths for Times New Roman-style serif fonts
 */
const TIMES_CHAR_WIDTHS: Record<string, number> = {
  // Uppercase letters
  A: 0.722, B: 0.667, C: 0.667, D: 0.722, E: 0.611, F: 0.556, G: 0.722,
  H: 0.722, I: 0.333, J: 0.389, K: 0.722, L: 0.611, M: 0.889, N: 0.722,
  O: 0.722, P: 0.556, Q: 0.722, R: 0.667, S: 0.556, T: 0.611, U: 0.722,
  V: 0.722, W: 0.944, X: 0.722, Y: 0.722, Z: 0.611,
  // Lowercase letters
  a: 0.444, b: 0.500, c: 0.444, d: 0.500, e: 0.444, f: 0.333, g: 0.500,
  h: 0.500, i: 0.278, j: 0.278, k: 0.500, l: 0.278, m: 0.778, n: 0.500,
  o: 0.500, p: 0.500, q: 0.500, r: 0.333, s: 0.389, t: 0.278, u: 0.500,
  v: 0.500, w: 0.722, x: 0.500, y: 0.500, z: 0.444,
  // Numbers
  '0': 0.500, '1': 0.500, '2': 0.500, '3': 0.500, '4': 0.500,
  '5': 0.500, '6': 0.500, '7': 0.500, '8': 0.500, '9': 0.500,
  // Punctuation
  ' ': 0.250, '!': 0.333, '"': 0.408, '#': 0.500, '$': 0.500, '%': 0.833,
  '&': 0.778, "'": 0.180, '(': 0.333, ')': 0.333, '*': 0.500, '+': 0.564,
  ',': 0.250, '-': 0.333, '.': 0.250, '/': 0.278, ':': 0.278, ';': 0.278,
  '<': 0.564, '=': 0.564, '>': 0.564, '?': 0.444, '@': 0.921,
  '[': 0.333, '\\': 0.278, ']': 0.333, '^': 0.469, '_': 0.500,
  '`': 0.333, '{': 0.480, '|': 0.200, '}': 0.480, '~': 0.541,
};

/**
 * Common kerning pairs (adjustment values in em-units)
 * Negative values = tighter spacing
 */
const COMMON_KERNING_PAIRS: Record<string, number> = {
  'AV': -0.08, 'AW': -0.06, 'AY': -0.08, 'AT': -0.08, 'Av': -0.04, 'Aw': -0.04,
  'Ay': -0.04, 'FA': -0.05, 'LT': -0.08, 'LV': -0.08, 'LW': -0.06, 'LY': -0.08,
  'PA': -0.08, 'TA': -0.08, 'Ta': -0.06, 'Te': -0.04, 'To': -0.06, 'Tr': -0.04,
  'Tu': -0.04, 'Tw': -0.04, 'Ty': -0.04, 'VA': -0.08, 'Va': -0.04, 'Ve': -0.04,
  'Vi': -0.02, 'Vo': -0.04, 'Vr': -0.04, 'Vu': -0.04, 'Vy': -0.04, 'WA': -0.06,
  'Wa': -0.04, 'We': -0.02, 'Wi': -0.02, 'Wo': -0.02, 'Wr': -0.02, 'Wu': -0.02,
  'Wy': -0.02, 'YA': -0.08, 'Ya': -0.06, 'Ye': -0.06, 'Yi': -0.04, 'Yo': -0.06,
  'Yp': -0.06, 'Yq': -0.06, 'Yu': -0.04, 'Yv': -0.04, 'ff': -0.02, 'fi': -0.02,
  'fl': -0.02, 'ffi': -0.02, 'ffl': -0.02, 'rt': -0.02, 'ry': -0.02,
};

/**
 * Font metrics database
 */
const FONT_METRICS: Record<string, FontMetrics> = {
  // Sans-serif fonts
  'Arial': {
    avgCharWidth: 0.52,
    charWidths: ARIAL_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'Helvetica': {
    avgCharWidth: 0.52,
    charWidths: ARIAL_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'Verdana': {
    avgCharWidth: 0.58,
    charWidths: Object.fromEntries(
      Object.entries(ARIAL_CHAR_WIDTHS).map(([k, v]) => [k, v * 1.1])
    ),
    cjkWidth: 1.1,
  },
  'Tahoma': {
    avgCharWidth: 0.52,
    charWidths: ARIAL_CHAR_WIDTHS,
    cjkWidth: 1.0,
  },
  'Trebuchet MS': {
    avgCharWidth: 0.50,
    charWidths: ARIAL_CHAR_WIDTHS,
    cjkWidth: 1.0,
  },
  'Calibri': {
    avgCharWidth: 0.48,
    charWidths: Object.fromEntries(
      Object.entries(ARIAL_CHAR_WIDTHS).map(([k, v]) => [k, v * 0.92])
    ),
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'sans-serif': {
    avgCharWidth: 0.52,
    charWidths: ARIAL_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },

  // Serif fonts
  'Times New Roman': {
    avgCharWidth: 0.48,
    charWidths: TIMES_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'Georgia': {
    avgCharWidth: 0.52,
    charWidths: Object.fromEntries(
      Object.entries(TIMES_CHAR_WIDTHS).map(([k, v]) => [k, v * 1.08])
    ),
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'Palatino': {
    avgCharWidth: 0.50,
    charWidths: TIMES_CHAR_WIDTHS,
    cjkWidth: 1.0,
  },
  'Cambria': {
    avgCharWidth: 0.50,
    charWidths: TIMES_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'serif': {
    avgCharWidth: 0.48,
    charWidths: TIMES_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },

  // Monospace fonts - all characters same width
  'Courier New': {
    avgCharWidth: 0.60,
    charWidths: {},
    monospace: true,
    cjkWidth: 1.0,
  },
  'Consolas': {
    avgCharWidth: 0.55,
    charWidths: {},
    monospace: true,
    cjkWidth: 1.0,
  },
  'Monaco': {
    avgCharWidth: 0.55,
    charWidths: {},
    monospace: true,
    cjkWidth: 1.0,
  },
  'Menlo': {
    avgCharWidth: 0.55,
    charWidths: {},
    monospace: true,
    cjkWidth: 1.0,
  },
  'monospace': {
    avgCharWidth: 0.60,
    charWidths: {},
    monospace: true,
    cjkWidth: 1.0,
  },

  // System fonts
  'system-ui': {
    avgCharWidth: 0.52,
    charWidths: ARIAL_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  '-apple-system': {
    avgCharWidth: 0.50,
    charWidths: Object.fromEntries(
      Object.entries(ARIAL_CHAR_WIDTHS).map(([k, v]) => [k, v * 0.96])
    ),
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'BlinkMacSystemFont': {
    avgCharWidth: 0.50,
    charWidths: Object.fromEntries(
      Object.entries(ARIAL_CHAR_WIDTHS).map(([k, v]) => [k, v * 0.96])
    ),
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
  'Segoe UI': {
    avgCharWidth: 0.50,
    charWidths: Object.fromEntries(
      Object.entries(ARIAL_CHAR_WIDTHS).map(([k, v]) => [k, v * 0.96])
    ),
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },

  // Default fallback
  'default': {
    avgCharWidth: 0.50,
    charWidths: ARIAL_CHAR_WIDTHS,
    kerningPairs: COMMON_KERNING_PAIRS,
    cjkWidth: 1.0,
  },
};

// =============================================================================
// UNICODE CHARACTER CLASSIFICATION
// =============================================================================

/**
 * Check if character is CJK (Chinese, Japanese, Korean)
 */
function isCJKChar(charCode: number): boolean {
  return (
    (charCode >= 0x4E00 && charCode <= 0x9FFF) ||   // CJK Unified Ideographs
    (charCode >= 0x3400 && charCode <= 0x4DBF) ||   // CJK Extension A
    (charCode >= 0x20000 && charCode <= 0x2A6DF) || // CJK Extension B
    (charCode >= 0x3000 && charCode <= 0x303F) ||   // CJK Symbols and Punctuation
    (charCode >= 0x3040 && charCode <= 0x309F) ||   // Hiragana
    (charCode >= 0x30A0 && charCode <= 0x30FF) ||   // Katakana
    (charCode >= 0xAC00 && charCode <= 0xD7AF) ||   // Korean Hangul Syllables
    (charCode >= 0xFF00 && charCode <= 0xFFEF)      // Fullwidth Forms
  );
}

/**
 * Check if character is Arabic or Hebrew (RTL scripts)
 */
function isRTLChar(charCode: number): boolean {
  return (
    (charCode >= 0x0600 && charCode <= 0x06FF) ||   // Arabic
    (charCode >= 0x0750 && charCode <= 0x077F) ||   // Arabic Supplement
    (charCode >= 0x0590 && charCode <= 0x05FF) ||   // Hebrew
    (charCode >= 0xFB50 && charCode <= 0xFDFF) ||   // Arabic Presentation Forms-A
    (charCode >= 0xFE70 && charCode <= 0xFEFF)      // Arabic Presentation Forms-B
  );
}

/**
 * Check if character is an emoji
 */
function isEmoji(charCode: number): boolean {
  return (
    (charCode >= 0x1F600 && charCode <= 0x1F64F) || // Emoticons
    (charCode >= 0x1F300 && charCode <= 0x1F5FF) || // Misc Symbols and Pictographs
    (charCode >= 0x1F680 && charCode <= 0x1F6FF) || // Transport and Map
    (charCode >= 0x1F1E0 && charCode <= 0x1F1FF) || // Flags
    (charCode >= 0x2600 && charCode <= 0x26FF) ||   // Misc symbols
    (charCode >= 0x2700 && charCode <= 0x27BF) ||   // Dingbats
    (charCode >= 0xFE00 && charCode <= 0xFE0F) ||   // Variation Selectors
    (charCode >= 0x1F900 && charCode <= 0x1F9FF)    // Supplemental Symbols
  );
}

// =============================================================================
// MEASUREMENT FUNCTIONS
// =============================================================================

/**
 * Bold weight multiplier - bold text is typically ~5-10% wider
 */
const BOLD_MULTIPLIER = 1.05;

/**
 * Get font metrics for a font family
 */
function getFontMetrics(fontFamily: string): FontMetrics {
  // Try exact match first
  if (FONT_METRICS[fontFamily]) {
    return FONT_METRICS[fontFamily];
  }

  // Try case-insensitive match
  const lowerFamily = fontFamily.toLowerCase();
  for (const [key, metrics] of Object.entries(FONT_METRICS)) {
    if (key.toLowerCase() === lowerFamily) {
      return metrics;
    }
  }

  // Try to match first font in font stack
  const firstFont = fontFamily.split(',')[0].trim().replace(/["']/g, '');
  if (FONT_METRICS[firstFont]) {
    return FONT_METRICS[firstFont];
  }

  // Determine category and use appropriate default
  const lower = fontFamily.toLowerCase();
  if (lower.includes('mono') || lower.includes('courier') || lower.includes('consolas')) {
    return FONT_METRICS['monospace'];
  }
  if (lower.includes('serif') && !lower.includes('sans')) {
    return FONT_METRICS['serif'];
  }

  return FONT_METRICS['default'];
}

/**
 * Calculate the width of a single character
 */
function getCharWidth(
  char: string,
  fontSize: number,
  metrics: FontMetrics,
  isBold: boolean
): number {
  const charCode = char.codePointAt(0) || 0;
  let width: number;

  // Monospace fonts: all characters same width
  if (metrics.monospace) {
    // CJK in monospace is typically double-width
    if (isCJKChar(charCode)) {
      width = metrics.avgCharWidth * fontSize * 2;
    } else {
      width = metrics.avgCharWidth * fontSize;
    }
  }
  // CJK characters: typically full-width (1em)
  else if (isCJKChar(charCode)) {
    width = (metrics.cjkWidth || 1.0) * fontSize;
  }
  // RTL scripts: typically similar to Latin average
  else if (isRTLChar(charCode)) {
    width = metrics.avgCharWidth * fontSize;
  }
  // Emoji: typically 1em or wider
  else if (isEmoji(charCode)) {
    width = fontSize * 1.2; // Emoji tend to be wider
  }
  // Look up specific character width
  else if (metrics.charWidths[char] !== undefined) {
    width = metrics.charWidths[char] * fontSize;
  }
  // Use average character width
  else {
    width = metrics.avgCharWidth * fontSize;
  }

  // Apply bold multiplier
  if (isBold) {
    width *= BOLD_MULTIPLIER;
  }

  return width;
}

/**
 * Get kerning adjustment for a character pair
 */
function getKerningAdjustment(
  prevChar: string,
  currChar: string,
  fontSize: number,
  metrics: FontMetrics
): number {
  if (!metrics.kerningPairs) return 0;

  const pair = prevChar + currChar;
  const adjustment = metrics.kerningPairs[pair];

  if (adjustment !== undefined) {
    return adjustment * fontSize;
  }

  return 0;
}

/**
 * Check if a font weight indicates bold
 */
function isBoldWeight(weight: string | number | undefined): boolean {
  if (!weight) return false;
  if (typeof weight === 'number') return weight >= 600;
  const lower = weight.toLowerCase();
  return lower === 'bold' || lower === 'bolder' || parseInt(lower, 10) >= 600;
}

/**
 * Find word boundaries for text wrapping
 * Now includes CJK-aware breaking (CJK can break after any character)
 */
function findWordBoundaries(text: string): number[] {
  const boundaries: number[] = [0];
  const wordBreakChars = /[\s\-–—]/;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.codePointAt(i) || 0;

    // Standard word break characters
    if (wordBreakChars.test(text[i])) {
      boundaries.push(i + 1);
    }
    // CJK characters can break after any character
    else if (isCJKChar(charCode)) {
      boundaries.push(i + 1);
    }
  }

  return boundaries;
}

/**
 * Enhanced Text Measurer with comprehensive font metrics
 */
export class EstimatingTextMeasurer implements TextMeasurer {
  measureText(
    text: string,
    style: TextStyle,
    containerWidth: number
  ): TextMeasurement {
    if (!text || text.length === 0) {
      return { width: 0, height: 0, lineCount: 0, lineBreaks: [] };
    }

    const fontSize = style.fontSize || 16;
    const lineHeight = style.lineHeight || 1.4;
    const fontFamily = style.fontFamily || 'Arial';
    const letterSpacing = style.letterSpacing || 0;
    const isBold = isBoldWeight(style.fontWeight);

    const metrics = getFontMetrics(fontFamily);
    const lineHeightPx = fontSize * lineHeight;

    // Split into paragraphs (preserve explicit line breaks)
    const paragraphs = text.split(/\r?\n/);
    const lines: string[] = [];
    const lineBreaks: number[] = [];
    let charIndex = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        // Empty paragraph = blank line
        lines.push('');
        lineBreaks.push(charIndex);
        charIndex += 1;
        continue;
      }

      // Word wrap the paragraph with kerning support
      const wordBoundaries = findWordBoundaries(paragraph);
      let currentLine = '';
      let currentLineWidth = 0;
      let lineStartIndex = charIndex;
      let prevChar = '';

      for (let i = 0; i < paragraph.length; i++) {
        const char = paragraph[i];

        // Calculate character width with kerning
        let charWidth = getCharWidth(char, fontSize, metrics, isBold);
        charWidth += getKerningAdjustment(prevChar, char, fontSize, metrics);
        charWidth += letterSpacing;

        // Check if adding this character exceeds container width
        if (currentLineWidth + charWidth > containerWidth && currentLine.length > 0) {
          // Find best break point
          let breakPoint = currentLine.length;
          for (let j = wordBoundaries.length - 1; j >= 0; j--) {
            const boundaryInLine = wordBoundaries[j] - (charIndex - currentLine.length);
            if (boundaryInLine > 0 && boundaryInLine < currentLine.length) {
              breakPoint = boundaryInLine;
              break;
            }
          }

          // If no good break point, just break at current position
          if (breakPoint === currentLine.length || breakPoint <= 0) {
            lines.push(currentLine);
            lineBreaks.push(lineStartIndex + currentLine.length);
            currentLine = char;
            currentLineWidth = charWidth;
            lineStartIndex = charIndex;
            prevChar = '';
          } else {
            // Break at word boundary
            const beforeBreak = currentLine.slice(0, breakPoint);
            const afterBreak = currentLine.slice(breakPoint);
            lines.push(beforeBreak.trimEnd());
            lineBreaks.push(lineStartIndex + breakPoint);
            currentLine = afterBreak + char;
            currentLineWidth = 0;
            prevChar = '';
            // Recalculate width of carried over text with kerning
            for (let k = 0; k < currentLine.length; k++) {
              const c = currentLine[k];
              currentLineWidth += getCharWidth(c, fontSize, metrics, isBold);
              if (k > 0) {
                currentLineWidth += getKerningAdjustment(currentLine[k-1], c, fontSize, metrics);
              }
              currentLineWidth += letterSpacing;
            }
            if (currentLine.length > 0) {
              prevChar = currentLine[currentLine.length - 1];
            }
            lineStartIndex = charIndex - afterBreak.length;
          }
        } else {
          currentLine += char;
          currentLineWidth += charWidth;
          prevChar = char;
        }

        charIndex++;
      }

      // Add remaining text as final line of paragraph
      if (currentLine.length > 0) {
        lines.push(currentLine);
        lineBreaks.push(charIndex);
      }

      charIndex++; // Account for newline between paragraphs
    }

    // Calculate total dimensions
    const lineCount = Math.max(1, lines.length);
    const height = lineCount * lineHeightPx;

    // Calculate max line width with kerning
    let maxWidth = 0;
    for (const line of lines) {
      let lineWidth = 0;
      let prevLineChar = '';
      for (const char of line) {
        lineWidth += getCharWidth(char, fontSize, metrics, isBold);
        lineWidth += getKerningAdjustment(prevLineChar, char, fontSize, metrics);
        lineWidth += letterSpacing;
        prevLineChar = char;
      }
      maxWidth = Math.max(maxWidth, lineWidth);
    }

    return {
      width: Math.min(maxWidth, containerWidth),
      height,
      lineCount,
      lineBreaks,
    };
  }
}

// =============================================================================
// SINGLETON AND UTILITY FUNCTIONS
// =============================================================================

let textMeasurerInstance: TextMeasurer | null = null;

/**
 * Get the global text measurer instance
 */
export function getTextMeasurer(): TextMeasurer {
  if (!textMeasurerInstance) {
    textMeasurerInstance = new EstimatingTextMeasurer();
  }
  return textMeasurerInstance;
}

/**
 * Set a custom text measurer (for testing or advanced use cases)
 */
export function setTextMeasurer(measurer: TextMeasurer): void {
  textMeasurerInstance = measurer;
}

/**
 * Reset the text measurer to default
 */
export function resetTextMeasurer(): void {
  textMeasurerInstance = null;
}

/**
 * Quick estimate of text height without full measurement
 */
export function estimateTextHeight(
  text: string,
  containerWidth: number,
  style: TextStyle = {}
): number {
  const measurer = getTextMeasurer();
  const measurement = measurer.measureText(text, style, containerWidth);
  return measurement.height;
}

/**
 * Quick estimate of text width without wrapping
 */
export function estimateTextWidth(
  text: string,
  style: TextStyle = {}
): number {
  const fontSize = style.fontSize || 16;
  const fontFamily = style.fontFamily || 'Arial';
  const letterSpacing = style.letterSpacing || 0;
  const isBold = isBoldWeight(style.fontWeight);

  const metrics = getFontMetrics(fontFamily);

  let width = 0;
  let prevChar = '';
  for (const char of text) {
    width += getCharWidth(char, fontSize, metrics, isBold);
    width += getKerningAdjustment(prevChar, char, fontSize, metrics);
    width += letterSpacing;
    prevChar = char;
  }

  return width;
}

/**
 * Get supported font families
 */
export function getSupportedFonts(): string[] {
  return Object.keys(FONT_METRICS).filter(k => k !== 'default');
}

/**
 * Check if a font has detailed metrics
 */
export function hasDetailedMetrics(fontFamily: string): boolean {
  const metrics = getFontMetrics(fontFamily);
  return Object.keys(metrics.charWidths).length > 50;
}
