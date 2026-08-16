/**
 * CSS Inline Style Resolver (Pro only)
 *
 * Parses CSS inline style attributes into resolved properties
 * that can be applied to StructuredDocument elements.
 *
 * No React, no DOM, no browser APIs.
 */

import { cssColorToDocx } from '../styles/colors.js';
import { cssSizeToTwips, cssFontSizeToHalfPoints, lineHeightToDocx } from '../utils/units.js';

// =============================================================================
// TYPES
// =============================================================================

export interface CssResolvedProperties {
  // Run-level
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;           // CSS hex format #RRGGBB
  fontSize?: number;        // points
  fontFamily?: string;
  highlight?: string;       // CSS hex format #RRGGBB
  // Paragraph-level
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  marginLeft?: number;      // twips
  spaceBefore?: number;     // twips
  spaceAfter?: number;      // twips
  lineSpacing?: number;     // OOXML line spacing
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Parse a CSS inline style attribute string into resolved properties.
 */
export function parseCssProperties(styleAttr: string): CssResolvedProperties {
  const props = parseCssString(styleAttr);
  const result: CssResolvedProperties = {};

  // Font weight
  const fontWeight = props.get('font-weight');
  if (fontWeight) {
    const numeric = parseInt(fontWeight, 10);
    if (fontWeight === 'bold' || fontWeight === 'bolder' || (!isNaN(numeric) && numeric >= 700)) {
      result.bold = true;
    } else if (fontWeight === 'normal' || (!isNaN(numeric) && numeric < 700)) {
      result.bold = false;
    }
  }

  // Font style
  const fontStyle = props.get('font-style');
  if (fontStyle === 'italic' || fontStyle === 'oblique') {
    result.italic = true;
  } else if (fontStyle === 'normal') {
    result.italic = false;
  }

  // Text decoration
  const textDecoration = props.get('text-decoration') ?? props.get('text-decoration-line');
  if (textDecoration) {
    const lower = textDecoration.toLowerCase();
    if (lower.includes('underline')) {
      result.underline = true;
    }
    if (lower.includes('line-through')) {
      result.strikethrough = true;
    }
    if (lower === 'none') {
      result.underline = false;
      result.strikethrough = false;
    }
  }

  // Color
  const color = props.get('color');
  if (color) {
    const hex = cssColorToHex(color);
    if (hex) result.color = hex;
  }

  // Background color
  const bgColor = props.get('background-color') ?? props.get('background');
  if (bgColor) {
    // background shorthand can contain more than just color, but we only extract color
    const hex = cssColorToHex(bgColor);
    if (hex) result.highlight = hex;
  }

  // Font size
  const fontSize = props.get('font-size');
  if (fontSize) {
    const halfPoints = cssFontSizeToHalfPoints(fontSize);
    result.fontSize = halfPoints / 2; // Convert half-points to points
  }

  // Font family
  const fontFamily = props.get('font-family');
  if (fontFamily) {
    result.fontFamily = parseFontFamily(fontFamily);
  }

  // Text align
  const textAlign = props.get('text-align');
  if (textAlign) {
    const lower = textAlign.toLowerCase() as 'left' | 'center' | 'right' | 'justify';
    if (['left', 'center', 'right', 'justify'].includes(lower)) {
      result.textAlign = lower;
    }
  }

  // Margin left
  const marginLeft = props.get('margin-left') ?? props.get('padding-left');
  if (marginLeft) {
    const twips = cssSizeToTwips(marginLeft);
    if (twips > 0) result.marginLeft = twips;
  }

  // Space before (margin-top)
  const marginTop = props.get('margin-top');
  if (marginTop) {
    const twips = cssSizeToTwips(marginTop);
    if (twips > 0) result.spaceBefore = twips;
  }

  // Space after (margin-bottom)
  const marginBottom = props.get('margin-bottom');
  if (marginBottom) {
    const twips = cssSizeToTwips(marginBottom);
    if (twips > 0) result.spaceAfter = twips;
  }

  // Line height
  const lineHeight = props.get('line-height');
  if (lineHeight) {
    const multiplier = parseLineHeight(lineHeight);
    if (multiplier > 0) {
      result.lineSpacing = lineHeightToDocx(multiplier);
    }
  }

  return result;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse a CSS inline style string into key-value pairs.
 */
function parseCssString(css: string): Map<string, string> {
  const props = new Map<string, string>();
  for (const decl of css.split(';')) {
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const key = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (key && value) props.set(key, value);
  }
  return props;
}

/**
 * Convert a CSS color to hex format with # prefix.
 * Uses cssColorToDocx (which returns OOXML format without #) and adds the prefix.
 */
function cssColorToHex(color: string): string | undefined {
  const docxColor = cssColorToDocx(color);
  return docxColor ? `#${docxColor}` : undefined;
}

/**
 * Parse a font-family value, returning the first family name with quotes stripped.
 */
function parseFontFamily(value: string): string {
  // Split on comma, take first
  const first = value.split(',')[0].trim();
  // Strip surrounding quotes (single or double)
  return first.replace(/^["']|["']$/g, '');
}

/**
 * Parse a CSS line-height value into a numeric multiplier.
 */
function parseLineHeight(value: string): number {
  const trimmed = value.trim().toLowerCase();

  // Pure number (multiplier)
  if (/^[\d.]+$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Percentage
  if (trimmed.endsWith('%')) {
    return parseFloat(trimmed) / 100;
  }

  // px — convert to approximate multiplier assuming 16px base
  if (trimmed.endsWith('px')) {
    const px = parseFloat(trimmed);
    return px / 16;
  }

  // pt — convert to approximate multiplier assuming 12pt base
  if (trimmed.endsWith('pt')) {
    const pt = parseFloat(trimmed);
    return pt / 12;
  }

  // em/rem
  if (trimmed.endsWith('em') || trimmed.endsWith('rem')) {
    return parseFloat(trimmed);
  }

  // normal keyword
  if (trimmed === 'normal') {
    return 1.15;
  }

  return 0;
}
