import { FormulaEvaluator } from "../formulas/evaluator.js";
import type { CellValue, SpreadsheetCell, SpreadsheetDocument, SpreadsheetSheet, SpreadsheetTable, SpreadsheetTableColumn } from "../types/spreadsheet-ast.js";
import { isErrorValue, isRichTextValue } from "../types/spreadsheet-ast.js";
import { cellRef, parseRangeRef, rangeRef } from "../utils/cell-ref.js";
import { escapeXml, XML_DECLARATION } from "../utils/xml.js";

export interface WorksheetTableBinding {
  tableId: number;
  partName: string;
  definition: SpreadsheetTable;
}

export interface SerializedTablePart {
  path: string;
  xml: string;
}

export interface WorksheetSyntheticCell {
  row: number;
  col: number;
  cell: SpreadsheetCell;
}

function cellValueToDisplayString(value: CellValue | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (isRichTextValue(value)) {
    return value.map((run) => run.text).join("");
  }
  if (isErrorValue(value)) {
    return value.error;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function makeUniqueTableColumnNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((rawName, index) => {
    const baseName = rawName.trim() || `Column${index + 1}`;
    const normalized = baseName.toLowerCase();
    const count = (seen.get(normalized) ?? 0) + 1;
    seen.set(normalized, count);
    return count === 1 ? baseName : `${baseName}_${count}`;
  });
}

function resolveTableColumnNames(
  sheet: SpreadsheetSheet,
  table: SpreadsheetTable,
  formulaEvaluator: FormulaEvaluator | null,
): string[] {
  const range = parseRangeRef(table.ref);
  const headerRowIndex = range.startRow;
  const headerRow = sheet.rows[headerRowIndex];
  const explicitColumns = table.columns ?? [];
  const names: string[] = [];

  for (let offset = 0; offset <= (range.endCol - range.startCol); offset += 1) {
    const explicitName = explicitColumns[offset]?.name;
    if (explicitName) {
      names.push(explicitName);
      continue;
    }

    const columnIndex = range.startCol + offset;
    const cell = headerRow?.cells[columnIndex];
    const displayValue = cell?.formula
      ? (typeof cell.formula === "string"
        ? (formulaEvaluator?.evaluateCell(cell, sheet.name, cellRef(headerRowIndex, columnIndex)) ?? cell?.value)
        : (cell.formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheet.name, cellRef(headerRowIndex, columnIndex)) ?? cell?.value))
      : cell?.value;

    names.push(cellValueToDisplayString(displayValue));
  }

  return makeUniqueTableColumnNames(names);
}

function serializeTableColumn(column: SpreadsheetTableColumn | undefined, id: number, name: string): string {
  const attributes = [
    `id="${id}"`,
    `name="${escapeXml(name)}"`,
  ];
  if (column?.totalsRowLabel) {
    attributes.push(`totalsRowLabel="${escapeXml(column.totalsRowLabel)}"`);
  }
  if (column?.totalsRowFunction) {
    attributes.push(`totalsRowFunction="${column.totalsRowFunction}"`);
  }

  if (column?.totalsRowFormula) {
    return `<tableColumn ${attributes.join(" ")}><totalsRowFormula>${escapeXml(column.totalsRowFormula)}</totalsRowFormula></tableColumn>`;
  }

  return `<tableColumn ${attributes.join(" ")}/>`;
}

function totalsRowFunctionCode(value: SpreadsheetTableColumn["totalsRowFunction"]): number | null {
  switch (value) {
    case "average":
      return 101;
    case "countNums":
      return 102;
    case "count":
      return 103;
    case "max":
      return 104;
    case "min":
      return 105;
    case "stdDev":
      return 107;
    case "sum":
      return 109;
    case "var":
      return 110;
    default:
      return null;
  }
}

function createTotalsRowCell(
  table: SpreadsheetTable,
  range: ReturnType<typeof parseRangeRef>,
  column: SpreadsheetTableColumn | undefined,
  columnIndex: number,
): SpreadsheetCell {
  if (column?.totalsRowLabel) {
    return { value: column.totalsRowLabel };
  }

  if (column?.totalsRowFormula) {
    return {
      formula: column.totalsRowFormula.startsWith("=")
        ? column.totalsRowFormula.slice(1)
        : column.totalsRowFormula,
    };
  }

  if (column?.totalsRowFunction) {
    const functionCode = totalsRowFunctionCode(column.totalsRowFunction);
    const dataStartRow = range.startRow + 1;
    const dataEndRow = Math.max(range.startRow + 1, range.endRow - 1);

    if (functionCode !== null && dataEndRow >= dataStartRow) {
      return {
        formula: `SUBTOTAL(${functionCode},${cellRef(dataStartRow, columnIndex)}:${cellRef(dataEndRow, columnIndex)})`,
      };
    }
  }

  if (table.totalsRow) {
    return { value: "" };
  }

  return { value: "" };
}

export function buildWorksheetSyntheticTableCells(
  bindings: WorksheetTableBinding[] | undefined,
): Map<number, WorksheetSyntheticCell[]> {
  const cellsByRow = new Map<number, WorksheetSyntheticCell[]>();

  for (const binding of bindings ?? []) {
    const table = binding.definition;
    if (table.totalsRow !== true) {
      continue;
    }

    const range = parseRangeRef(table.ref);
    const totalsRowIndex = range.endRow;
    const columns = table.columns ?? [];
    const rowCells = cellsByRow.get(totalsRowIndex) ?? [];

    for (let offset = 0; offset <= (range.endCol - range.startCol); offset += 1) {
      const columnIndex = range.startCol + offset;
      rowCells.push({
        row: totalsRowIndex,
        col: columnIndex,
        cell: createTotalsRowCell(table, range, columns[offset], columnIndex),
      });
    }

    cellsByRow.set(totalsRowIndex, rowCells);
  }

  return cellsByRow;
}

export function buildWorksheetTableBindings(document: SpreadsheetDocument): WorksheetTableBinding[][] {
  let nextTableId = 1;
  return document.sheets.map((sheet) => (
    (sheet.tables ?? []).map((table) => {
      const binding = {
        tableId: nextTableId,
        partName: `table${nextTableId}.xml`,
        definition: table,
      };
      nextTableId += 1;
      return binding;
    })
  ));
}

export function serializeTableParts(
  document: SpreadsheetDocument,
  bindingsBySheet: WorksheetTableBinding[][],
  formulaEvaluator: FormulaEvaluator | null,
): SerializedTablePart[] {
  const parts: SerializedTablePart[] = [];

  document.sheets.forEach((sheet, sheetIndex) => {
    const bindings = bindingsBySheet[sheetIndex] ?? [];
    bindings.forEach((binding) => {
      const table = binding.definition;
      const range = parseRangeRef(table.ref);
      const columnNames = resolveTableColumnNames(sheet, table, formulaEvaluator);
      const columnDefinitions = table.columns ?? [];
      const totalsRow = table.totalsRow === true;
      const tableRef = rangeRef(range.startRow, range.startCol, range.endRow, range.endCol);
      const autoFilterEndRow = totalsRow && range.endRow > range.startRow
        ? range.endRow - 1
        : range.endRow;
      const autoFilterRef = rangeRef(range.startRow, range.startCol, autoFilterEndRow, range.endCol);
      const styleName = table.style?.name ?? "TableStyleMedium2";

      const xml = [
        XML_DECLARATION,
        `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${binding.tableId}" name="${escapeXml(table.name)}" displayName="${escapeXml(table.displayName ?? table.name)}" ref="${tableRef}" headerRowCount="1"${totalsRow ? ` totalsRowCount="1"` : ""}>`,
        `<autoFilter ref="${autoFilterRef}"/>`,
        `<tableColumns count="${columnNames.length}">`,
        ...columnNames.map((name, index) => serializeTableColumn(columnDefinitions[index], index + 1, name)),
        `</tableColumns>`,
        `<tableStyleInfo name="${escapeXml(styleName)}" showFirstColumn="${table.style?.showFirstColumn ? 1 : 0}" showLastColumn="${table.style?.showLastColumn ? 1 : 0}" showRowStripes="${table.style?.showRowStripes ?? true ? 1 : 0}" showColumnStripes="${table.style?.showColumnStripes ? 1 : 0}"/>`,
        `</table>`,
      ].join("");

      parts.push({
        path: `xl/tables/${binding.partName}`,
        xml,
      });
    });
  });

  return parts;
}
