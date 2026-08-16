import { resolveCellStyle } from "../styles/style-utils.js";
import type { SpreadsheetDefaults, SpreadsheetSheet } from "../types/spreadsheet-ast.js";
import { stringifyDisplayValue } from "./column-width.js";

function resolveSheetStyleInput(sheet: SpreadsheetSheet, rowIndex: number) {
  if (rowIndex === 0) {
    return sheet.styling?.headerRow;
  }

  return (rowIndex + 1) % 2 === 0
    ? sheet.styling?.alternateRows?.even
    : sheet.styling?.alternateRows?.odd;
}

export function estimateRowHeight(
  row: SpreadsheetSheet["rows"][number],
  rowIndex: number,
  sheet: SpreadsheetSheet,
  columnWidths: number[],
  defaults?: SpreadsheetDefaults,
): number | undefined {
  if (row.height !== undefined) {
    return row.height;
  }

  let maxHeight = defaults?.rowHeight ?? 15;
  let adjusted = false;
  for (let columnIndex = 0; columnIndex < row.cells.length; columnIndex += 1) {
    const cell = row.cells[columnIndex];
    const style = resolveCellStyle(cell.style, cell.value, resolveSheetStyleInput(sheet, rowIndex));
    if (!style?.alignment?.wrapText) continue;
    const text = stringifyDisplayValue(cell.value, style);
    if (!text) continue;

    const charsPerLine = Math.max(1, Math.floor((columnWidths[columnIndex] ?? defaults?.columnWidth ?? 8.43) * 1.6));
    const lines = Math.ceil(text.length / charsPerLine);
    if (lines <= 1) continue;
    const fontSize = style.font?.size ?? defaults?.font?.size ?? 11;
    const estimatedHeight = Math.min(lines * fontSize * 1.4, 409);
    if (estimatedHeight <= (defaults?.rowHeight ?? 15)) continue;
    maxHeight = Math.max(maxHeight, estimatedHeight);
    adjusted = true;
  }

  return adjusted ? maxHeight : undefined;
}
