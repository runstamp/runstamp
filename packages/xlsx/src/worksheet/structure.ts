import type {
  SpreadsheetAutoFilterConfig,
  SpreadsheetCell,
  SpreadsheetCellStyle,
  SpreadsheetSheet,
} from "../types/spreadsheet-ast.js";
import { absRangeRef, parseRangeRef, type ParsedRangeRef } from "../utils/cell-ref.js";
import { deepMerge, resolveStyleInput } from "../styles/style-utils.js";

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function cloneCell(cell: SpreadsheetCell): SpreadsheetCell {
  return {
    ...cell,
    value: cell.value,
    style: cell.style,
  };
}

function rangesOverlap(left: ParsedRangeRef, right: ParsedRangeRef): boolean {
  return !(
    left.endRow < right.startRow ||
    right.endRow < left.startRow ||
    left.endCol < right.startCol ||
    right.endCol < left.startCol
  );
}

function isNonEmptyCell(cell: SpreadsheetCell | undefined): boolean {
  return Boolean(
    cell &&
    cell.value !== undefined &&
    cell.value !== null &&
    (!Array.isArray(cell.value) || cell.value.length > 0),
  );
}

function mergeStylePatch(
  cell: SpreadsheetCell | undefined,
  patch: SpreadsheetCellStyle,
): SpreadsheetCell {
  const baseStyle = resolveStyleInput(cell?.style);
  return {
    ...(cell ?? { value: null }),
    style: deepMerge(baseStyle, patch),
  };
}

export interface MergeRangeDescriptor {
  ref: string;
  bounds: ParsedRangeRef;
  source: "explicit" | "span";
}

export interface PositionedCell {
  row: number;
  col: number;
  cell: SpreadsheetCell;
}

export interface PositionedRow {
  row: number;
  cells: PositionedCell[];
}

export interface SheetStructureIssue {
  code: "MERGE_RANGE_OVERLAP" | "MERGE_RANGE_OUT_OF_BOUNDS" | "MERGE_RANGE_CONSUMED_CELL";
  message: string;
  path: Array<string | number>;
}

export interface CompiledSheetStructure {
  rows: PositionedRow[];
  originCells: PositionedRow[];
  mergeRanges: MergeRangeDescriptor[];
  autoFilterRef?: string;
  maxRow: number;
  maxCol: number;
}

export function quoteSheetName(sheetName: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(sheetName)) {
    return sheetName;
  }
  return `'${sheetName.replaceAll("'", "''")}'`;
}

function resolveAutoFilterRef(
  sheet: SpreadsheetSheet,
  maxRow: number,
  maxCol: number,
): string | undefined {
  if (!sheet.autoFilter) {
    return undefined;
  }

  if (sheet.autoFilter === true) {
    if (maxRow < 0 || maxCol < 0) {
      return "A1:A1";
    }
    return absRangeRef(0, 0, maxRow, maxCol).replaceAll("$", "");
  }

  return (sheet.autoFilter as SpreadsheetAutoFilterConfig).ref;
}

export function compileSheetStructure(sheet: SpreadsheetSheet): CompiledSheetStructure {
  const occupied = new Set<string>();
  const originCellMap = new Map<string, SpreadsheetCell>();
  const spanMerges: MergeRangeDescriptor[] = [];
  let maxRow = sheet.rows.length - 1;
  let maxCol = Math.max(-1, (sheet.columns?.length ?? 0) - 1);

  sheet.rows.forEach((row, rowIndex) => {
    let cursor = 0;
    row.cells.forEach((cellInput) => {
      while (occupied.has(cellKey(rowIndex, cursor))) {
        cursor += 1;
      }

      const cell = cloneCell(cellInput);
      const colSpan = cell.colSpan ?? 1;
      const rowSpan = cell.rowSpan ?? 1;
      originCellMap.set(cellKey(rowIndex, cursor), cell);
      maxRow = Math.max(maxRow, rowIndex + rowSpan - 1);
      maxCol = Math.max(maxCol, cursor + colSpan - 1);

      if (colSpan > 1 || rowSpan > 1) {
        spanMerges.push({
          ref: `${absRangeRef(rowIndex, cursor, rowIndex + rowSpan - 1, cursor + colSpan - 1).replaceAll("$", "")}`,
          bounds: {
            startRow: rowIndex,
            startCol: cursor,
            endRow: rowIndex + rowSpan - 1,
            endCol: cursor + colSpan - 1,
          },
          source: "span",
        });
      }

      for (let occupiedRow = rowIndex; occupiedRow < rowIndex + rowSpan; occupiedRow += 1) {
        for (let occupiedCol = cursor; occupiedCol < cursor + colSpan; occupiedCol += 1) {
          if (occupiedRow === rowIndex && occupiedCol === cursor) {
            continue;
          }
          occupied.add(cellKey(occupiedRow, occupiedCol));
        }
      }

      cursor += colSpan;
    });
  });

  const explicitMerges = (sheet.mergedCells ?? []).map((ref) => ({
    ref,
    bounds: parseRangeRef(ref),
    source: "explicit" as const,
  }));
  const mergeRanges = [...spanMerges, ...explicitMerges];

  const propagatedCellMap = new Map(originCellMap);
  for (const merge of mergeRanges) {
    const topLeftKey = cellKey(merge.bounds.startRow, merge.bounds.startCol);
    const topLeftCell = propagatedCellMap.get(topLeftKey);
    const border = resolveStyleInput(topLeftCell?.style)?.border;
    if (!border) {
      continue;
    }

    const applyEdge = (
      row: number,
      col: number,
      patch: SpreadsheetCellStyle,
    ) => {
      const key = cellKey(row, col);
      propagatedCellMap.set(key, mergeStylePatch(propagatedCellMap.get(key), patch));
    };

    if (border.top) {
      for (let col = merge.bounds.startCol; col <= merge.bounds.endCol; col += 1) {
        applyEdge(merge.bounds.startRow, col, { border: { top: border.top } });
      }
    }
    if (border.bottom) {
      for (let col = merge.bounds.startCol; col <= merge.bounds.endCol; col += 1) {
        applyEdge(merge.bounds.endRow, col, { border: { bottom: border.bottom } });
      }
    }
    if (border.left) {
      for (let row = merge.bounds.startRow; row <= merge.bounds.endRow; row += 1) {
        applyEdge(row, merge.bounds.startCol, { border: { left: border.left } });
      }
    }
    if (border.right) {
      for (let row = merge.bounds.startRow; row <= merge.bounds.endRow; row += 1) {
        applyEdge(row, merge.bounds.endCol, { border: { right: border.right } });
      }
    }
  }

  const buildRows = (cellMap: Map<string, SpreadsheetCell>): PositionedRow[] => {
    const rowMap = new Map<number, PositionedCell[]>();
    for (const [key, cell] of cellMap) {
      const [row, col] = key.split(":").map(Number);
      const rowCells = rowMap.get(row) ?? [];
      rowCells.push({ row, col, cell });
      rowMap.set(row, rowCells);
    }

    return [...rowMap.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([row, cells]) => ({
        row,
        cells: cells.sort((left, right) => left.col - right.col),
      }));
  };

  return {
    rows: buildRows(propagatedCellMap),
    originCells: buildRows(originCellMap),
    mergeRanges,
    autoFilterRef: resolveAutoFilterRef(sheet, maxRow, maxCol),
    maxRow,
    maxCol,
  };
}

export function validateSheetStructure(sheet: SpreadsheetSheet): SheetStructureIssue[] {
  const compiled = compileSheetStructure(sheet);
  const issues: SheetStructureIssue[] = [];
  const maxDefinedRow = sheet.rows.length - 1;
  const maxDefinedCol = Math.max(
    (sheet.columns?.length ?? 0) - 1,
    compiled.originCells.reduce((max, row) => Math.max(max, ...(row.cells.map((cell) => cell.col))), -1),
  );

  compiled.mergeRanges.forEach((merge, index) => {
    if (
      merge.bounds.startRow < 0 ||
      merge.bounds.startCol < 0 ||
      merge.bounds.endRow > maxDefinedRow ||
      merge.bounds.endCol > maxDefinedCol
    ) {
      issues.push({
        code: "MERGE_RANGE_OUT_OF_BOUNDS",
        message: `Merge range ${merge.ref} exceeds the defined sheet bounds`,
        path: ["mergedCells", index],
      });
    }

    for (let otherIndex = index + 1; otherIndex < compiled.mergeRanges.length; otherIndex += 1) {
      const other = compiled.mergeRanges[otherIndex];
      if (rangesOverlap(merge.bounds, other.bounds)) {
        issues.push({
          code: "MERGE_RANGE_OVERLAP",
          message: `Merge ranges ${merge.ref} and ${other.ref} overlap`,
          path: ["mergedCells", index],
        });
      }
    }

    if (merge.source === "explicit") {
      for (const row of compiled.originCells) {
        for (const cell of row.cells) {
          if (
            (cell.row !== merge.bounds.startRow || cell.col !== merge.bounds.startCol) &&
            cell.row >= merge.bounds.startRow &&
            cell.row <= merge.bounds.endRow &&
            cell.col >= merge.bounds.startCol &&
            cell.col <= merge.bounds.endCol &&
            isNonEmptyCell(cell.cell)
          ) {
            issues.push({
              code: "MERGE_RANGE_CONSUMED_CELL",
              message: `Merge range ${merge.ref} consumes populated cell ${absRangeRef(cell.row, cell.col, cell.row, cell.col).replaceAll("$", "")}`,
              path: ["mergedCells"],
            });
          }
        }
      }
    }
  });

  return issues;
}
