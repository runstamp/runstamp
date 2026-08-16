/**
 * Color conversion utilities for DOCX.
 *
 * DOCX uses 6-digit hex colors without the # prefix.
 * This module handles conversion from CSS colors.
 */

/**
 * Extended named CSS colors mapped to hex values.
 */
const NAMED_COLORS: Record<string, string> = {
  // Basic colors
  white: 'FFFFFF',
  black: '000000',
  red: 'FF0000',
  green: '008000',
  blue: '0000FF',
  yellow: 'FFFF00',
  cyan: '00FFFF',
  magenta: 'FF00FF',

  // Grays
  gray: '808080',
  grey: '808080',
  silver: 'C0C0C0',
  darkgray: 'A9A9A9',
  darkgrey: 'A9A9A9',
  dimgray: '696969',
  dimgrey: '696969',
  lightgray: 'D3D3D3',
  lightgrey: 'D3D3D3',
  gainsboro: 'DCDCDC',
  whitesmoke: 'F5F5F5',

  // Browns
  brown: 'A52A2A',
  maroon: '800000',
  sienna: 'A0522D',
  chocolate: 'D2691E',
  peru: 'CD853F',
  tan: 'D2B48C',
  wheat: 'F5DEB3',
  beige: 'F5F5DC',

  // Oranges
  orange: 'FFA500',
  darkorange: 'FF8C00',
  coral: 'FF7F50',
  tomato: 'FF6347',
  orangered: 'FF4500',

  // Yellows
  gold: 'FFD700',
  khaki: 'F0E68C',
  lemonchiffon: 'FFFACD',
  lightyellow: 'FFFFE0',
  moccasin: 'FFE4B5',
  palegoldenrod: 'EEE8AA',

  // Greens
  lime: '00FF00',
  limegreen: '32CD32',
  forestgreen: '228B22',
  darkgreen: '006400',
  olive: '808000',
  olivedrab: '6B8E23',
  seagreen: '2E8B57',
  mediumseagreen: '3CB371',
  springgreen: '00FF7F',
  palegreen: '98FB98',
  lightgreen: '90EE90',
  darkseagreen: '8FBC8F',
  yellowgreen: '9ACD32',
  greenyellow: 'ADFF2F',
  chartreuse: '7FFF00',
  lawngreen: '7CFC00',

  // Blues
  navy: '000080',
  darkblue: '00008B',
  mediumblue: '0000CD',
  royalblue: '4169E1',
  dodgerblue: '1E90FF',
  deepskyblue: '00BFFF',
  cornflowerblue: '6495ED',
  steelblue: '4682B4',
  cadetblue: '5F9EA0',
  skyblue: '87CEEB',
  lightskyblue: '87CEFA',
  lightblue: 'ADD8E6',
  powderblue: 'B0E0E6',
  lightsteelblue: 'B0C4DE',
  slategray: '708090',
  slategrey: '708090',
  lightslategray: '778899',
  lightslategrey: '778899',

  // Teals/Cyans
  teal: '008080',
  darkcyan: '008B8B',
  aqua: '00FFFF',
  aquamarine: '7FFFD4',
  turquoise: '40E0D0',
  mediumturquoise: '48D1CC',
  darkturquoise: '00CED1',
  paleturquoise: 'AFEEEE',
  lightcyan: 'E0FFFF',

  // Purples
  purple: '800080',
  darkviolet: '9400D3',
  darkorchid: '9932CC',
  darkmagenta: '8B008B',
  blueviolet: '8A2BE2',
  indigo: '4B0082',
  mediumpurple: '9370DB',
  mediumorchid: 'BA55D3',
  orchid: 'DA70D6',
  violet: 'EE82EE',
  plum: 'DDA0DD',
  thistle: 'D8BFD8',
  lavender: 'E6E6FA',
  fuchsia: 'FF00FF',
  hotpink: 'FF69B4',
  deeppink: 'FF1493',
  mediumvioletred: 'C71585',
  palevioletred: 'DB7093',

  // Pinks
  pink: 'FFC0CB',
  lightpink: 'FFB6C1',
  mistyrose: 'FFE4E1',
  lavenderblush: 'FFF0F5',

  // Reds
  crimson: 'DC143C',
  firebrick: 'B22222',
  darkred: '8B0000',
  indianred: 'CD5C5C',
  lightcoral: 'F08080',
  salmon: 'FA8072',
  darksalmon: 'E9967A',
  lightsalmon: 'FFA07A',

  // Special
  transparent: '',
  inherit: '',
  initial: '',
  currentcolor: '',
};

/**
 * Check if a CSS color is transparent.
 */
export function isTransparentColor(color: string | undefined): boolean {
  if (!color) return true;

  const normalized = color.toLowerCase().trim();

  // Explicit transparent keyword
  if (normalized === 'transparent') return true;

  // Empty or inherit
  if (normalized === '' || normalized === 'inherit' || normalized === 'initial') return true;

  // RGBA with alpha = 0
  const rgbaMatch = normalized.match(/rgba?\s*\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    const alpha = parseFloat(rgbaMatch[1]);
    if (alpha === 0) return true;
  }

  // HSLA with alpha = 0
  const hslaMatch = normalized.match(/hsla?\s*\(\s*[\d.]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+\s*,\s*([\d.]+)\s*\)/);
  if (hslaMatch) {
    const alpha = parseFloat(hslaMatch[1]);
    if (alpha === 0) return true;
  }

  // 8-digit hex with alpha = 00
  if (normalized.startsWith('#') && normalized.length === 9) {
    const alpha = normalized.slice(7, 9).toLowerCase();
    if (alpha === '00') return true;
  }

  // 4-digit hex with alpha = 0
  if (normalized.startsWith('#') && normalized.length === 5) {
    const alpha = normalized[4].toLowerCase();
    if (alpha === '0') return true;
  }

  return false;
}

/**
 * Convert CSS color to DOCX color format (6-digit hex without #).
 * Returns undefined for transparent colors.
 */
export function cssColorToDocx(color: string | undefined): string | undefined {
  if (!color) return undefined;

  // Check for transparency first
  if (isTransparentColor(color)) return undefined;

  const normalized = color.toLowerCase().trim();

  // Already 6-digit hex without #
  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  // Hex with #
  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      // Convert #RGB to RRGGBB
      return (hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]).toUpperCase();
    }
    if (hex.length === 6) {
      return hex.toUpperCase();
    }
    if (hex.length === 8) {
      // RGBA hex - return RGB portion
      return hex.slice(0, 6).toUpperCase();
    }
    if (hex.length === 4) {
      // RGBA short hex - expand RGB portion
      return (hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]).toUpperCase();
    }
  }

  // RGB/RGBA
  const rgbMatch = normalized.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1])).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgbMatch[2])).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgbMatch[3])).toString(16).padStart(2, '0');
    return (r + g + b).toUpperCase();
  }

  // HSL/HSLA
  const hslMatch = normalized.match(/hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const rgb = hslToRgb(h, s, l);
    const r = rgb[0].toString(16).padStart(2, '0');
    const g = rgb[1].toString(16).padStart(2, '0');
    const b = rgb[2].toString(16).padStart(2, '0');
    return (r + g + b).toUpperCase();
  }

  // Named colors
  if (NAMED_COLORS[normalized]) {
    const hex = NAMED_COLORS[normalized];
    return hex || undefined; // Empty string means transparent
  }

  // Unknown color - return undefined
  return undefined;
}

/**
 * Convert HSL to RGB.
 * @param h - Hue (0-1)
 * @param s - Saturation (0-1)
 * @param l - Lightness (0-1)
 * @returns [r, g, b] values (0-255)
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Get shading object from a CSS background color.
 * Returns undefined if the color is transparent or invalid.
 */
export function getShadingFromColor(
  cssColor: string | undefined
): { fill: string; type: 'solid' } | undefined {
  if (!cssColor) return undefined;
  const docxColor = cssColorToDocx(cssColor);
  if (!docxColor) return undefined;
  return { fill: docxColor, type: 'solid' };
}

/**
 * Get a contrasting text color (black or white) for a background.
 */
export function getContrastingTextColor(backgroundColor: string | undefined): string {
  if (!backgroundColor) return '000000';

  const docxColor = cssColorToDocx(backgroundColor);
  if (!docxColor) return '000000';

  // Parse RGB values
  const r = parseInt(docxColor.substring(0, 2), 16);
  const g = parseInt(docxColor.substring(2, 4), 16);
  const b = parseInt(docxColor.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  // Return white for dark backgrounds, black for light
  return luminance < 0.5 ? 'FFFFFF' : '000000';
}

/**
 * Lighten a color by a percentage.
 * @param color - Hex color (with or without #)
 * @param percent - Percentage to lighten (0-100)
 */
export function lightenColor(color: string, percent: number): string {
  const docxColor = cssColorToDocx(color);
  if (!docxColor) return 'FFFFFF';

  const r = parseInt(docxColor.substring(0, 2), 16);
  const g = parseInt(docxColor.substring(2, 4), 16);
  const b = parseInt(docxColor.substring(4, 6), 16);

  const factor = percent / 100;
  const newR = Math.min(255, Math.round(r + (255 - r) * factor));
  const newG = Math.min(255, Math.round(g + (255 - g) * factor));
  const newB = Math.min(255, Math.round(b + (255 - b) * factor));

  return newR.toString(16).padStart(2, '0').toUpperCase() +
         newG.toString(16).padStart(2, '0').toUpperCase() +
         newB.toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Darken a color by a percentage.
 * @param color - Hex color (with or without #)
 * @param percent - Percentage to darken (0-100)
 */
export function darkenColor(color: string, percent: number): string {
  const docxColor = cssColorToDocx(color);
  if (!docxColor) return '000000';

  const r = parseInt(docxColor.substring(0, 2), 16);
  const g = parseInt(docxColor.substring(2, 4), 16);
  const b = parseInt(docxColor.substring(4, 6), 16);

  const factor = 1 - percent / 100;
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  return newR.toString(16).padStart(2, '0').toUpperCase() +
         newG.toString(16).padStart(2, '0').toUpperCase() +
         newB.toString(16).padStart(2, '0').toUpperCase();
}
