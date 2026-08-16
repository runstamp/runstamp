/**
 * Unit conversion utilities for DOCX generation.
 *
 * DOCX uses several different unit systems:
 * - Twips (twentieths of a point): 1 inch = 1440 twips
 * - Half-points: Used for font sizes
 * - EMUs (English Metric Units): Used for images (914400 EMUs = 1 inch)
 * - DXA: Used for table widths (same as twips)
 *
 * # Branded output types (Phase 1.1)
 *
 * Every conversion function returns a **branded number** — a nominal
 * type that carries its unit in its type. Branded numbers are still
 * assignable to plain `number`, so legacy callers that store results
 * in `number` variables keep working without change. Consumers that
 * opt into branded parameter types (e.g. `Twips` instead of `number`)
 * get compile-time protection against unit confusion:
 *
 *   function writeWidth(w: Twips) { ... }
 *   writeWidth(pointsToHalfPoints(12));   // TYPE ERROR — HalfPoints ≠ Twips
 *   writeWidth(pxToTwips(800));           // OK
 *
 * Escape hatches: use `asTwips`, `asHalfPoints`, etc. when you are
 * passing a value that is *known* to already be in the target unit
 * (e.g. reading from an OOXML XML attribute). Document the reason.
 */

// =============================================================================
// BRANDED UNIT TYPES
// =============================================================================

declare const __unitBrand: unique symbol;

export type Twips = number & { readonly [__unitBrand]: 'twips' };
export type HalfPoints = number & { readonly [__unitBrand]: 'halfpoints' };
export type EMU = number & { readonly [__unitBrand]: 'emu' };
export type Points = number & { readonly [__unitBrand]: 'points' };
export type Px = number & { readonly [__unitBrand]: 'px' };
export type Inches = number & { readonly [__unitBrand]: 'inches' };
export type Mm = number & { readonly [__unitBrand]: 'mm' };
export type LineSpacingDxa = number & { readonly [__unitBrand]: 'line-dxa' };

/** Escape hatches — use when you already know the unit of a raw number. */
export const asTwips = (n: number): Twips => n as Twips;
export const asHalfPoints = (n: number): HalfPoints => n as HalfPoints;
export const asEmu = (n: number): EMU => n as EMU;
export const asPoints = (n: number): Points => n as Points;
export const asPx = (n: number): Px => n as Px;
export const asInches = (n: number): Inches => n as Inches;
export const asMm = (n: number): Mm => n as Mm;
export const asLineSpacingDxa = (n: number): LineSpacingDxa => n as LineSpacingDxa;

// =============================================================================
// CONSTANTS
// =============================================================================

export const DPI = 96; // CSS pixels per inch
export const TWIPS_PER_INCH = 1440;
export const TWIPS_PER_POINT = 20;
export const EMU_PER_INCH = 914400;
export const EMU_PER_PIXEL = 9525; // At 96 DPI

/**
 * Page size presets in twips.
 */
export const PAGE_SIZES = {
  LETTER: { width: asTwips(12240), height: asTwips(15840) }, // 8.5" x 11"
  A4: { width: asTwips(11906), height: asTwips(16838) }, // 210mm x 297mm
  LEGAL: { width: asTwips(12240), height: asTwips(20160) }, // 8.5" x 14"
  TABLOID: { width: asTwips(15840), height: asTwips(24480) }, // 11" x 17"
  A3: { width: asTwips(16838), height: asTwips(23811) }, // 297mm x 420mm
  A5: { width: asTwips(8391), height: asTwips(11906) }, // 148mm x 210mm
} as const;

// =============================================================================
// CONVERSIONS
// =============================================================================

/**
 * Convert CSS pixels to twips.
 */
export function pxToTwips(px: number): Twips {
  if (!px || isNaN(px)) return asTwips(0);
  return asTwips(Math.round((px / DPI) * TWIPS_PER_INCH));
}

export function twipsToPx(twips: number): Px {
  if (!twips || isNaN(twips)) return asPx(0);
  return asPx(Math.round((twips / TWIPS_PER_INCH) * DPI));
}

/**
 * Convert CSS pixels to points (for font sizes).
 */
export function pxToPoints(px: number): Points {
  if (!px || isNaN(px)) return asPoints(0);
  return asPoints(Math.round(px * 0.75)); // 1px = 0.75pt at 96 DPI
}

export function pointsToPx(pt: number): Px {
  if (!pt || isNaN(pt)) return asPx(0);
  return asPx(Math.round(pt / 0.75));
}

/**
 * Convert CSS pixels to half-points (DOCX font size unit).
 */
export function pxToHalfPoints(px: number): HalfPoints {
  if (!px || isNaN(px)) return asHalfPoints(0);
  return asHalfPoints(Math.round(px * 1.5)); // 1px = 0.75pt = 1.5 half-points
}

export function halfPointsToPx(hp: number): Px {
  if (!hp || isNaN(hp)) return asPx(0);
  return asPx(Math.round(hp / 1.5));
}

export function pointsToHalfPoints(pt: number): HalfPoints {
  if (!pt || isNaN(pt)) return asHalfPoints(0);
  return asHalfPoints(Math.round(pt * 2));
}

export function halfPointsToPoints(hp: number): Points {
  if (!hp || isNaN(hp)) return asPoints(0);
  return asPoints(hp / 2);
}

export function inchesToTwips(inches: number): Twips {
  if (!inches || isNaN(inches)) return asTwips(0);
  return asTwips(Math.round(inches * TWIPS_PER_INCH));
}

export function twipsToInches(twips: number): Inches {
  if (!twips || isNaN(twips)) return asInches(0);
  return asInches(twips / TWIPS_PER_INCH);
}

export function mmToTwips(mm: number): Twips {
  if (!mm || isNaN(mm)) return asTwips(0);
  // 1 inch = 25.4mm, so mm / 25.4 = inches
  return asTwips(Math.round((mm / 25.4) * TWIPS_PER_INCH));
}

export function twipsToMm(twips: number): Mm {
  if (!twips || isNaN(twips)) return asMm(0);
  return asMm((twips / TWIPS_PER_INCH) * 25.4);
}

export function pxToEmu(px: number): EMU {
  if (!px || isNaN(px)) return asEmu(0);
  return asEmu(Math.round(px * EMU_PER_PIXEL));
}

export function emuToPx(emu: number): Px {
  if (!emu || isNaN(emu)) return asPx(0);
  return asPx(Math.round(emu / EMU_PER_PIXEL));
}

export function inchesToEmu(inches: number): EMU {
  if (!inches || isNaN(inches)) return asEmu(0);
  return asEmu(Math.round(inches * EMU_PER_INCH));
}

/**
 * Convert line height multiplier to DOCX line spacing value (DXA-style).
 * DOCX line spacing 240 = single spacing (1.0)
 */
export function lineHeightToDocx(multiplier: number): LineSpacingDxa {
  if (!multiplier || isNaN(multiplier)) return asLineSpacingDxa(240); // Default single spacing
  return asLineSpacingDxa(Math.round(multiplier * 240));
}

/**
 * Parse a CSS size value and convert to twips.
 * Handles px, pt, em, rem, in, mm, cm units.
 */
export function cssSizeToTwips(value: string | number | undefined, baseFontSize = 16): Twips {
  if (value === undefined || value === null || value === '') return asTwips(0);

  // If already a number, assume pixels
  if (typeof value === 'number') {
    return pxToTwips(value);
  }

  const match = value.match(/^(-?[\d.]+)(px|pt|em|rem|in|mm|cm|%)?$/i);
  if (!match) return asTwips(0);

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'px').toLowerCase();

  switch (unit) {
    case 'px':
      return pxToTwips(num);
    case 'pt':
      return asTwips(Math.round(num * TWIPS_PER_POINT));
    case 'em':
    case 'rem':
      return pxToTwips(num * baseFontSize);
    case 'in':
      return inchesToTwips(num);
    case 'mm':
      return mmToTwips(num);
    case 'cm':
      return mmToTwips(num * 10);
    case '%':
      // Percentage — caller must handle. We return unbranded-looking number
      // via the Twips brand to keep the signature uniform; callers that
      // care about the % case should match on the unit themselves via
      // cssSizeKind() or similar. Keeping the legacy behaviour.
      return asTwips(num);
    default:
      return pxToTwips(num);
  }
}

/**
 * Parse a CSS font size value and convert to half-points.
 */
export function cssFontSizeToHalfPoints(value: string | number | undefined, baseFontSize = 16): HalfPoints {
  if (value === undefined || value === null || value === '') return asHalfPoints(24); // Default 12pt

  if (typeof value === 'number') {
    return pxToHalfPoints(value);
  }

  const match = value.match(/^(-?[\d.]+)(px|pt|em|rem)?$/i);
  if (!match) return asHalfPoints(24);

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'px').toLowerCase();

  switch (unit) {
    case 'px':
      return pxToHalfPoints(num);
    case 'pt':
      return pointsToHalfPoints(num);
    case 'em':
    case 'rem':
      return pxToHalfPoints(num * baseFontSize);
    default:
      return pxToHalfPoints(num);
  }
}
