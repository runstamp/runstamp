import type { TableCell, TableData, TableRow, TextRun } from "../types/ast.js";
import { calculateRichTextMetrics } from "./richMetrics.js";
import { autoSizeTableColumns } from "./tableAutoSize.js";

export interface TableCellFitDiagnostics {
  colIndex: number;
  availableWidth: number;
  availableHeight: number;
  naturalHeight: number;
  lineCount: number;
}

export interface TableRowFitDiagnostics {
  rowIndex: number;
  assignedHeight: number;
  naturalHeight: number;
  declaredHeight?: number;
  minHeight: number;
  compressed: boolean;
  cells: TableCellFitDiagnostics[];
}

export interface TableFitDiagnostics {
  rowCount: number;
  columnCount: number;
  tableWidth: number;
  tableHeight: number;
  totalAssignedHeight: number;
  totalNaturalHeight: number;
  fillsFrame: boolean;
  overfull: boolean;
  compressedRows: number[];
  rows: TableRowFitDiagnostics[];
}

const DEFAULT_FONT_SIZE = 12;
const DEFAULT_PADDING = 5;
const MIN_ROW_HEIGHT = 18;
const HEIGHT_TOLERANCE = 0.5;

function cellToRuns(cell: TableCell): TextRun[] {
  if (cell.paragraphs && cell.paragraphs.length > 0) {
    const runs: TextRun[] = [];
    cell.paragraphs.forEach((paragraph, index) => {
      runs.push(...paragraph.runs);
      if (index < cell.paragraphs!.length - 1) {
        runs.push({ text: "\n" });
      }
    });
    return runs;
  }
  if (cell.content && Array.isArray(cell.content)) {
    return cell.content;
  }
  if (typeof cell.text === "string" && cell.text.length > 0) {
    return [{ text: cell.text }];
  }
  return [];
}

function spanWidth(columns: number[], start: number, span: number): number {
  let width = 0;
  for (let offset = 0; offset < span && start + offset < columns.length; offset += 1) {
    width += columns[start + offset] ?? 0;
  }
  return width;
}

function estimateCellHeight(cell: TableCell, availableWidth: number): Omit<TableCellFitDiagnostics, "colIndex" | "availableHeight"> {
  const padding = cell.style?.padding ?? DEFAULT_PADDING;
  const fontSize = cell.style?.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = fontSize * 1.2;
  const textWidth = Math.max(1, availableWidth - padding * 2);
  const runs = cellToRuns(cell);
  if (runs.length === 0) {
    return {
      availableWidth: textWidth,
      naturalHeight: Math.max(MIN_ROW_HEIGHT, lineHeight + padding * 2),
      lineCount: 1,
    };
  }

  const metrics = calculateRichTextMetrics(runs, {
    fontSize,
    fontFamily: cell.style?.fontFamily,
    fontWeight: cell.style?.fontWeight,
    fontStyle: cell.style?.fontStyle,
    color: cell.style?.color,
  }, textWidth);
  const lineCount = Math.max(1, Math.ceil(metrics.height / Math.max(1, lineHeight)));
  return {
    availableWidth: textWidth,
    naturalHeight: Math.max(MIN_ROW_HEIGHT, metrics.height + padding * 2),
    lineCount,
  };
}

function rowDeclaredMinimum(row: TableRow, tableData: TableData): number {
  return Math.max(MIN_ROW_HEIGHT, row.minHeight ?? 0, tableData.rowLayout?.minRowHeight ?? 0);
}

export function resolveTableColumns(tableData: TableData, tableWidth: number): number[] {
  if (tableData.autoFit && tableData.columns.length > 0) {
    return autoSizeTableColumns(tableData, tableWidth);
  }
  const declaredTotal = tableData.columns.reduce((sum, width) => sum + width, 0);
  if (declaredTotal > 0 && Math.abs(declaredTotal - tableWidth) > HEIGHT_TOLERANCE) {
    const scale = tableWidth / declaredTotal;
    return tableData.columns.map((width) => width * scale);
  }
  return tableData.columns;
}

export function planTableLayout(
  tableData: TableData,
  tableWidth: number,
  tableHeight: number,
): TableFitDiagnostics {
  const columns = resolveTableColumns(tableData, tableWidth);
  const rows = tableData.rows;
  const diagnosticsRows: TableRowFitDiagnostics[] = [];
  let totalNaturalHeight = 0;

  rows.forEach((row, rowIndex) => {
    let colIndex = 0;
    const cellDiagnostics: TableCellFitDiagnostics[] = [];
    let naturalHeight = rowDeclaredMinimum(row, tableData);

    for (const cell of row.cells) {
      if (colIndex >= columns.length) break;
      const span = Math.max(1, cell.colSpan ?? 1);
      const width = spanWidth(columns, colIndex, span);
      const cellFit = estimateCellHeight(cell, width);
      naturalHeight = Math.max(naturalHeight, cellFit.naturalHeight);
      cellDiagnostics.push({
        colIndex,
        availableWidth: cellFit.availableWidth,
        availableHeight: 0,
        naturalHeight: cellFit.naturalHeight,
        lineCount: cellFit.lineCount,
      });
      colIndex += span;
    }

    const minHeight = rowDeclaredMinimum(row, tableData);
    const assignedHeight = Math.max(naturalHeight, minHeight, row.height ?? 0);
    totalNaturalHeight += naturalHeight;
    diagnosticsRows.push({
      rowIndex,
      assignedHeight,
      naturalHeight,
      declaredHeight: row.height,
      minHeight,
      compressed: assignedHeight + HEIGHT_TOLERANCE < naturalHeight || assignedHeight + HEIGHT_TOLERANCE < minHeight,
      cells: cellDiagnostics,
    });
  });

  const totalAssignedBeforeFill = diagnosticsRows.reduce((sum, row) => sum + row.assignedHeight, 0);
  const fillMode = tableData.rowLayout?.mode !== "natural";
  if (fillMode && rows.length > 0 && totalAssignedBeforeFill < tableHeight - HEIGHT_TOLERANCE) {
    const extraPerRow = (tableHeight - totalAssignedBeforeFill) / rows.length;
    for (const row of diagnosticsRows) {
      row.assignedHeight += extraPerRow;
    }
  }

  for (const row of diagnosticsRows) {
    for (const cell of row.cells) {
      cell.availableHeight = Math.max(0, row.assignedHeight - (DEFAULT_PADDING * 2));
    }
  }

  const totalAssignedHeight = diagnosticsRows.reduce((sum, row) => sum + row.assignedHeight, 0);
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    tableWidth,
    tableHeight,
    totalAssignedHeight,
    totalNaturalHeight,
    fillsFrame: totalAssignedHeight >= tableHeight - HEIGHT_TOLERANCE,
    overfull: totalAssignedHeight > tableHeight + HEIGHT_TOLERANCE,
    compressedRows: diagnosticsRows.filter((row) => row.compressed).map((row) => row.rowIndex),
    rows: diagnosticsRows,
  };
}
