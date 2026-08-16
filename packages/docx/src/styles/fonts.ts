/**
 * Font mapping utilities for DOCX.
 *
 * Maps CSS font families to Word-compatible fonts.
 * Word may not have all CSS fonts, so we map to closest equivalents.
 */

/**
 * CSS font family to Word font mapping.
 * Maps common web fonts to their Word equivalents.
 */
const FONT_MAPPING: Record<string, string> = {
  // Sans-serif fonts
  arial: 'Arial',
  helvetica: 'Arial',
  'helvetica neue': 'Arial',
  'sans-serif': 'Calibri',
  system: 'Calibri',
  '-apple-system': 'Calibri',
  'blinkmacsystemfont': 'Calibri',
  'segoe ui': 'Segoe UI',
  roboto: 'Segoe UI',
  'open sans': 'Calibri',
  lato: 'Calibri',
  montserrat: 'Calibri',
  poppins: 'Calibri',
  inter: 'Calibri',
  nunito: 'Calibri',
  raleway: 'Calibri',
  ubuntu: 'Segoe UI',
  'source sans pro': 'Calibri',
  'noto sans': 'Calibri',
  'fira sans': 'Calibri',
  'work sans': 'Calibri',
  oswald: 'Arial Narrow',
  'pt sans': 'Calibri',
  verdana: 'Verdana',
  tahoma: 'Tahoma',
  trebuchet: 'Trebuchet MS',
  'trebuchet ms': 'Trebuchet MS',
  'lucida grande': 'Lucida Sans',
  'lucida sans': 'Lucida Sans',
  'franklin gothic': 'Franklin Gothic Medium',
  'century gothic': 'Century Gothic',

  // Serif fonts
  'times new roman': 'Times New Roman',
  times: 'Times New Roman',
  serif: 'Cambria',
  georgia: 'Georgia',
  palatino: 'Palatino Linotype',
  'palatino linotype': 'Palatino Linotype',
  'book antiqua': 'Book Antiqua',
  garamond: 'Garamond',
  'eb garamond': 'Garamond',
  'cormorant garamond': 'Garamond',
  'libre baskerville': 'Georgia',
  merriweather: 'Georgia',
  playfair: 'Georgia',
  'playfair display': 'Georgia',
  lora: 'Georgia',
  'pt serif': 'Georgia',
  'source serif pro': 'Georgia',
  'noto serif': 'Georgia',
  crimson: 'Georgia',
  'crimson text': 'Georgia',
  baskerville: 'Baskerville Old Face',
  'libre caslon': 'Georgia',
  spectral: 'Georgia',
  cambria: 'Cambria',
  constantia: 'Constantia',
  'bodoni mt': 'Bodoni MT',
  bodoni: 'Bodoni MT',
  didot: 'Didot',
  rockwell: 'Rockwell',

  // Monospace fonts
  monospace: 'Consolas',
  consolas: 'Consolas',
  'courier new': 'Courier New',
  courier: 'Courier New',
  monaco: 'Consolas',
  menlo: 'Consolas',
  'lucida console': 'Lucida Console',
  'dejavu sans mono': 'Consolas',
  'liberation mono': 'Consolas',
  'fira code': 'Consolas',
  'source code pro': 'Consolas',
  'jetbrains mono': 'Consolas',
  'roboto mono': 'Consolas',
  inconsolata: 'Consolas',
  'ubuntu mono': 'Consolas',
  'droid sans mono': 'Consolas',
  'sf mono': 'Consolas',
  hack: 'Consolas',
  'anonymous pro': 'Consolas',

  // Display/Script fonts
  'comic sans': 'Comic Sans MS',
  'comic sans ms': 'Comic Sans MS',
  impact: 'Impact',
  'brush script': 'Brush Script MT',
  'brush script mt': 'Brush Script MT',
  lucida: 'Lucida Handwriting',
  'lucida handwriting': 'Lucida Handwriting',
  cursive: 'Lucida Handwriting',
  fantasy: 'Impact',
  papyrus: 'Papyrus',
  'lobster': 'Lucida Handwriting',
  'dancing script': 'Lucida Handwriting',
  pacifico: 'Lucida Handwriting',

  // Fallbacks
  'ui-sans-serif': 'Calibri',
  'ui-serif': 'Cambria',
  'ui-monospace': 'Consolas',
  'ui-rounded': 'Calibri',
};

/**
 * Default fonts for different categories.
 */
export const DEFAULT_FONTS = {
  sansSerif: 'Calibri',
  serif: 'Cambria',
  monospace: 'Consolas',
  body: 'Calibri',
  heading: 'Calibri Light',
  code: 'Consolas',
} as const;

/**
 * Map a CSS font family to a Word-compatible font.
 * Handles font stacks by finding the first mapped font.
 *
 * @param cssFont - CSS font-family value (may be a comma-separated stack)
 * @param fallback - Fallback font if no mapping found
 * @returns Word-compatible font name
 */
export function mapFontFamily(cssFont: string | undefined, fallback = 'Calibri'): string {
  if (!cssFont) return fallback;

  // Split font stack and try each font
  const fonts = cssFont.split(',').map((f) => f.trim().replace(/['"]/g, '').toLowerCase());

  for (const font of fonts) {
    // Check exact match first
    if (FONT_MAPPING[font]) {
      return FONT_MAPPING[font];
    }

    // Check partial match (for fonts with suffixes like "Bold" or "Regular")
    const baseName = font.split(/\s+/)[0];
    if (FONT_MAPPING[baseName]) {
      return FONT_MAPPING[baseName];
    }
  }

  // Check generic font families
  for (const font of fonts) {
    if (font.includes('sans-serif') || font.includes('sans')) {
      return DEFAULT_FONTS.sansSerif;
    }
    if (font.includes('serif')) {
      return DEFAULT_FONTS.serif;
    }
    if (font.includes('mono') || font.includes('code') || font.includes('consola')) {
      return DEFAULT_FONTS.monospace;
    }
  }

  // Return the first font in the stack if it looks like a real font name
  // (starts with uppercase letter, no special characters except space)
  const firstFont = cssFont.split(',')[0].trim().replace(/['"]/g, '');
  if (/^[A-Z][a-zA-Z\s]+$/.test(firstFont)) {
    return firstFont; // Return as-is, might be a system font
  }

  return fallback;
}

/**
 * Check if a font family is monospace.
 */
export function isMonospaceFont(fontFamily: string | undefined): boolean {
  if (!fontFamily) return false;

  const normalized = fontFamily.toLowerCase();
  const fonts = normalized.split(',').map((f) => f.trim().replace(/['"]/g, ''));

  const monoPatterns = ['mono', 'consola', 'courier', 'code', 'terminal', 'menlo', 'monaco'];

  return fonts.some((font) => monoPatterns.some((pattern) => font.includes(pattern)));
}

/**
 * Check if a font family is serif.
 */
export function isSerifFont(fontFamily: string | undefined): boolean {
  if (!fontFamily) return false;

  const normalized = fontFamily.toLowerCase();
  const fonts = normalized.split(',').map((f) => f.trim().replace(/['"]/g, ''));

  const serifPatterns = [
    'times',
    'georgia',
    'garamond',
    'palatino',
    'baskerville',
    'cambria',
    'serif',
    'book',
    'didot',
    'bodoni',
    'rockwell',
  ];

  // Must include 'serif' but not 'sans-serif'
  for (const font of fonts) {
    if (font === 'serif') return true;
    if (font.includes('sans')) continue; // Skip sans-serif
    if (serifPatterns.some((pattern) => font.includes(pattern))) {
      return true;
    }
  }

  return false;
}

/**
 * Get the appropriate font for a heading level.
 * Uses lighter weight for larger headings.
 */
export function getHeadingFont(level: number, baseFont = 'Calibri'): string {
  // Use Calibri Light for H1 and H2
  if (level <= 2 && baseFont.toLowerCase().includes('calibri')) {
    return 'Calibri Light';
  }
  return baseFont;
}

/**
 * Parse font weight from CSS value.
 * Returns a number (100-900) or undefined if invalid.
 */
export function parseFontWeight(weight: string | number | undefined): number | undefined {
  if (weight === undefined || weight === null) return undefined;

  if (typeof weight === 'number') {
    return weight >= 100 && weight <= 900 ? weight : undefined;
  }

  const str = weight.toLowerCase().trim();

  // Named weights
  const namedWeights: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    'extra-light': 200,
    ultralight: 200,
    'ultra-light': 200,
    light: 300,
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    'semi-bold': 600,
    demibold: 600,
    'demi-bold': 600,
    bold: 700,
    extrabold: 800,
    'extra-bold': 800,
    ultrabold: 800,
    'ultra-bold': 800,
    black: 900,
    heavy: 900,
  };

  if (namedWeights[str]) {
    return namedWeights[str];
  }

  // Numeric weight
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 100 && num <= 900) {
    return num;
  }

  return undefined;
}

/**
 * Check if a font weight indicates bold.
 */
export function isBoldWeight(weight: string | number | undefined): boolean {
  const parsed = parseFontWeight(weight);
  return parsed !== undefined && parsed >= 700;
}
