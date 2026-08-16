/**
 * Detection utilities for identifying element types and patterns.
 *
 * Used for detecting code blocks, columns, table styles, etc.
 * from element properties and styles.
 */

/**
 * Extended style interface for detection (superset of ComputedStyle).
 * Allows additional CSS properties that may be available in browser extraction.
 */
interface ExtendedStyle {
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  display?: string;
  overflow?: string;
  textDecoration?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number | string;
  marginRight?: number | string;
  lineHeight?: number | string;
  // Extended properties (may not be in core ComputedStyle)
  whiteSpace?: string;
  columnCount?: number | string;
  float?: string;
  position?: string;
  textIndent?: number;
  [key: string]: unknown;
}

/**
 * Monospace font families commonly used for code.
 */
const MONOSPACE_FONTS = [
  'monospace',
  'consolas',
  'courier',
  'courier new',
  'monaco',
  'menlo',
  'dejavu sans mono',
  'liberation mono',
  'fira code',
  'source code pro',
  'jetbrains mono',
  'roboto mono',
  'inconsolata',
  'ubuntu mono',
  'droid sans mono',
  'sf mono',
  'hack',
  'anonymous pro',
];

/**
 * Check if a font family is monospace (typically used for code).
 */
export function isMonospaceFont(fontFamily: string | undefined): boolean {
  if (!fontFamily) return false;

  const normalized = fontFamily.toLowerCase();

  // Check each font in the stack
  const fonts = normalized.split(',').map((f) => f.trim().replace(/['"]/g, ''));

  return fonts.some((font) => MONOSPACE_FONTS.some((mono) => font.includes(mono)));
}

/**
 * Detect if an element is likely a code block.
 * Uses multiple heuristics: tag name, class names, font family.
 */
export function isCodeBlock(element: {
  tagName?: string;
  className?: string;
  style?: ExtendedStyle;
}): boolean {
  // Check tag name
  const tag = element.tagName?.toLowerCase();
  if (tag === 'pre' || tag === 'code') {
    return true;
  }

  // Check class names
  const className = element.className?.toLowerCase() || '';
  const codeClassPatterns = [
    'code',
    'pre',
    'syntax',
    'highlight',
    'prism',
    'hljs',
    'shiki',
    'codeblock',
    'code-block',
    'sourceCode',
    'source-code',
  ];
  if (codeClassPatterns.some((pattern) => className.includes(pattern))) {
    return true;
  }

  // Check font family
  if (element.style?.fontFamily && isMonospaceFont(element.style.fontFamily)) {
    // Also check for code-like styling (background, no word wrap)
    const hasCodeStyling =
      element.style.backgroundColor !== undefined ||
      element.style.whiteSpace === 'pre' ||
      element.style.whiteSpace === 'pre-wrap';
    if (hasCodeStyling) {
      return true;
    }
  }

  return false;
}

/**
 * Detect column count from CSS styles.
 * Returns number of columns (1 if not multi-column).
 */
export function detectColumnCount(style: ExtendedStyle | undefined): number {
  if (!style) return 1;

  // CSS columns property
  if (style.columnCount && typeof style.columnCount === 'number' && style.columnCount > 1) {
    return Math.min(style.columnCount, 4); // Max 4 columns
  }

  // Parse column-count from string
  if (typeof style.columnCount === 'string') {
    const count = parseInt(style.columnCount, 10);
    if (!isNaN(count) && count > 1) {
      return Math.min(count, 4);
    }
  }

  return 1;
}

/**
 * Table style detection result.
 */
export type TableStyleType = 'plain' | 'striped' | 'bordered' | 'modern' | 'minimal';

/**
 * Detect table style from visual characteristics.
 */
export function detectTableStyle(options: {
  hasHeaderBackground?: boolean;
  hasAlternatingRows?: boolean;
  hasVisibleBorders?: boolean;
  hasBoldHeader?: boolean;
  hasSubtleBorders?: boolean;
}): TableStyleType {
  const { hasHeaderBackground, hasAlternatingRows, hasVisibleBorders, hasBoldHeader, hasSubtleBorders } = options;

  // Striped: Header with background + alternating row colors
  if (hasHeaderBackground && hasAlternatingRows) {
    return 'striped';
  }

  // Bordered: Header + visible borders on all cells
  if (hasHeaderBackground && hasVisibleBorders) {
    return 'bordered';
  }

  // Modern: Header background, minimal borders
  if (hasHeaderBackground && hasSubtleBorders) {
    return 'modern';
  }

  // Minimal: Just bold header, no backgrounds
  if (hasBoldHeader && !hasHeaderBackground && !hasVisibleBorders) {
    return 'minimal';
  }

  // Plain: No special styling
  return 'plain';
}

/**
 * Check if a color is considered "dark" (for determining text color).
 * Uses relative luminance calculation.
 */
export function isDarkColor(hexColor: string): boolean {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  // Using sRGB formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  // Luminance < 0.5 is considered dark
  return luminance < 0.5;
}

/**
 * Check if an element should be treated as inline.
 */
export function isInlineElement(tagName: string | undefined): boolean {
  if (!tagName) return false;

  const inlineTags = [
    'span',
    'a',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'del',
    'ins',
    'mark',
    'small',
    'sub',
    'sup',
    'code',
    'kbd',
    'samp',
    'var',
    'abbr',
    'cite',
    'q',
    'dfn',
    'time',
    'bdi',
    'bdo',
    'wbr',
  ];

  return inlineTags.includes(tagName.toLowerCase());
}

/**
 * Check if a list type should use bullet points.
 */
export function isBulletList(listType: string | undefined): boolean {
  if (!listType) return true; // Default to bullet

  const bulletTypes = ['bullet', 'disc', 'circle', 'square', 'none'];
  return bulletTypes.includes(listType.toLowerCase());
}

/**
 * Check if a list type should use numbers.
 */
export function isNumberedList(listType: string | undefined): boolean {
  if (!listType) return false;

  const numberedTypes = ['decimal', 'number', 'numbered', '1', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'];
  return numberedTypes.includes(listType.toLowerCase());
}

/**
 * Detect if content appears to be a heading based on styling.
 * Useful when semantic heading tags aren't used.
 */
export function looksLikeHeading(style: ExtendedStyle | undefined): boolean {
  if (!style) return false;

  // Large font size (>= 18pt / 24px)
  const fontSize = style.fontSize;
  if (fontSize && fontSize >= 24) {
    return true;
  }

  // Bold with larger font
  const isBold = style.fontWeight === 'bold' || (typeof style.fontWeight === 'number' && style.fontWeight >= 700);
  if (isBold && fontSize && fontSize >= 18) {
    return true;
  }

  return false;
}

/**
 * Detect if an image appears to be floating/wrapped.
 */
export function isFloatingImage(style: ExtendedStyle | undefined): boolean {
  if (!style) return false;

  // CSS float
  if (style.float === 'left' || style.float === 'right') {
    return true;
  }

  // Absolute/fixed positioning often indicates floating
  if (style.position === 'absolute' || style.position === 'fixed') {
    return true;
  }

  return false;
}

/**
 * Detect image alignment from styles.
 */
export function detectImageAlignment(style: ExtendedStyle | undefined): 'left' | 'center' | 'right' {
  if (!style) return 'left';

  // Float takes precedence
  if (style.float === 'right') return 'right';
  if (style.float === 'left') return 'left';

  // Check margins for centering
  if (style.marginLeft === 'auto' && style.marginRight === 'auto') {
    return 'center';
  }

  // Text align on parent
  if (style.textAlign === 'center') return 'center';
  if (style.textAlign === 'right') return 'right';

  return 'left';
}
