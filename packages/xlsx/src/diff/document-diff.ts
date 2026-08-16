import {
  createDiffKey,
  diffDocuments as diffSchemaDocuments,
  type Change,
  type ChangeSet,
  type DiffInterpretContext,
  type DiffInterpretResult,
  type DiffOptions,
  type DiffPathSegment,
  type DiffPlugin,
} from "@runstamp/document-diff";
import type { SpreadsheetDocument, SpreadsheetSheet, SpreadsheetTable } from "../types/spreadsheet-ast.js";
import { cellRef, parseRangeRef } from "../utils/cell-ref.js";
import { SpreadsheetDocumentSchema } from "../validation/spreadsheet-schema.js";
import { compileSheetStructure } from "../worksheet/structure.js";

type DiffableRecord = Record<string, unknown>;

interface DiffSpreadsheetDocument {
  meta?: SpreadsheetDocument["meta"];
  theme?: SpreadsheetDocument["theme"];
  defaults?: SpreadsheetDocument["defaults"];
  namedRanges?: unknown[];
  sheets: Array<{
    name: string;
    state?: SpreadsheetSheet["state"];
    tabColor?: string;
    rightToLeft?: boolean;
    freezePane?: SpreadsheetSheet["freezePane"];
    autoFilter?: string | boolean | SpreadsheetSheet["autoFilter"];
    protection?: SpreadsheetSheet["protection"];
    styling?: SpreadsheetSheet["styling"];
    conditionalFormatting?: SpreadsheetSheet["conditionalFormatting"];
    columns?: SpreadsheetSheet["columns"];
    mergeRanges: unknown[];
    tables: unknown[];
    charts: unknown[];
    rows: unknown[];
  }>;
}

function asRecord(value: unknown): DiffableRecord | undefined {
  return value && typeof value === "object" ? value as DiffableRecord : undefined;
}

function getValueAtPath(value: unknown, path: DiffPathSegment[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
      continue;
    }
    current = (current as DiffableRecord)[segment];
  }
  return current;
}

function firstNumericAfter(path: DiffPathSegment[], segmentName: string): number | undefined {
  const segmentIndex = path.indexOf(segmentName);
  if (segmentIndex === -1) {
    return undefined;
  }
  const candidate = path[segmentIndex + 1];
  return typeof candidate === "number" ? candidate : undefined;
}

function pathIncludes(path: DiffPathSegment[], segmentName: string): boolean {
  return path.includes(segmentName);
}

function getSheetName(context: DiffInterpretContext<DiffSpreadsheetDocument>): string | undefined {
  const sheetIndex = firstNumericAfter(context.path, "sheets");
  if (sheetIndex === undefined) {
    return undefined;
  }
  const afterSheet = asRecord(context.normalizedAfter.sheets[sheetIndex]);
  if (typeof afterSheet?.name === "string") {
    return afterSheet.name;
  }
  const beforeSheet = asRecord(context.normalizedBefore.sheets[sheetIndex]);
  return typeof beforeSheet?.name === "string" ? beforeSheet.name : undefined;
}

function resolveTableColumnNames(sheet: SpreadsheetSheet, table: SpreadsheetTable): unknown[] {
  const range = parseRangeRef(table.ref);
  const compiled = compileSheetStructure(sheet);
  const row = compiled.originCells.find((candidate) => candidate.row === range.startRow);

  return Array.from({ length: range.endCol - range.startCol + 1 }, (_unused, offset) => {
    const columnDefinition = table.columns?.[offset];
    const columnIndex = range.startCol + offset;
    const headerCell = row?.cells.find((cell) => cell.col === columnIndex)?.cell;
    const cellValue = headerCell?.value;
    const fallbackName = typeof cellValue === "string" ? cellValue : `Column ${offset + 1}`;
    return {
      name: columnDefinition?.name ?? fallbackName,
      totalsRowLabel: columnDefinition?.totalsRowLabel,
      totalsRowFunction: columnDefinition?.totalsRowFunction,
      totalsRowFormula: columnDefinition?.totalsRowFormula,
    };
  });
}

function normalizeSheet(sheet: SpreadsheetSheet): DiffSpreadsheetDocument["sheets"][number] {
  const compiled = compileSheetStructure(sheet);

  return {
    name: sheet.name,
    state: sheet.state,
    tabColor: sheet.tabColor,
    rightToLeft: sheet.rightToLeft,
    freezePane: sheet.freezePane,
    autoFilter: compiled.autoFilterRef ?? sheet.autoFilter,
    protection: sheet.protection,
    styling: sheet.styling,
    conditionalFormatting: sheet.conditionalFormatting,
    columns: sheet.columns,
    mergeRanges: compiled.mergeRanges.map((range) => ({
      ref: range.ref,
      source: range.source,
      __diffKey: createDiffKey("merge", range.ref),
    })),
    tables: (sheet.tables ?? []).map((table) => ({
      name: table.name,
      displayName: table.displayName,
      ref: table.ref,
      totalsRow: table.totalsRow,
      columns: resolveTableColumnNames(sheet, table),
      style: table.style,
      __diffKey: createDiffKey("table", table.name, table.displayName),
    })),
    charts: (sheet.charts ?? []).map((chart) => ({
      type: chart.type,
      title: chart.title,
      series: chart.series,
      anchor: chart.anchor,
      width: chart.width,
      height: chart.height,
      style: chart.style,
      __diffKey: createDiffKey("chart", chart.type, chart.title, chart.anchor.from.row, chart.anchor.from.col),
    })),
    rows: compiled.originCells.map((row) => ({
      row: row.row,
      __diffKey: createDiffKey("row", row.row),
      cells: row.cells.map((entry) => ({
        ref: cellRef(entry.row, entry.col),
        row: entry.row,
        col: entry.col,
        value: entry.cell.value,
        formula: entry.cell.formula,
        hyperlink: entry.cell.hyperlink,
        comment: entry.cell.comment,
        style: entry.cell.style,
        colSpan: entry.cell.colSpan,
        rowSpan: entry.cell.rowSpan,
        __diffKey: createDiffKey("cell", cellRef(entry.row, entry.col)),
      })),
    })),
  };
}

function normalizeSpreadsheetDocument(document: unknown): DiffSpreadsheetDocument {
  const parsed = SpreadsheetDocumentSchema.parse(document) as SpreadsheetDocument;

  return {
    meta: parsed.meta,
    theme: parsed.theme,
    defaults: parsed.defaults,
    namedRanges: parsed.namedRanges?.map((namedRange) => ({
      ...namedRange,
      __diffKey: createDiffKey("named-range", namedRange.name, namedRange.scope),
    })),
    sheets: parsed.sheets.map((sheet) => ({
      ...normalizeSheet(sheet),
      __diffKey: createDiffKey("sheet", sheet.name),
    })),
  };
}

function findNearestObjectWithField(
  context: DiffInterpretContext<DiffSpreadsheetDocument>,
  fieldName: string,
): DiffableRecord | undefined {
  for (let index = context.path.length; index > 0; index -= 1) {
    const candidatePath = context.path.slice(0, index);
    const afterValue = asRecord(getValueAtPath(context.normalizedAfter, candidatePath));
    if (afterValue && fieldName in afterValue) {
      return afterValue;
    }
    const beforeValue = asRecord(getValueAtPath(context.normalizedBefore, candidatePath));
    if (beforeValue && fieldName in beforeValue) {
      return beforeValue;
    }
  }

  return undefined;
}

function capitalize(value: string): string {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function verbPhrase(type: Change["type"]): string {
  switch (type) {
    case "added":
      return "added";
    case "removed":
      return "removed";
    case "moved":
      return "moved";
    default:
      return "changed";
  }
}

function interpretTopLevel(context: DiffInterpretContext<DiffSpreadsheetDocument>): DiffInterpretResult | undefined {
  if (context.path[0] === "sheets" && typeof context.path[1] === "number" && context.path.length === 2) {
    const sheet = asRecord(context.after) ?? asRecord(context.before);
    const sheetName = typeof sheet?.name === "string" ? sheet.name : `Sheet ${(context.path[1] as number) + 1}`;
    return {
      description: `Sheet "${sheetName}" ${verbPhrase(context.type)}`,
      severity: "major",
      summaryLabel: `sheet ${context.type === "modified" ? "modified" : context.type}`,
    };
  }

  if (context.path[0] === "namedRanges") {
    return {
      description: "Named range changed",
      severity: "minor",
      summaryLabel: "named range modified",
    };
  }

  if (context.path[0] === "meta" || context.path[0] === "theme" || context.path[0] === "defaults") {
    return {
      description: `${String(context.path[0])} changed`,
      severity: "cosmetic",
      summaryLabel: "workbook styling modified",
    };
  }

  return undefined;
}

function interpretSpreadsheetChange(context: DiffInterpretContext<DiffSpreadsheetDocument>): DiffInterpretResult {
  const topLevel = interpretTopLevel(context);
  if (topLevel) {
    return topLevel;
  }

  const sheetName = getSheetName(context);
  const sheetLabel = sheetName ? `"${sheetName}"` : "workbook";

  if (sheetName && pathIncludes(context.path, "mergeRanges")) {
    const mergeRange = findNearestObjectWithField(context, "ref");
    const ref = typeof mergeRange?.ref === "string" ? mergeRange.ref : "merged range";
    return {
      description: `Merged range ${ref} ${verbPhrase(context.type)} in ${sheetLabel}`,
      severity: "major",
      summaryLabel: `merged range ${context.type === "modified" ? "modified" : context.type}`,
    };
  }

  if (sheetName && pathIncludes(context.path, "tables")) {
    const table = findNearestObjectWithField(context, "name");
    const tableName = typeof table?.name === "string" ? table.name : "table";
    return {
      description: `Table "${tableName}" ${verbPhrase(context.type)} in ${sheetLabel}`,
      severity: context.type === "modified" ? "minor" : "major",
      summaryLabel: `table ${context.type === "modified" ? "modified" : context.type}`,
    };
  }

  if (sheetName && pathIncludes(context.path, "charts")) {
    return {
      description: `Chart changed in ${sheetLabel}`,
      severity: context.type === "modified" ? "minor" : "major",
      summaryLabel: `chart ${context.type === "modified" ? "modified" : context.type}`,
    };
  }

  if (sheetName && pathIncludes(context.path, "rows")) {
    const rowObject = findNearestObjectWithField(context, "row");
    const cellObject = findNearestObjectWithField(context, "ref");
    const rowNumber = typeof rowObject?.row === "number" ? rowObject.row + 1 : undefined;
    const cellName = typeof cellObject?.ref === "string" ? cellObject.ref : undefined;

    if (cellName) {
      if (pathIncludes(context.path, "formula")) {
        return {
          description: `Formula changed for cell ${cellName} in ${sheetLabel}`,
          severity: "minor",
          summaryLabel: "formula modified",
        };
      }

      if (pathIncludes(context.path, "comment")) {
        return {
          description: `Comment changed for cell ${cellName} in ${sheetLabel}`,
          severity: "minor",
          summaryLabel: "comment modified",
        };
      }

      if (pathIncludes(context.path, "hyperlink")) {
        return {
          description: `Hyperlink changed for cell ${cellName} in ${sheetLabel}`,
          severity: "minor",
          summaryLabel: "hyperlink modified",
        };
      }

      return {
        description: `Cell ${cellName} changed in ${sheetLabel}`,
        severity: "minor",
        summaryLabel: "cell modified",
      };
    }

    if (rowNumber !== undefined) {
      return {
        description: `Row ${rowNumber} ${verbPhrase(context.type)} in ${sheetLabel}`,
        severity: context.type === "modified" ? "minor" : "major",
        summaryLabel: `row ${context.type === "modified" ? "modified" : context.type}`,
      };
    }
  }

  return {
    description: `${capitalize(context.pathString)} ${verbPhrase(context.type)}`,
    severity: context.type === "modified" ? "minor" : "major",
    summaryLabel: `sheet content ${context.type === "modified" ? "modified" : context.type}`,
  };
}

const spreadsheetDiffPlugin: DiffPlugin<DiffSpreadsheetDocument> = {
  normalize: normalizeSpreadsheetDocument,
  interpretChange: interpretSpreadsheetChange,
};

export function diffSpreadsheetDocuments(
  before: SpreadsheetDocument,
  after: SpreadsheetDocument,
  options?: DiffOptions,
): ChangeSet {
  return diffSchemaDocuments(before, after, spreadsheetDiffPlugin, options);
}

export type {
  Change,
  ChangeSet,
  DiffOptions,
} from "@runstamp/document-diff";
