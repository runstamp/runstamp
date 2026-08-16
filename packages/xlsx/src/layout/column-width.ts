import type {
  CellValue,
  SpreadsheetCellStyle,
  SpreadsheetColumn,
  SpreadsheetDefaults,
  SpreadsheetSheet,
} from "../types/spreadsheet-ast.js";
import { isErrorValue } from "../types/spreadsheet-ast.js";
import { resolveCellStyle, resolveNumberFormatAlias } from "../styles/style-utils.js";
import { formatNumberForCell } from "../utils/xml.js";

export interface ComputedColumnWidth {
  width: number;
  bestFit: boolean;
}

export const MAX_EXCEL_COLUMN_WIDTH = 255;

export function clampColumnWidth(width: number): number {
  return Math.min(width, MAX_EXCEL_COLUMN_WIDTH);
}

export interface ColumnSegment {
  start: number;
  end: number;
  width: number;
  hidden?: boolean;
  bestFit?: boolean;
  customWidth?: boolean;
}

function columnNeedsHeuristicWidth(column: SpreadsheetColumn | undefined): boolean {
  return column?.width === undefined && column?.bestFit === true;
}

function resolveSheetStyleInput(sheet: SpreadsheetSheet, rowIndex: number) {
  if (rowIndex === 0) {
    return sheet.styling?.headerRow;
  }

  return (rowIndex + 1) % 2 === 0
    ? sheet.styling?.alternateRows?.even
    : sheet.styling?.alternateRows?.odd;
}

export function resolveSheetRowStyle(
  sheet: SpreadsheetSheet,
  rowIndex: number,
  cellValue?: CellValue,
): SpreadsheetCellStyle | undefined {
  return resolveCellStyle(resolveSheetStyleInput(sheet, rowIndex), cellValue);
}

export function stringifyDisplayValue(
  value: CellValue | undefined,
  style: SpreadsheetCellStyle | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((run) => run.text).join("");
  }
  if (isErrorValue(value)) {
    return value.error;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    const numberFormat = resolveNumberFormatAlias(style?.numberFormat);
    if (numberFormat === "m/d/yyyy") return "1/1/2026";
    if (numberFormat === "d/m/yyyy") return "1/1/2026";
    return "2026-01-01";
  }

  const numberFormat = resolveNumberFormatAlias(style?.numberFormat);
  if (!numberFormat) {
    return formatNumberForCell(value);
  }
  if (numberFormat.includes("%")) {
    const decimals = (numberFormat.split(".")[1]?.match(/0/g) ?? []).length;
    return `${(value * 100).toFixed(decimals)}%`;
  }
  if (numberFormat.includes("₩")) return `₩${Math.round(value).toLocaleString("en-US")}`;
  if (numberFormat.includes("$")) return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (numberFormat.includes("€")) return `€${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (numberFormat.includes("#,##0.00")) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (numberFormat.includes("#,##0")) return Math.round(value).toLocaleString("en-US");
  return formatNumberForCell(value);
}

function isCJKCharacter(codePoint: number): boolean {
  return (
    (codePoint >= 0x2E80 && codePoint <= 0x9FFF) ||
    (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
    (codePoint >= 0xFE30 && codePoint <= 0xFE4F)
  );
}

function estimateCharacterBaseWidth(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;
  return isCJKCharacter(codePoint) ? 1.8 : 1.0;
}

export function estimateCharacterWidth(char: string, bold: boolean): number {
  const base = estimateCharacterBaseWidth(char);
  return bold ? base * 1.05 : base;
}

function estimateStringWidth(value: string): number {
  let maxLineWidth = 0;
  let currentLineWidth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (ch === "\n" || ch === "\r") {
      maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
      currentLineWidth = 0;
      // Skip \n after \r
      if (ch === "\r" && value[i + 1] === "\n") {
        i++;
      }
      continue;
    }
    currentLineWidth += estimateCharacterBaseWidth(ch);
  }
  return Math.max(maxLineWidth, currentLineWidth);
}

function longestLineLength(value: string): number {
  return value.split(/\r\n|\r|\n/).reduce(
    (max, line) => Math.max(max, line.length),
    0,
  );
}

function countIntegerDigits(value: number): number {
  if (!Number.isFinite(value) || value === 0) {
    return 1;
  }
  return Math.floor(Math.log10(Math.abs(value))) + 1;
}

function countGroupedDigits(value: number): number {
  const digits = countIntegerDigits(value);
  return digits + Math.max(0, Math.floor((digits - 1) / 3));
}

function countDecimalPlaces(format: string): number {
  const decimalSection = format.split(".")[1] ?? "";
  const match = decimalSection.match(/0/g);
  return match?.length ?? 0;
}

function estimateNumberDisplayLength(value: number, numberFormat: string | undefined): number {
  if (!numberFormat) {
    return formatNumberForCell(value).length;
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? 1 : 0;

  if (numberFormat.includes("E+")) {
    return sign + 8;
  }

  if (numberFormat.includes("%")) {
    const decimals = countDecimalPlaces(numberFormat);
    const scaled = absValue * 100;
    return sign + countIntegerDigits(scaled) + (decimals > 0 ? decimals + 1 : 0) + 1;
  }

  if (numberFormat.includes("₩")) {
    return sign + 1 + countGroupedDigits(absValue);
  }

  if (numberFormat.includes("$") || numberFormat.includes("€") || numberFormat.includes("£") || numberFormat.includes("¥")) {
    const decimals = countDecimalPlaces(numberFormat);
    return sign + 1 + countGroupedDigits(absValue) + (decimals > 0 ? decimals + 1 : 0);
  }

  if (numberFormat.includes("#,##0")) {
    const decimals = countDecimalPlaces(numberFormat);
    return sign + countGroupedDigits(absValue) + (decimals > 0 ? decimals + 1 : 0);
  }

  if (numberFormat === "@") {
    return String(value).length;
  }

  return formatNumberForCell(value).length;
}

function resolveWidthCoefficient(
  style: SpreadsheetCellStyle | undefined,
  defaults: SpreadsheetDefaults | undefined,
): number {
  const fontFamily = style?.font?.family ?? defaults?.font?.family ?? "Calibri";
  return fontFamily === "Courier New" ? 1.0 : 1.15;
}

function estimateDisplayCharWidth(
  value: CellValue | undefined,
  style: SpreadsheetCellStyle | undefined,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const boldMultiplier = style?.font?.bold === true ? 1.05 : 1;

  if (Array.isArray(value)) {
    return estimateStringWidth(value.map((run) => run.text).join("")) * boldMultiplier;
  }
  if (isErrorValue(value)) {
    return estimateStringWidth(value.error) * boldMultiplier;
  }
  if (typeof value === "string") {
    return estimateStringWidth(value) * boldMultiplier;
  }

  return estimateDisplayLength(value, style) * boldMultiplier;
}

function estimateDisplayWidth(
  value: CellValue | undefined,
  style: SpreadsheetCellStyle | undefined,
  defaults: SpreadsheetDefaults | undefined,
): number | undefined {
  const charWidth = estimateDisplayCharWidth(value, style);
  if (charWidth === undefined || charWidth === 0) {
    return undefined;
  }

  const coefficient = resolveWidthCoefficient(style, defaults);
  return Math.min(Math.max((charWidth * coefficient) + 2, 8.43), MAX_EXCEL_COLUMN_WIDTH);
}

export function estimateDisplayLength(
  value: CellValue | undefined,
  style: SpreadsheetCellStyle | undefined,
): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (Array.isArray(value)) {
    return longestLineLength(value.map((run) => run.text).join(""));
  }
  if (isErrorValue(value)) {
    return value.error.length;
  }
  if (typeof value === "string") {
    return longestLineLength(value);
  }
  if (typeof value === "boolean") {
    return value ? 4 : 5;
  }
  if (value instanceof Date) {
    const numberFormat = resolveNumberFormatAlias(style?.numberFormat);
    if (numberFormat === "yyyy-mm-dd hh:mm") return 16;
    if (numberFormat === "h:mm:ss") return 8;
    if (numberFormat === "m/d/yyyy") return 10;
    if (numberFormat === "d/m/yyyy") return 10;
    return 10;
  }

  return estimateNumberDisplayLength(value, resolveNumberFormatAlias(style?.numberFormat));
}

export function estimateColumnWidth(
  sheet: SpreadsheetSheet,
  columnIndex: number,
  defaults?: SpreadsheetDefaults,
): ComputedColumnWidth | undefined {
  const explicit = sheet.columns?.[columnIndex];
  if (explicit?.width !== undefined) {
    return { width: clampColumnWidth(explicit.width), bestFit: explicit.bestFit ?? false };
  }
  if (!columnNeedsHeuristicWidth(explicit)) {
    return undefined;
  }

  let maxWidth = 0;
  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex += 1) {
    const cell = sheet.rows[rowIndex]?.cells[columnIndex];
    if (!cell) continue;
    const style = resolveCellStyle(cell.style, cell.value, resolveSheetStyleInput(sheet, rowIndex));
    const width = estimateDisplayWidth(cell.value, style, defaults);
    if (width !== undefined) {
      maxWidth = Math.max(maxWidth, width);
    }
  }

  if (maxWidth === 0) {
    return undefined;
  }

  return {
    width: Math.min(Math.max(maxWidth, 8.43), MAX_EXCEL_COLUMN_WIDTH),
    bestFit: true,
  };
}

export function estimateHeuristicColumnWidth(
  value: CellValue | undefined,
  style: SpreadsheetCellStyle | undefined,
  defaults?: SpreadsheetDefaults,
): number | undefined {
  return estimateDisplayWidth(value, style, defaults);
}

export function getSheetColumnCount(sheet: SpreadsheetSheet): number {
  let maxColumnCount = sheet.columns?.length ?? 0;
  for (const row of sheet.rows) {
    if (row.cells.length > maxColumnCount) {
      maxColumnCount = row.cells.length;
    }
  }
  return maxColumnCount;
}

export function buildColumnLayout(
  sheet: SpreadsheetSheet,
  computedColumns: Array<ComputedColumnWidth | undefined>,
  defaults?: SpreadsheetDefaults,
): {
  columnCount: number;
  columnWidths: number[];
  segments: ColumnSegment[];
} {
  const columnCount = computedColumns.length;
  const columnWidths = computedColumns.map(
    (column, index) => clampColumnWidth(
      sheet.columns?.[index]?.width ?? column?.width ?? (defaults?.columnWidth ?? 8.43),
    ),
  );

  const segments: ColumnSegment[] = [];
  for (let index = 0; index < columnCount; index += 1) {
    const explicit: SpreadsheetColumn | undefined = sheet.columns?.[index];
    const computed = computedColumns[index];
    const descriptor = {
      width: clampColumnWidth(explicit?.width ?? computed?.width ?? (defaults?.columnWidth ?? 8.43)),
      hidden: explicit?.hidden,
      bestFit: explicit?.bestFit ?? computed?.bestFit,
      customWidth: explicit?.width !== undefined || computed?.width !== undefined,
    };
    const shouldEmitSegment = descriptor.customWidth || descriptor.hidden || descriptor.bestFit;
    if (!shouldEmitSegment) {
      continue;
    }

    const previous = segments[segments.length - 1];
    if (
      previous &&
      previous.end === index &&
      previous.width === descriptor.width &&
      previous.hidden === descriptor.hidden &&
      previous.bestFit === descriptor.bestFit &&
      previous.customWidth === descriptor.customWidth
    ) {
      previous.end = index + 1;
      continue;
    }

    segments.push({
      start: index + 1,
      end: index + 1,
      ...descriptor,
    });
  }

  return {
    columnCount,
    columnWidths,
    segments,
  };
}

export function computeColumnLayout(
  sheet: SpreadsheetSheet,
  defaults?: SpreadsheetDefaults,
): {
  columnCount: number;
  computedColumns: Array<ComputedColumnWidth | undefined>;
  columnWidths: number[];
  segments: ColumnSegment[];
} {
  const columnCount = getSheetColumnCount(sheet);
  const computedColumns: Array<ComputedColumnWidth | undefined> = Array.from({ length: columnCount }, () => undefined);
  const explicitColumns = sheet.columns ?? [];
  const headerRowStyle = resolveCellStyle(sheet.styling?.headerRow, undefined);
  const alternateOddStyle = resolveCellStyle(sheet.styling?.alternateRows?.odd, undefined);
  const alternateEvenStyle = resolveCellStyle(sheet.styling?.alternateRows?.even, undefined);

  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex];
    if (!row) {
      continue;
    }

    const rowStyle = rowIndex === 0
      ? headerRowStyle
      : (((rowIndex + 1) % 2 === 0) ? alternateEvenStyle : alternateOddStyle);

    for (let columnIndex = 0; columnIndex < row.cells.length; columnIndex += 1) {
      const explicitColumn = explicitColumns[columnIndex];
      if (!columnNeedsHeuristicWidth(explicitColumn)) {
        continue;
      }

      const cell = row.cells[columnIndex];
      if (!cell) {
        continue;
      }

      const style = resolveCellStyle(cell.style, cell.value, rowStyle);
      const width = estimateDisplayWidth(cell.value, style, defaults);
      if (width === undefined) {
        continue;
      }

      const existing = computedColumns[columnIndex];
      if (!existing || width > existing.width) {
        computedColumns[columnIndex] = {
          width,
          bestFit: true,
        };
      }
    }
  }

  const layout = buildColumnLayout(sheet, computedColumns, defaults);

  return {
    columnCount: layout.columnCount,
    computedColumns,
    columnWidths: layout.columnWidths,
    segments: layout.segments,
  };
}
