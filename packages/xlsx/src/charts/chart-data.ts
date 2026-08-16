import type {
  SpreadsheetCell,
  SpreadsheetDocument,
} from "../types/spreadsheet-ast.js";
import { parseRangeRef } from "../utils/cell-ref.js";

export interface ResolvedChartReference {
  cells: Array<SpreadsheetCell | undefined>;
  cellCount: number;
}

function splitQualifiedReference(
  reference: string,
  defaultSheetName: string,
): { sheetName: string; range: string } | undefined {
  const trimmed = reference.trim();
  const separator = trimmed.lastIndexOf("!");
  if (separator === -1) {
    return { sheetName: defaultSheetName, range: trimmed };
  }

  const rawSheetName = trimmed.slice(0, separator);
  const range = trimmed.slice(separator + 1);
  if (!rawSheetName || !range) {
    return undefined;
  }

  const sheetName = rawSheetName.startsWith("'") && rawSheetName.endsWith("'")
    ? rawSheetName.slice(1, -1).replaceAll("''", "'")
    : rawSheetName;
  return { sheetName, range };
}

export function resolveChartReference(
  document: SpreadsheetDocument,
  defaultSheetName: string,
  reference: string,
): ResolvedChartReference | undefined {
  const qualified = splitQualifiedReference(reference, defaultSheetName);
  if (!qualified) {
    return undefined;
  }

  const sheet = document.sheets.find((candidate) => candidate.name === qualified.sheetName);
  if (!sheet) {
    return undefined;
  }

  let range;
  try {
    range = parseRangeRef(qualified.range.toUpperCase());
  } catch {
    return undefined;
  }

  const cells: Array<SpreadsheetCell | undefined> = [];
  const lastPopulatedRow = Math.min(range.endRow, sheet.rows.length - 1);
  for (let row = range.startRow; row <= lastPopulatedRow; row += 1) {
    const rowCells = sheet.rows[row]?.cells;
    if (!rowCells) {
      continue;
    }
    const lastPopulatedColumn = Math.min(range.endCol, rowCells.length - 1);
    for (let col = range.startCol; col <= lastPopulatedColumn; col += 1) {
      cells.push(rowCells[col]);
    }
  }
  return {
    cells,
    cellCount: (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1),
  };
}

function cellHasChartValue(cell: SpreadsheetCell | undefined): boolean {
  if (!cell) {
    return false;
  }
  if (cell.formula !== undefined) {
    return true;
  }
  if (Array.isArray(cell.value)) {
    return cell.value.some((run) => run.text.length > 0);
  }
  return cell.value !== undefined && cell.value !== null && cell.value !== "";
}

export function isChartSeriesEmpty(
  document: SpreadsheetDocument,
  defaultSheetName: string,
  valuesReference: string,
): boolean {
  if (valuesReference.trim() === "") {
    return true;
  }
  const resolved = resolveChartReference(document, defaultSheetName, valuesReference);
  return resolved !== undefined && resolved.cells.every((cell) => !cellHasChartValue(cell));
}

export function resolveChartSeriesName(
  document: SpreadsheetDocument,
  defaultSheetName: string,
  nameReference: string,
): string | undefined {
  const resolved = resolveChartReference(document, defaultSheetName, nameReference);
  if (!resolved || resolved.cellCount !== 1) {
    return undefined;
  }
  const value = resolved.cells[0]?.value;
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((run) => run.text).join("");
  }
  return undefined;
}
