import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { DETERMINISTIC_ZIP_DATE } from "./assembly/xlsx-assembler.js";
import {
  SpreadsheetTemplateAssemblyError,
  SpreadsheetValidationError,
  type SpreadsheetTemplateAssemblyIssue,
  type SpreadsheetValidationIssue,
} from "./errors.js";
import { offsetFormulaRows, shiftFormulaRows } from "./formulas/shift.js";
import {
  getTemplateSourceParts,
  type SpreadsheetTemplateIndex,
} from "./template-parser.js";
import type { CellValue } from "./types/spreadsheet-ast.js";
import { isErrorValue, isRichTextValue } from "./types/spreadsheet-ast.js";
import { cellRef, colIndexToLetter, parseCellRef, parseRangeRef } from "./utils/cell-ref.js";
import { dateToSerialString } from "./utils/date.js";
import { XML_DECLARATION, formatNumberForCell, needsXmlSpacePreserve, sanitizeSharedString } from "./utils/xml.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: false,
});


export interface SpreadsheetTemplateRangeInput {
  values: CellValue[][];
}

export type SpreadsheetTemplateValueInput = CellValue | SpreadsheetTemplateRangeInput;
export type SpreadsheetTemplateRowExpansionValue = CellValue | undefined;

export interface SpreadsheetTemplateRowExpansionInput {
  rows: SpreadsheetTemplateRowExpansionValue[][];
}

export interface SpreadsheetTemplateAssemblyInput {
  namedRanges?: Record<string, SpreadsheetTemplateValueInput>;
  cells?: Record<string, Record<string, CellValue>>;
  officeData?: Record<string, unknown>;
  rowExpansions?: Record<string, SpreadsheetTemplateRowExpansionInput>;
}

export type SpreadsheetTemplateSyntax = "auto" | "namedRanges" | "office";

export interface SpreadsheetTemplateAssemblyOptions {
  deterministic?: boolean;
  removeUnfilled?: boolean;
  strictMode?: boolean;
  syntax?: SpreadsheetTemplateSyntax;
}

interface TemplateCellMutation {
  ref: string;
  value: CellValue;
}

interface TemplateRowExpansionPlan {
  name: string;
  sheetPath: string;
  sheetName: string;
  startRowNumber: number;
  endRowNumber: number;
  startCol: number;
  endCol: number;
  rows: SpreadsheetTemplateRowExpansionValue[][];
}

interface OfficeRowControl {
  kind: "if" | "loop";
  path: string;
}

interface OfficeTemplateScanResult {
  mutations: Map<string, TemplateCellMutation[]>;
  rowPlans: Map<string, TemplateRowExpansionPlan[]>;
}

const KEEP_CELL_VALUE = Symbol("KEEP_CELL_VALUE");
const OFFICE_VALUE_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::format\(([^{}]*)\))?\}/g;
const OFFICE_LOOP_START_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):start\}/g;
const OFFICE_LOOP_END_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):end\}/g;
const OFFICE_IF_START_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):if\}/g;
const OFFICE_IF_END_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):endif\}/g;

function isTemplateRangeInput(value: SpreadsheetTemplateValueInput): value is SpreadsheetTemplateRangeInput {
  return typeof value === "object" && value !== null && "values" in value;
}

function isTemplateRowExpansionInput(value: unknown): value is SpreadsheetTemplateRowExpansionInput {
  return typeof value === "object" && value !== null && "rows" in value;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeOfficePath(path: string): string {
  return path.replace(/\[(\d+)\]/g, ".$1");
}

function resolveOfficePathValue(source: unknown, path: string): unknown {
  const segments = normalizeOfficePath(path).split(".").filter(Boolean);
  let current = source;

  for (const segment of segments) {
    if (current == null) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function resolveOfficeValue(
  rootData: Record<string, unknown>,
  path: string,
  context?: unknown,
): unknown {
  const contextual = context === undefined ? undefined : resolveOfficePathValue(context, path);
  if (contextual !== undefined) {
    return contextual;
  }
  return resolveOfficePathValue(rootData, path);
}

function isTruthyOfficeValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

function formatOfficeValue(value: unknown, spec?: string): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (!spec) {
    return String(value);
  }

  if (typeof value === "number" && /0/.test(spec)) {
    const decimalMatch = /\.([0]+)/.exec(spec);
    const fractionDigits = decimalMatch?.[1]?.length ?? 0;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: spec.includes(","),
    }).format(value);
  }

  if (/[YMD]/i.test(spec)) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return spec
        .replace(/YYYY/g, String(date.getUTCFullYear()))
        .replace(/MM/g, String(date.getUTCMonth() + 1).padStart(2, "0"))
        .replace(/DD/g, String(date.getUTCDate()).padStart(2, "0"));
    }
  }

  return String(value);
}

function getTextNodeContent(node: unknown): string {
  if (typeof node === "string") {
    return node;
  }
  if (!node || typeof node !== "object") {
    return "";
  }

  if ("#text" in node && typeof node["#text"] === "string") {
    return node["#text"];
  }

  if ("t" in node) {
    return getTextNodeContent((node as Record<string, unknown>).t);
  }

  if ("r" in node) {
    return asArray((node as Record<string, unknown>).r).map((run) => getTextNodeContent(run)).join("");
  }

  return "";
}

function parseSharedStringTable(xml: string | undefined): string[] {
  if (!xml) {
    return [];
  }
  const document = xmlParser.parse(xml);
  return asArray(document?.sst?.si).map((entry) => getTextNodeContent(entry));
}

function getCellText(cell: any, sharedStrings: string[]): string {
  const type = String(cell?.["@_t"] ?? "");
  if (type === "s") {
    const sharedIndex = Number(cell?.v ?? -1);
    return Number.isInteger(sharedIndex) ? (sharedStrings[sharedIndex] ?? "") : "";
  }
  if (type === "inlineStr") {
    return getTextNodeContent(cell?.is);
  }
  if (typeof cell?.v === "string") {
    return cell.v;
  }
  return "";
}

function collectOfficeControlPaths(texts: string[], kind: OfficeRowControl["kind"]): Set<string> {
  const starts = new Set<string>();
  const ends = new Set<string>();
  const startPattern = kind === "loop" ? OFFICE_LOOP_START_PATTERN : OFFICE_IF_START_PATTERN;
  const endPattern = kind === "loop" ? OFFICE_LOOP_END_PATTERN : OFFICE_IF_END_PATTERN;

  for (const text of texts) {
    for (const match of text.matchAll(startPattern)) {
      if (match[1]) {
        starts.add(match[1]);
      }
    }
    for (const match of text.matchAll(endPattern)) {
      if (match[1]) {
        ends.add(match[1]);
      }
    }
  }

  return new Set([...starts].filter((path) => ends.has(path)));
}

function findOfficeRowControl(texts: string[]): OfficeRowControl | undefined {
  const loopPaths = collectOfficeControlPaths(texts, "loop");
  if (loopPaths.size > 0) {
    return { kind: "loop", path: [...loopPaths][0]! };
  }
  const ifPaths = collectOfficeControlPaths(texts, "if");
  if (ifPaths.size > 0) {
    return { kind: "if", path: [...ifPaths][0]! };
  }
  return undefined;
}

function stripOfficeControlMarkers(text: string, control?: OfficeRowControl): string {
  if (!control) {
    return text;
  }

  if (control.kind === "loop") {
    return text
      .replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:start\\}`, "g"), "")
      .replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:end\\}`, "g"), "");
  }

  return text
    .replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:if\\}`, "g"), "")
    .replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:endif\\}`, "g"), "");
}

function hasOfficeValueMarker(text: string): boolean {
  OFFICE_VALUE_PATTERN.lastIndex = 0;
  return OFFICE_VALUE_PATTERN.test(text);
}

function renderOfficeCellTemplate(
  originalText: string,
  rootData: Record<string, unknown>,
  options: SpreadsheetTemplateAssemblyOptions | undefined,
  context?: unknown,
  control?: OfficeRowControl,
): CellValue | typeof KEEP_CELL_VALUE {
  let working = stripOfficeControlMarkers(originalText, control);
  const hadMarkers = working !== originalText || hasOfficeValueMarker(working);
  const directMatch = /^\s*\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::format\(([^{}]*)\))?\}\s*$/.exec(working);

  if (directMatch && !directMatch[2]) {
    const rawValue = resolveOfficeValue(rootData, directMatch[1] ?? "", context);
    if (rawValue === undefined) {
      if (options?.strictMode) {
        throw new SpreadsheetTemplateAssemblyError([{
          code: "TEMPLATE_INJECTION_UNSUPPORTED",
          message: `Missing data for Office placeholder ${directMatch[0]}`,
        }]);
      }
      return options?.removeUnfilled || hadMarkers ? "" : KEEP_CELL_VALUE;
    }
    if (
      typeof rawValue === "string"
      || typeof rawValue === "number"
      || typeof rawValue === "boolean"
      || rawValue instanceof Date
      || rawValue === null
    ) {
      return rawValue;
    }
    return String(rawValue);
  }

  working = working.replace(OFFICE_VALUE_PATTERN, (full, path: string, formatSpec?: string) => {
    const value = resolveOfficeValue(rootData, path, context);
    if (value === undefined) {
      if (options?.strictMode) {
        throw new SpreadsheetTemplateAssemblyError([{
          code: "TEMPLATE_INJECTION_UNSUPPORTED",
          message: `Missing data for Office placeholder ${full}`,
        }]);
      }
      return options?.removeUnfilled ? "" : full;
    }
    return formatOfficeValue(value, formatSpec);
  });

  if (!hadMarkers && working === originalText) {
    return KEEP_CELL_VALUE;
  }

  return working;
}

function buildOfficeRowValues(
  row: any,
  sharedStrings: string[],
  rootData: Record<string, unknown>,
  options: SpreadsheetTemplateAssemblyOptions | undefined,
  control: OfficeRowControl,
  context?: unknown,
): SpreadsheetTemplateRowExpansionValue[] {
  const cells = ensureCells(row);
  const parsedCells = cells.map((cell) => ({
    cell,
    parsed: parseCellRef(String(cell["@_r"])),
    text: getCellText(cell, sharedStrings),
  }));
  const startCol = parsedCells.reduce((min, entry) => Math.min(min, entry.parsed.col), Number.POSITIVE_INFINITY);
  const endCol = parsedCells.reduce((max, entry) => Math.max(max, entry.parsed.col), Number.NEGATIVE_INFINITY);
  const rowValues: SpreadsheetTemplateRowExpansionValue[] = [];

  for (let col = startCol; col <= endCol; col += 1) {
    const entry = parsedCells.find((candidate) => candidate.parsed.col === col);
    if (!entry) {
      rowValues.push(undefined);
      continue;
    }
    const rendered = renderOfficeCellTemplate(entry.text, rootData, options, context, control);
    rowValues.push(rendered === KEEP_CELL_VALUE ? undefined : rendered);
  }

  return rowValues;
}

function buildOfficeTemplateScan(
  index: SpreadsheetTemplateIndex,
  sourceParts: Map<string, Buffer>,
  officeData: Record<string, unknown>,
  options?: SpreadsheetTemplateAssemblyOptions,
): OfficeTemplateScanResult {
  const sharedStrings = parseSharedStringTable(sourceParts.get("xl/sharedStrings.xml")?.toString("utf8"));
  const rowPlans = new Map<string, TemplateRowExpansionPlan[]>();
  const mutations = new Map<string, TemplateCellMutation[]>();

  for (const sheet of index.sheets) {
    const sheetXml = sourceParts.get(sheet.path)?.toString("utf8");
    if (!sheetXml) {
      continue;
    }

    const worksheetDocument = xmlParser.parse(sheetXml);
    const worksheet = worksheetDocument.worksheet ?? {};
    const rows = ensureRows(worksheet);

    for (const row of rows) {
      const cells = ensureCells(row);
      if (cells.length === 0) {
        continue;
      }

      const texts = cells.map((cell) => getCellText(cell, sharedStrings));
      const control = findOfficeRowControl(texts);

      if (control) {
        const rowNumber = Number(row["@_r"] ?? 0);
        const parsedCells = cells.map((cell) => parseCellRef(String(cell["@_r"])));
        const startCol = parsedCells.reduce((min, parsed) => Math.min(min, parsed.col), Number.POSITIVE_INFINITY);
        const endCol = parsedCells.reduce((max, parsed) => Math.max(max, parsed.col), Number.NEGATIVE_INFINITY);
        const plans = rowPlans.get(sheet.path) ?? [];

        if (control.kind === "loop") {
          const value = resolveOfficeValue(officeData, control.path);
          const items = Array.isArray(value) ? value : [];
          plans.push({
            name: `office:${control.path}`,
            sheetPath: sheet.path,
            sheetName: sheet.name,
            startRowNumber: rowNumber,
            endRowNumber: rowNumber,
            startCol,
            endCol,
            rows: items.map((item) => buildOfficeRowValues(row, sharedStrings, officeData, options, control, item)),
          });
        } else {
          const includeRow = isTruthyOfficeValue(resolveOfficeValue(officeData, control.path));
          plans.push({
            name: `office:${control.path}`,
            sheetPath: sheet.path,
            sheetName: sheet.name,
            startRowNumber: rowNumber,
            endRowNumber: rowNumber,
            startCol,
            endCol,
            rows: includeRow ? [buildOfficeRowValues(row, sharedStrings, officeData, options, control)] : [],
          });
        }

        rowPlans.set(sheet.path, plans);
        continue;
      }

      const sheetMutations = mutations.get(sheet.path) ?? [];
      for (const cell of cells) {
        const text = getCellText(cell, sharedStrings);
        if (!hasOfficeValueMarker(text)) {
          continue;
        }
        const rendered = renderOfficeCellTemplate(text, officeData, options);
        if (rendered === KEEP_CELL_VALUE) {
          continue;
        }
        sheetMutations.push({
          ref: String(cell["@_r"]),
          value: rendered,
        });
      }
      if (sheetMutations.length > 0) {
        mutations.set(sheet.path, sheetMutations);
      }
    }
  }

  for (const [sheetPath, plans] of rowPlans) {
    rowPlans.set(sheetPath, plans.sort((left, right) => right.startRowNumber - left.startRowNumber));
  }

  return { mutations, rowPlans };
}

function dateToSerialStr(value: Date): string {
  return dateToSerialString(value);
}

function parseDefinedNameSheetName(ref: string): string | undefined {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return undefined;
  }
  return (match[1] ?? match[2] ?? "").replaceAll("''", "'");
}

function assertTemplateDefinedNamesResolve(workbookXml: string): void {
  const workbookDocument = xmlParser.parse(workbookXml);
  const workbook = workbookDocument.workbook ?? {};
  const sheetNames = new Set(
    asArray(workbook.sheets?.sheet).map((sheet) => String(sheet?.["@_name"] ?? "")).filter(Boolean),
  );
  const issues: SpreadsheetValidationIssue[] = [];

  asArray(workbook.definedNames?.definedName).forEach((definedName, index) => {
    const ref = typeof definedName === "string" ? definedName : definedName?.["#text"];
    const name = typeof definedName === "object" && definedName !== null
      ? String(definedName["@_name"] ?? `definedName[${index}]`)
      : `definedName[${index}]`;
    if (typeof ref !== "string") {
      return;
    }
    const sheetName = parseDefinedNameSheetName(ref);
    if (sheetName && !sheetNames.has(sheetName)) {
      issues.push({
        path: `definedNames[${index}]`,
        code: "NAMED_RANGE_INVALID",
        message: `Named range ${name} references missing sheet ${sheetName}`,
      });
    }
  });

  if (issues.length > 0) {
    throw new SpreadsheetValidationError(issues);
  }
}

function ensureRows(worksheet: any): any[] {
  const sheetData = worksheet.sheetData ?? (worksheet.sheetData = {});
  if (sheetData.row === undefined) {
    sheetData.row = [];
  } else if (!Array.isArray(sheetData.row)) {
    sheetData.row = [sheetData.row];
  }
  return sheetData.row;
}

function ensureCells(row: any): any[] {
  if (row.c === undefined) {
    row.c = [];
  } else if (!Array.isArray(row.c)) {
    row.c = [row.c];
  }
  return row.c;
}

function findOrCreateRow(worksheet: any, rowNumber: number): any {
  const rows = ensureRows(worksheet);
  const existing = rows.find((row) => Number(row["@_r"]) === rowNumber);
  if (existing) {
    return existing;
  }

  const created = { "@_r": String(rowNumber), c: [] as any[] };
  const insertIndex = rows.findIndex((row) => Number(row["@_r"]) > rowNumber);
  if (insertIndex === -1) {
    rows.push(created);
  } else {
    rows.splice(insertIndex, 0, created);
  }
  return created;
}

function findOrCreateCell(row: any, ref: string): any {
  const cells = ensureCells(row);
  const target = parseCellRef(ref);
  const existing = cells.find((cell) => String(cell["@_r"]) === ref);
  if (existing) {
    return existing;
  }

  const created = { "@_r": ref };
  const insertIndex = cells.findIndex((cell) => parseCellRef(String(cell["@_r"])).col > target.col);
  if (insertIndex === -1) {
    cells.push(created);
  } else {
    cells.splice(insertIndex, 0, created);
  }
  return created;
}

function clearCellPayload(cell: any): void {
  delete cell["@_t"];
  delete cell.f;
  delete cell.v;
  delete cell.is;
}

function setCellValue(cell: any, value: CellValue): void {
  if (isRichTextValue(value)) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_INJECTION_UNSUPPORTED",
      message: "Rich text injection is not yet supported for template assembly",
    }]);
  }

  clearCellPayload(cell);

  if (value === null) {
    return;
  }

  if (typeof value === "string") {
    const sanitized = sanitizeSharedString(value);
    cell["@_t"] = "inlineStr";
    cell.is = {
      t: needsXmlSpacePreserve(sanitized)
        ? { "@_xml:space": "preserve", "#text": sanitized }
        : sanitized,
    };
    return;
  }

  if (typeof value === "number") {
    cell.v = formatNumberForCell(value);
    return;
  }

  if (typeof value === "boolean") {
    cell["@_t"] = "b";
    cell.v = value ? "1" : "0";
    return;
  }

  if (value instanceof Date) {
    cell.v = dateToSerialStr(value);
    return;
  }

  if (isErrorValue(value)) {
    cell["@_t"] = "e";
    cell.v = value.error;
    return;
  }
}

function parseCellParts(ref: string): { column: string; rowNumber: number; absoluteColumn: boolean; absoluteRow: boolean } {
  const match = /^(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)$/.exec(ref);
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }

  return {
    absoluteColumn: match[1] === "$",
    column: match[2] ?? "",
    absoluteRow: match[3] === "$",
    rowNumber: Number(match[4]),
  };
}

function serializeCellParts(parts: { column: string; rowNumber: number; absoluteColumn: boolean; absoluteRow: boolean }): string {
  return `${parts.absoluteColumn ? "$" : ""}${parts.column}${parts.absoluteRow ? "$" : ""}${parts.rowNumber}`;
}

function shiftCellReference(ref: string, insertionRow: number, rowDelta: number): string {
  const parts = parseCellParts(ref);
  if (parts.rowNumber < insertionRow) {
    return ref;
  }

  return serializeCellParts({
    ...parts,
    rowNumber: parts.rowNumber + rowDelta,
  });
}

function shiftRangeReference(rangeRef: string, anchorRowNumber: number, rowDelta: number): string {
  const [startRef, endRef] = rangeRef.split(":");
  if (!endRef) {
    return shiftCellReference(rangeRef, anchorRowNumber + 1, rowDelta);
  }

  const start = parseCellParts(startRef);
  const end = parseCellParts(endRef);
  if (end.rowNumber < anchorRowNumber) {
    return rangeRef;
  }

  if (start.rowNumber > anchorRowNumber) {
    return `${serializeCellParts({ ...start, rowNumber: start.rowNumber + rowDelta })}:${serializeCellParts({ ...end, rowNumber: end.rowNumber + rowDelta })}`;
  }

  return `${serializeCellParts(start)}:${serializeCellParts({ ...end, rowNumber: end.rowNumber + rowDelta })}`;
}

function shiftSqref(sqref: string, anchorRowNumber: number, rowDelta: number): string {
  return sqref
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => shiftRangeReference(segment, anchorRowNumber, rowDelta))
    .join(" ");
}

function mapSingleRowRangeToRow(rangeRef: string, targetRowNumber: number): string {
  const [startRef, endRef] = rangeRef.split(":");
  const start = parseCellParts(startRef);
  const end = parseCellParts(endRef ?? startRef);
  return `${serializeCellParts({ ...start, rowNumber: targetRowNumber })}:${serializeCellParts({ ...end, rowNumber: targetRowNumber })}`;
}

function cloneNode<T>(value: T): T {
  return structuredClone(value);
}

function updateCellRowReference(ref: string, rowNumber: number): string {
  const parts = parseCellParts(ref);
  return serializeCellParts({
    ...parts,
    rowNumber,
  });
}

function getFormulaText(cell: any): string | undefined {
  if (typeof cell.f === "string") {
    return cell.f;
  }
  if (cell.f && typeof cell.f === "object" && typeof cell.f["#text"] === "string") {
    return cell.f["#text"];
  }
  return undefined;
}

function setFormulaText(cell: any, expression: string): void {
  if (typeof cell.f === "string") {
    cell.f = expression;
    return;
  }
  if (cell.f && typeof cell.f === "object") {
    cell.f["#text"] = expression;
  }
}

function clearFormulaCachedValue(cell: any): void {
  delete cell["@_t"];
  delete cell.v;
  delete cell.is;
}

function recomputeWorksheetDimension(worksheet: any): void {
  const rows = ensureRows(worksheet);
  let maxRowNumber = 1;
  let maxColIndex = 0;

  for (const row of rows) {
    const rowNumber = Number(row["@_r"] ?? 1);
    maxRowNumber = Math.max(maxRowNumber, rowNumber);
    for (const cell of ensureCells(row)) {
      const parsed = parseCellRef(String(cell["@_r"]));
      maxColIndex = Math.max(maxColIndex, parsed.col);
    }
  }

  for (const mergeCell of asArray(worksheet.mergeCells?.mergeCell)) {
    const range = parseRangeRef(String(mergeCell["@_ref"]));
    maxRowNumber = Math.max(maxRowNumber, range.endRow + 1);
    maxColIndex = Math.max(maxColIndex, range.endCol);
  }

  worksheet.dimension = {
    "@_ref": `${cellRef(0, 0)}:${cellRef(maxRowNumber - 1, maxColIndex)}`,
  };
}

function buildRowExpansionPlans(
  index: SpreadsheetTemplateIndex,
  injection: SpreadsheetTemplateAssemblyInput,
): Map<string, TemplateRowExpansionPlan[]> {
  const plans = new Map<string, TemplateRowExpansionPlan[]>();
  const issues: SpreadsheetTemplateAssemblyIssue[] = [];
  const namedRangeByName = new Map(index.namedRanges.map((namedRange) => [namedRange.name, namedRange] as const));
  const sheetByName = new Map(index.sheets.map((sheet) => [sheet.name, sheet] as const));

  for (const [name, input] of Object.entries(injection.rowExpansions ?? {})) {
    if (!isTemplateRowExpansionInput(input)) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion input for ${name} is invalid`,
        path: name,
      });
      continue;
    }

    const namedRange = namedRangeByName.get(name);
    if (!namedRange) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template named range ${name} does not exist`,
        path: name,
      });
      continue;
    }

    const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(namedRange.ref.trim());
    if (!match) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion anchor ${name} does not use a plain sheet-local A1 reference`,
        path: name,
      });
      continue;
    }

    const sheetName = (match[1] ?? match[2] ?? "").replaceAll("''", "'");
    const sheet = sheetByName.get(sheetName);
    if (!sheet) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template sheet ${sheetName} for row expansion ${name} does not exist`,
        path: name,
      });
      continue;
    }

    const range = parseRangeRef(match[3] ?? "");
    if (range.startRow !== range.endRow) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion anchor ${name} must span exactly one row`,
        path: name,
      });
      continue;
    }

    const sheetPlans = plans.get(sheet.path) ?? [];
    if (sheetPlans.some((plan) => plan.startRowNumber === range.startRow + 1)) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion anchors on the same sheet must target distinct template rows (${sheetName})`,
        path: name,
      });
      continue;
    }

    const expectedWidth = range.endCol - range.startCol + 1;
    if (input.rows.some((row) => row.length !== expectedWidth)) {
      issues.push({
        code: "TEMPLATE_INJECTION_SHAPE_MISMATCH",
        message: `Row expansion ${name} expects rows with ${expectedWidth} cells`,
        path: name,
      });
      continue;
    }

    sheetPlans.push({
      name,
      sheetPath: sheet.path,
      sheetName,
      startRowNumber: range.startRow + 1,
      endRowNumber: range.endRow + 1,
      startCol: range.startCol,
      endCol: range.endCol,
      rows: input.rows,
    });
    plans.set(sheet.path, sheetPlans);
  }

  if (issues.length > 0) {
    throw new SpreadsheetTemplateAssemblyError(issues);
  }

  for (const [sheetPath, sheetPlans] of plans) {
    plans.set(sheetPath, sheetPlans.sort((left, right) => right.startRowNumber - left.startRowNumber));
  }

  return plans;
}

function buildNamedRangeMutations(
  index: SpreadsheetTemplateIndex,
  injection: SpreadsheetTemplateAssemblyInput,
): Map<string, TemplateCellMutation[]> {
  const mutations = new Map<string, TemplateCellMutation[]>();
  const issues: SpreadsheetTemplateAssemblyIssue[] = [];
  const sheetPathByName = new Map(index.sheets.map((sheet) => [sheet.name, sheet.path] as const));
  const namedRangeByName = new Map(index.namedRanges.map((namedRange) => [namedRange.name, namedRange] as const));

  for (const [rangeName, input] of Object.entries(injection.namedRanges ?? {})) {
    const namedRange = namedRangeByName.get(rangeName);
    if (!namedRange) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template named range ${rangeName} does not exist`,
        path: rangeName,
      });
      continue;
    }

    const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(namedRange.ref.trim());
    if (!match) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Named range ${rangeName} does not use a plain sheet-local A1 reference`,
        path: rangeName,
      });
      continue;
    }

    const sheetName = (match[1] ?? match[2] ?? "").replaceAll("''", "'");
    const rangeRef = match[3] ?? "";
    const sheetPath = sheetPathByName.get(sheetName);
    if (!sheetPath) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template sheet ${sheetName} for named range ${rangeName} does not exist`,
        path: rangeName,
      });
      continue;
    }

    const range = parseRangeRef(rangeRef);
    const rowCount = range.endRow - range.startRow + 1;
    const colCount = range.endCol - range.startCol + 1;
    const sheetMutations = mutations.get(sheetPath) ?? [];

    if (isTemplateRangeInput(input)) {
      if (input.values.length !== rowCount || input.values.some((row) => row.length !== colCount)) {
        issues.push({
          code: "TEMPLATE_INJECTION_SHAPE_MISMATCH",
          message: `Named range ${rangeName} expects a ${rowCount}x${colCount} matrix`,
          path: rangeName,
        });
        continue;
      }
      input.values.forEach((row, rowOffset) => {
        row.forEach((value, colOffset) => {
          sheetMutations.push({
            ref: cellRef(range.startRow + rowOffset, range.startCol + colOffset),
            value,
          });
        });
      });
      mutations.set(sheetPath, sheetMutations);
      continue;
    }

    if (rowCount !== 1 || colCount !== 1) {
      issues.push({
        code: "TEMPLATE_INJECTION_SHAPE_MISMATCH",
        message: `Named range ${rangeName} spans ${rowCount}x${colCount}; provide a values matrix for multi-cell injections`,
        path: rangeName,
      });
      continue;
    }

    sheetMutations.push({
      ref: cellRef(range.startRow, range.startCol),
      value: input,
    });
    mutations.set(sheetPath, sheetMutations);
  }

  for (const [sheetName, sheetCells] of Object.entries(injection.cells ?? {})) {
    const sheetPath = sheetPathByName.get(sheetName);
    if (!sheetPath) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template sheet ${sheetName} does not exist`,
        path: sheetName,
      });
      continue;
    }
    const sheetMutations = mutations.get(sheetPath) ?? [];
    for (const [ref, value] of Object.entries(sheetCells)) {
      sheetMutations.push({ ref, value });
    }
    mutations.set(sheetPath, sheetMutations);
  }

  if (issues.length > 0) {
    throw new SpreadsheetTemplateAssemblyError(issues);
  }

  return mutations;
}

function applySingleRowExpansionToSheet(sheetXml: string, plan: TemplateRowExpansionPlan): string {
  const worksheetDocument = xmlParser.parse(sheetXml);
  const worksheet = worksheetDocument.worksheet ?? {};
  const rows = ensureRows(worksheet);
  const templateRow = rows.find((row) => Number(row["@_r"]) === plan.startRowNumber);
  if (!templateRow) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_INJECTION_TARGET_MISSING",
      message: `Template row ${plan.startRowNumber} for ${plan.name} was not found in ${plan.sheetName}`,
      path: plan.name,
    }]);
  }

  const rowDelta = plan.rows.length - 1;
  const insertionRow = plan.startRowNumber + 1;
  const newRows: any[] = [];

  for (const row of rows) {
    const rowNumber = Number(row["@_r"] ?? 0);
    if (rowNumber < plan.startRowNumber) {
      newRows.push(row);
      continue;
    }

    if (rowNumber === plan.startRowNumber) {
      for (let offset = 0; offset < plan.rows.length; offset += 1) {
        const clonedRow = cloneNode(templateRow);
        const targetRowNumber = plan.startRowNumber + offset;
        const rowValues = plan.rows[offset] ?? [];
        clonedRow["@_r"] = String(targetRowNumber);
        for (const cell of ensureCells(clonedRow)) {
          const parsed = parseCellRef(String(cell["@_r"]));
          const formulaText = getFormulaText(cell);
          cell["@_r"] = updateCellRowReference(String(cell["@_r"]), targetRowNumber);
          if (parsed.col >= plan.startCol && parsed.col <= plan.endCol) {
            const injectedValue = rowValues[parsed.col - plan.startCol];
            if (injectedValue !== undefined) {
              setCellValue(cell, injectedValue);
            } else if (formulaText) {
              setFormulaText(cell, offsetFormulaRows(formulaText, {
                currentSheetName: plan.sheetName,
                targetSheetName: plan.sheetName,
                rowOffset: offset,
              }));
              clearFormulaCachedValue(cell);
            }
            continue;
          }
          if (formulaText) {
            setFormulaText(cell, offsetFormulaRows(formulaText, {
              currentSheetName: plan.sheetName,
              targetSheetName: plan.sheetName,
              rowOffset: offset,
            }));
            clearFormulaCachedValue(cell);
          }
        }
        newRows.push(clonedRow);
      }
      continue;
    }

    const shiftedRow = cloneNode(row);
    shiftedRow["@_r"] = String(rowNumber + rowDelta);
    for (const cell of ensureCells(shiftedRow)) {
      cell["@_r"] = updateCellRowReference(String(cell["@_r"]), rowNumber + rowDelta);
      const formulaText = getFormulaText(cell);
      if (formulaText) {
        setFormulaText(cell, shiftFormulaRows(formulaText, {
          currentSheetName: plan.sheetName,
          targetSheetName: plan.sheetName,
          insertionRow,
          rowDelta,
        }));
        clearFormulaCachedValue(cell);
      }
    }
    newRows.push(shiftedRow);
  }

  worksheet.sheetData = {
    ...(worksheet.sheetData ?? {}),
    row: newRows,
  };

  const mergeCells = asArray(worksheet.mergeCells?.mergeCell);
  if (mergeCells.length > 0) {
    const shiftedMerges: any[] = [];
    for (const mergeCell of mergeCells) {
      const ref = String(mergeCell["@_ref"]);
      const range = parseRangeRef(ref);
      const startRowNumber = range.startRow + 1;
      const endRowNumber = range.endRow + 1;
      if (endRowNumber < plan.startRowNumber) {
        shiftedMerges.push(mergeCell);
        continue;
      }
      if (startRowNumber > plan.startRowNumber) {
        shiftedMerges.push({ "@_ref": shiftRangeReference(ref, plan.startRowNumber, rowDelta) });
        continue;
      }
      if (startRowNumber === plan.startRowNumber && endRowNumber === plan.startRowNumber) {
        for (let offset = 0; offset < plan.rows.length; offset += 1) {
          shiftedMerges.push({
            "@_ref": mapSingleRowRangeToRow(ref, plan.startRowNumber + offset),
          });
        }
        continue;
      }
      throw new SpreadsheetTemplateAssemblyError([{
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion ${plan.name} cannot yet duplicate merges spanning multiple rows`,
        path: plan.name,
      }]);
    }
    worksheet.mergeCells = shiftedMerges.length > 0
      ? { "@_count": String(shiftedMerges.length), mergeCell: shiftedMerges }
      : undefined;
  }

  for (const conditionalFormatting of asArray(worksheet.conditionalFormatting)) {
    if (conditionalFormatting?.["@_sqref"]) {
      conditionalFormatting["@_sqref"] = shiftSqref(String(conditionalFormatting["@_sqref"]), plan.startRowNumber, rowDelta);
    }
  }

  const validations = asArray(worksheet.dataValidations?.dataValidation);
  validations.forEach((validation) => {
    if (validation?.["@_sqref"]) {
      validation["@_sqref"] = shiftSqref(String(validation["@_sqref"]), plan.startRowNumber, rowDelta);
    }
  });
  if (worksheet.dataValidations) {
    worksheet.dataValidations["@_count"] = String(validations.length);
  }

  const hyperlinks = asArray(worksheet.hyperlinks?.hyperlink);
  if (hyperlinks.length > 0) {
    const shiftedHyperlinks: any[] = [];
    for (const hyperlink of hyperlinks) {
      const ref = String(hyperlink["@_ref"]);
      const range = parseRangeRef(ref);
      const startRowNumber = range.startRow + 1;
      const endRowNumber = range.endRow + 1;
      if (endRowNumber < plan.startRowNumber) {
        shiftedHyperlinks.push(hyperlink);
        continue;
      }
      if (startRowNumber > plan.startRowNumber) {
        shiftedHyperlinks.push({
          ...hyperlink,
          "@_ref": shiftRangeReference(ref, plan.startRowNumber, rowDelta),
        });
        continue;
      }
      if (startRowNumber === plan.startRowNumber && endRowNumber === plan.startRowNumber) {
        for (let offset = 0; offset < plan.rows.length; offset += 1) {
          shiftedHyperlinks.push({
            ...cloneNode(hyperlink),
            "@_ref": mapSingleRowRangeToRow(ref, plan.startRowNumber + offset),
          });
        }
        continue;
      }
      shiftedHyperlinks.push({
        ...hyperlink,
        "@_ref": shiftRangeReference(ref, plan.startRowNumber, rowDelta),
      });
    }
    worksheet.hyperlinks = { hyperlink: shiftedHyperlinks };
  }

  if (worksheet.autoFilter?.["@_ref"]) {
    worksheet.autoFilter["@_ref"] = shiftRangeReference(String(worksheet.autoFilter["@_ref"]), plan.startRowNumber, rowDelta);
  }
  if (worksheet.sheetViews?.sheetView?.pane?.["@_topLeftCell"]) {
    const topLeftCell = String(worksheet.sheetViews.sheetView.pane["@_topLeftCell"]);
    worksheet.sheetViews.sheetView.pane["@_topLeftCell"] = shiftCellReference(topLeftCell, insertionRow, rowDelta);
  }
  const selections = asArray(worksheet.sheetViews?.sheetView?.selection);
  selections.forEach((selection) => {
    if (selection?.["@_activeCell"]) {
      selection["@_activeCell"] = shiftCellReference(String(selection["@_activeCell"]), insertionRow, rowDelta);
    }
    if (selection?.["@_sqref"]) {
      selection["@_sqref"] = shiftSqref(String(selection["@_sqref"]), plan.startRowNumber, rowDelta);
    }
  });

  recomputeWorksheetDimension(worksheet);
  return XML_DECLARATION + xmlBuilder.build({ worksheet });
}

function applyRowExpansionsToSheet(sheetXml: string, plans: TemplateRowExpansionPlan[]): string {
  let xml = sheetXml;
  for (const plan of plans) {
    xml = applySingleRowExpansionToSheet(xml, plan);
  }
  return xml;
}

function applySingleRowExpansionToTable(tableXml: string, plan: TemplateRowExpansionPlan): string {
  const tableDocument = xmlParser.parse(tableXml);
  const table = tableDocument.table ?? {};

  if (typeof table["@_ref"] === "string") {
    table["@_ref"] = shiftRangeReference(String(table["@_ref"]), plan.startRowNumber, plan.rows.length - 1);
  }
  if (table.autoFilter?.["@_ref"]) {
    table.autoFilter["@_ref"] = shiftRangeReference(String(table.autoFilter["@_ref"]), plan.startRowNumber, plan.rows.length - 1);
  }

  return XML_DECLARATION + xmlBuilder.build({ table });
}

function applyRowExpansionsToTable(tableXml: string, plans: TemplateRowExpansionPlan[]): string {
  let xml = tableXml;
  for (const plan of plans) {
    xml = applySingleRowExpansionToTable(xml, plan);
  }
  return xml;
}

function applyMutationsToSheet(sheetXml: string, mutations: TemplateCellMutation[]): string {
  const worksheetDocument = xmlParser.parse(sheetXml);
  const worksheet = worksheetDocument.worksheet ?? {};

  for (const mutation of mutations) {
    const parsedRef = parseCellRef(mutation.ref);
    const row = findOrCreateRow(worksheet, parsedRef.row + 1);
    const cell = findOrCreateCell(row, mutation.ref);
    setCellValue(cell, mutation.value);
  }

  return XML_DECLARATION + xmlBuilder.build({ worksheet });
}

function countSharedStringReferences(sheetXml: string): number {
  const worksheetDocument = xmlParser.parse(sheetXml);
  const worksheet = worksheetDocument.worksheet ?? {};
  let count = 0;

  for (const row of asArray(worksheet?.sheetData?.row)) {
    for (const cell of asArray(row?.c)) {
      if (String(cell?.["@_t"] ?? "") === "s") {
        count += 1;
      }
    }
  }

  return count;
}

async function buildAssembledTemplateZip(
  index: SpreadsheetTemplateIndex,
  injection: SpreadsheetTemplateAssemblyInput,
  options?: SpreadsheetTemplateAssemblyOptions,
): Promise<JSZip> {
  const sourceParts = getTemplateSourceParts(index);
  if (!sourceParts) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_SOURCE_MISSING",
      message: "Template source parts have been garbage collected. Hold a reference to the template index or re-parse the template buffer.",
    }]);
  }

  const strippedActions = index.sanitization.actions.filter((action) => action.disposition === "stripped");
  if (strippedActions.length > 0) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_ASSEMBLY_UNSAFE_SANITIZATION",
      message: "Template assembly is not yet supported after sanitization strips unsafe parts",
    }]);
  }

  const rowExpansionPlans = buildRowExpansionPlans(index, injection);
  const mutations = buildNamedRangeMutations(index, injection);
  const syntax = options?.syntax ?? "auto";
  if ((syntax === "office" || syntax === "auto") && injection.officeData) {
    const officeScan = buildOfficeTemplateScan(index, sourceParts, injection.officeData, options);
    for (const [sheetPath, plans] of officeScan.rowPlans) {
      const combined = [...(rowExpansionPlans.get(sheetPath) ?? []), ...plans];
      const uniqueStartRows = new Set<number>();
      for (const plan of combined) {
        if (uniqueStartRows.has(plan.startRowNumber)) {
          throw new SpreadsheetTemplateAssemblyError([{
            code: "TEMPLATE_INJECTION_UNSUPPORTED",
            message: `Template row ${plan.startRowNumber} on ${plan.sheetName} cannot mix multiple row-expansion strategies`,
            path: plan.name,
          }]);
        }
        uniqueStartRows.add(plan.startRowNumber);
      }
      rowExpansionPlans.set(sheetPath, combined.sort((left, right) => right.startRowNumber - left.startRowNumber));
    }
    for (const [sheetPath, officeMutations] of officeScan.mutations) {
      mutations.set(sheetPath, [...(mutations.get(sheetPath) ?? []), ...officeMutations]);
    }
  }
  const zip = new JSZip();
  const deterministic = options?.deterministic !== false;
  const fileOptions = deterministic ? { date: DETERMINISTIC_ZIP_DATE } : undefined;
  const finalSheetXml = new Map<string, string>();
  const workbookXml = sourceParts.get("xl/workbook.xml")?.toString("utf8");
  let updatedWorkbookXml = workbookXml;
  const tablePlansByPath = new Map(
    index.tables
      .map((table) => {
        const sheet = index.sheets.find((candidate) => candidate.name === table.sheetName);
        if (!sheet) {
          return null;
        }
        const plans = rowExpansionPlans.get(sheet.path);
        if (!plans || plans.length === 0) {
          return null;
        }
        return [table.path, plans] as const;
      })
      .filter((entry): entry is readonly [string, TemplateRowExpansionPlan[]] => entry !== null),
  );

  if (updatedWorkbookXml) {
    const workbookDocument = xmlParser.parse(updatedWorkbookXml);
    const workbook = workbookDocument.workbook ?? {};
    const definedNames = asArray(workbook.definedNames?.definedName);
    for (const sheetPlans of rowExpansionPlans.values()) {
      for (const plan of sheetPlans) {
        const rowDelta = plan.rows.length - 1;
        for (const definedName of definedNames) {
          const text = typeof definedName === "string" ? definedName : definedName?.["#text"];
          if (typeof text !== "string") {
            continue;
          }
          const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(text.trim());
          if (!match) {
            continue;
          }
          const sheetName = (match[1] ?? match[2] ?? "").replaceAll("''", "'");
          if (sheetName !== plan.sheetName) {
            continue;
          }
          const updatedRef = String(definedName["@_name"]) === plan.name
            ? `${match[0].slice(0, match[0].lastIndexOf("!") + 1)}${colIndexToLetter(plan.startCol)}${plan.startRowNumber}:${colIndexToLetter(plan.endCol)}${plan.startRowNumber + rowDelta}`
            : `${match[0].slice(0, match[0].lastIndexOf("!") + 1)}${shiftRangeReference(match[3] ?? "", plan.startRowNumber, rowDelta)}`;
          if (typeof definedName === "object" && definedName !== null) {
            definedName["#text"] = updatedRef;
          }
        }
      }
    }
    updatedWorkbookXml = XML_DECLARATION + xmlBuilder.build({ workbook });
    assertTemplateDefinedNamesResolve(updatedWorkbookXml);
  }

  for (const path of index.partNames) {
    const source = sourceParts.get(path);
    if (!source) {
      continue;
    }

    let updated = source;
    if (path === "xl/workbook.xml" && updatedWorkbookXml) {
      updated = Buffer.from(updatedWorkbookXml, "utf8");
    } else if (path.endsWith(".xml")) {
      let xml = source.toString("utf8");
      if (rowExpansionPlans.has(path)) {
        xml = applyRowExpansionsToSheet(xml, rowExpansionPlans.get(path)!);
      }
      if (tablePlansByPath.has(path)) {
        xml = applyRowExpansionsToTable(xml, tablePlansByPath.get(path)!);
      }
      if (mutations.has(path)) {
        xml = applyMutationsToSheet(xml, mutations.get(path) ?? []);
      }
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) {
        finalSheetXml.set(path, xml);
      }
      updated = Buffer.from(xml, "utf8");
    }
    zip.file(path, updated, fileOptions);
  }

  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  if (sharedStringsFile) {
    const sharedStringsDocument = xmlParser.parse(await sharedStringsFile.async("string"));
    const totalReferences = [...finalSheetXml.values()].reduce((sum, sheetXml) => sum + countSharedStringReferences(sheetXml), 0);
    if (sharedStringsDocument?.sst) {
      sharedStringsDocument.sst["@_count"] = String(totalReferences);
      zip.file("xl/sharedStrings.xml", XML_DECLARATION + xmlBuilder.build({ sst: sharedStringsDocument.sst }), fileOptions);
    }
  }

  return zip;
}

export async function assembleFromTemplate(
  index: SpreadsheetTemplateIndex,
  injection: SpreadsheetTemplateAssemblyInput,
  options?: SpreadsheetTemplateAssemblyOptions,
): Promise<Buffer> {
  const zip = await buildAssembledTemplateZip(index, injection, options);
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function assembleFromTemplateStream(
  index: SpreadsheetTemplateIndex,
  injection: SpreadsheetTemplateAssemblyInput,
  options?: SpreadsheetTemplateAssemblyOptions,
): Promise<NodeJS.ReadableStream> {
  const zip = await buildAssembledTemplateZip(index, injection, options);
  return zip.generateNodeStream({
    type: "nodebuffer",
    streamFiles: true,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
