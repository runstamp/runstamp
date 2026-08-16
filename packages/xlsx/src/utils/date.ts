import { formatNumberForCell } from "./xml.js";

/**
 * Excel epoch: Dec 30, 1899 in UTC.
 * This is the traditional epoch used by Excel serialization libraries.
 * With this epoch, raw = (date - epoch) / ms_per_day gives correct serials
 * for dates on or after Mar 1, 1900 (because the Lotus bug +1 is baked in).
 * For dates Jan 1 - Feb 28, 1900, the raw is off by +1 and must be corrected.
 */
export const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
export const EXCEL_1904_EPOCH_UTC = Date.UTC(1904, 0, 1);
export const MIN_EXCEL_SUPPORTED_DATE_UTC = Date.UTC(1899, 11, 31);
export type ExcelDateSystem = "1900" | "1904";

/**
 * The serial number boundary for the Lotus 1-2-3 leap year bug.
 * Excel treats 1900 as a leap year (it isn't). Serial 60 = Feb 29, 1900
 * (a date that never existed). Using epoch Dec 30, 1899:
 *
 * - Raw serials 1..60 correspond to Dec 31, 1899 through Feb 28, 1900,
 *   but Excel expects serials 0..59 for those dates, so we subtract 1.
 * - Raw serial 61+ corresponds to Mar 1, 1900 onward, and the Lotus +1 is
 *   already baked in by the epoch choice, so no adjustment needed.
 * - Raw serial <= 0 (before Dec 31, 1899) needs no adjustment.
 */
const LOTUS_RAW_THRESHOLD = 61;

export function isSupportedExcelDate(value: Date): boolean {
  return !Number.isNaN(value.getTime()) && value.getTime() >= MIN_EXCEL_SUPPORTED_DATE_UTC;
}

export function assertSupportedExcelDate(value: Date): void {
  if (!isSupportedExcelDate(value)) {
    const received = Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
    throw new RangeError(
      `Spreadsheet dates must be on or after 1899-12-31T00:00:00.000Z. Received ${received}.`,
    );
  }
}

/**
 * Convert a JS Date to an Excel date serial number, accounting for the
 * Lotus 1-2-3 leap year bug.
 */
export function dateToSerial(value: Date, dateSystem: ExcelDateSystem = "1900"): number {
  assertSupportedExcelDate(value);
  if (dateSystem === "1904") {
    return (value.getTime() - EXCEL_1904_EPOCH_UTC) / 86_400_000;
  }
  const raw = (value.getTime() - EXCEL_EPOCH_UTC) / 86_400_000;
  // Raw values 1..60 map to Excel serials 0..59 (pre-Lotus-bug dates)
  // Raw values >= 61 are already correct (Lotus bug offset baked in by epoch)
  // Raw values <= 0 need no adjustment
  if (raw >= 1 && raw < LOTUS_RAW_THRESHOLD) {
    return raw - 1;
  }
  return raw;
}

/**
 * Convert a JS Date to a string suitable for an Excel cell value element,
 * accounting for the Lotus 1-2-3 leap year bug.
 */
export function dateToSerialString(value: Date, dateSystem: ExcelDateSystem = "1900"): string {
  return formatNumberForCell(dateToSerial(value, dateSystem));
}

/**
 * Convert an Excel date serial number back to a JS Date, accounting for
 * the Lotus 1-2-3 leap year bug.
 *
 * Serial 60 (the phantom Feb 29, 1900) maps to Mar 1, 1900 since the
 * date doesn't actually exist.
 */
export function serialToDate(serial: number, dateSystem: ExcelDateSystem = "1900"): Date {
  if (dateSystem === "1904") {
    return new Date(EXCEL_1904_EPOCH_UTC + serial * 86_400_000);
  }
  // Reverse the forward conversion:
  // - Serial 0..59: forward subtracted 1 from raw, so raw = serial + 1
  // - Serial 60: phantom day; treat as Mar 1, 1900 (raw = 61)
  // - Serial >= 61: no adjustment was made, raw = serial
  // - Serial < 0: no adjustment, raw = serial
  let raw: number;
  if (serial >= 0 && serial < 60) {
    raw = serial + 1;
  } else if (serial === 60) {
    // Phantom Feb 29, 1900 -> map to Mar 1, 1900
    raw = 61;
  } else {
    raw = serial;
  }
  return new Date(EXCEL_EPOCH_UTC + raw * 86_400_000);
}
