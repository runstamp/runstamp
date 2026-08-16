import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { DETERMINISTIC_ZIP_DATE } from "../assembly/xlsx-assembler.js";
import { cellRef, parseCellRef, parseRangeRef, rangeRef } from "../utils/cell-ref.js";
import { XML_DECLARATION } from "../utils/xml.js";

export type SpreadsheetFindingSeverity = "info" | "warning" | "error";
export type SpreadsheetFindingCategory =
  | "package"
  | "relationship"
  | "workbook"
  | "worksheet"
  | "styleString"
  | "table"
  | "security"
  | "compatibility"
  | "operational";
export type SpreadsheetValidationVerdict = "clean" | "warnings" | "errors";
export type SpreadsheetFindingCode =
  | "MISSING_CONTENT_TYPE"
  | "EXTRA_CONTENT_TYPE"
  | "ORPHAN_RELATIONSHIP"
  | "DUPLICATE_RELATIONSHIP_ID"
  | "MISSING_WORKSHEET_PART"
  | "STYLE_INDEX_OOB"
  | "SHARED_STRING_INDEX_OOB"
  | "SHEET_NAME_INVALID"
  | "DUPLICATE_SHEET_NAME"
  | "FORMULA_CACHED_VALUE_MISSING"
  | "BROKEN_TABLE_RELATIONSHIP"
  | "DUPLICATE_TABLE_NAME"
  | "INVALID_TABLE_REF"
  | "DIMENSION_MISMATCH"
  | "INVALID_RANGE_REF"
  | "MERGE_OVERLAP"
  | "MERGE_RANGE_OUT_OF_BOUNDS"
  | "DEFINED_NAME_INVALID"
  | "HYPERLINK_TARGET_INVALID"
  | "MACRO_STRIPPED"
  | "EXTERNAL_CONNECTION_STRIPPED"
  | "GOOGLE_SHEETS_IMPORT_RISK"
  | "NUMBERS_COMPATIBILITY_WARNING"
  | "LARGE_FILE_WARNING"
  | "HIGH_UNIQUE_STRING_COUNT"
  | "EXCESSIVE_STYLE_CARDINALITY"
  | "STREAM_MODE_RECOMMENDED";

export interface SpreadsheetFinding {
  code: SpreadsheetFindingCode;
  severity: SpreadsheetFindingSeverity;
  category: SpreadsheetFindingCategory;
  message: string;
  location?: {
    path?: string;
    sheetName?: string;
    cellRef?: string;
    rangeRef?: string;
  };
  metadata?: Record<string, string | number | boolean>;
  repairable: boolean;
  repaired?: boolean;
  crossAppCritical: boolean;
}

export interface SpreadsheetBufferValidateOptions {
  maxPartCount?: number;
}

export interface SpreadsheetRepairOptions extends SpreadsheetBufferValidateOptions {
  fixContentTypes?: boolean;
  removeOrphanRelationships?: boolean;
  clampStyleIndices?: boolean;
  repairSharedStringIndices?: boolean;
  stripUnsafeArtifacts?: boolean;
  normalizeDuplicateTableNames?: boolean;
  clipTableRefs?: boolean;
  repairMerges?: boolean;
  repairWorksheetDimensions?: boolean;
  removeInvalidHyperlinks?: boolean;
  clipDataValidationRanges?: boolean;
  removeInvalidDefinedNames?: boolean;
  deterministic?: boolean;
}

export interface SpreadsheetValidationSummary {
  verdict: SpreadsheetValidationVerdict;
  findings: SpreadsheetFinding[];
}

export interface SpreadsheetRepairAction {
  code: string;
  description: string;
  path?: string;
}

export interface SpreadsheetRepairResult {
  buffer: Buffer;
  repaired: boolean;
  actions: SpreadsheetRepairAction[];
  findings: SpreadsheetFinding[];
  riskyTransformations: boolean;
}

export interface SpreadsheetRepairValidationResult {
  original: SpreadsheetValidationSummary;
  repair: SpreadsheetRepairResult;
  repaired: SpreadsheetValidationSummary;
}

interface WorkbookInspection {
  findings: SpreadsheetFinding[];
  paths: string[];
  missingOverrides: string[];
  extraOverrides: string[];
  orphanRelationships: Array<{
    relPath: string;
    id: string;
    type: string;
    resolvedTarget: string;
  }>;
  duplicateRelationshipIds: Array<{
    relPath: string;
    id: string;
  }>;
  invalidSheetNames: Array<{
    sheetName: string;
  }>;
  duplicateSheetNames: Array<{
    sheetName: string;
  }>;
  styleOutOfBounds: Array<{
    sheetPath: string;
    cellRef: string;
    styleIndex: number;
  }>;
  sharedStringOutOfBounds: Array<{
    sheetPath: string;
    cellRef: string;
    sharedStringIndex: number;
  }>;
  invalidTableRefs: Array<{
    tablePath: string;
    ref: string;
    sheetPath?: string;
    maxRow?: number;
    maxCol?: number;
  }>;
  duplicateTableNames: Array<{
    tablePath: string;
    displayName: string;
  }>;
  worksheetDimensionMismatches: Array<{
    sheetPath: string;
    expectedRef: string;
    actualRef: string;
  }>;
  invalidMerges: Array<{
    sheetPath: string;
    ref: string;
  }>;
  overlappingMerges: Array<{
    sheetPath: string;
    ref: string;
    overlapsWith: string;
  }>;
  invalidHyperlinks: Array<{
    sheetPath: string;
    ref: string;
  }>;
  invalidDataValidationRanges: Array<{
    sheetPath: string;
    sqref: string;
  }>;
  invalidDefinedNames: Array<{
    name: string;
    ref: string;
  }>;
  formulaCachedValueMissing: Array<{
    sheetPath: string;
    cellRef: string;
  }>;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  ignoreDeclaration: true,
  trimValues: false,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: true,
});

const STRIPPABLE_PART_PATTERNS: Array<{ pattern: RegExp; code: SpreadsheetFindingCode; message: string }> = [
  { pattern: /^xl\/vbaProject\.bin$/i, code: "MACRO_STRIPPED", message: "Removed VBA macro payload during repair" },
  { pattern: /^xl\/connections(\.xml|\/)/i, code: "EXTERNAL_CONNECTION_STRIPPED", message: "Removed external connection metadata during repair" },
  { pattern: /^xl\/externalLinks(\/|\.xml)/i, code: "EXTERNAL_CONNECTION_STRIPPED", message: "Removed external workbook link metadata during repair" },
  { pattern: /^xl\/embeddings\//i, code: "EXTERNAL_CONNECTION_STRIPPED", message: "Removed embedded OLE payload during repair" },
];
const EXCEL_MAX_ROW_INDEX = 1_048_575;
const EXCEL_MAX_COL_INDEX = 16_383;
const INVALID_SHEET_NAME_PATTERN = /[\\/*?:[\]]/;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function resolveWorksheetRowNumber(row: any, rowIndex: number): number {
  const explicit = Number(row?.["@_r"] ?? "");
  return Number.isFinite(explicit) && explicit > 0 ? explicit : rowIndex + 1;
}

function resolveWorksheetCellRef(cell: any, rowNumber: number, cellIndex: number): string {
  const explicit = String(cell?.["@_r"] ?? "");
  if (explicit) {
    return explicit;
  }
  return rowNumber > 0 ? cellRef(rowNumber - 1, cellIndex) : "";
}

function getTextContent(node: unknown): string {
  if (typeof node === "string") {
    return node;
  }
  if (typeof node === "object" && node !== null && "#text" in node && typeof node["#text"] === "string") {
    return node["#text"];
  }
  return "";
}

function getRelationshipSourceBaseSegments(relPath: string): string[] {
  if (relPath === "_rels/.rels") {
    return [];
  }

  const segments = relPath.split("/");
  const relsDirectoryIndex = segments.lastIndexOf("_rels");
  const fileName = segments[segments.length - 1]?.replace(/\.rels$/, "");
  const baseSegments = segments.slice(0, relsDirectoryIndex);

  if (fileName && fileName !== ".rels") {
    baseSegments.push(fileName);
  }

  return baseSegments.slice(0, -1);
}

function resolveRelationshipTarget(relPath: string, target: string): string {
  const baseSegments = getRelationshipSourceBaseSegments(relPath);
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      baseSegments.pop();
      continue;
    }
    baseSegments.push(segment);
  }
  return baseSegments.join("/");
}

function worksheetRelsPathForSheet(sheetPath: string): string {
  return sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", fileName) => `${prefix}_rels/${fileName}.xml.rels`);
}

function serializeRangeOrCell(startRow: number, startCol: number, endRow: number, endCol: number): string {
  return startRow === endRow && startCol === endCol
    ? cellRef(startRow, startCol)
    : rangeRef(startRow, startCol, endRow, endCol);
}

function rangeRefsMatch(leftRef: string, rightRef: string): boolean {
  try {
    const left = parseRangeRef(leftRef);
    const right = parseRangeRef(rightRef);
    return left.startRow === right.startRow
      && left.startCol === right.startCol
      && left.endRow === right.endRow
      && left.endCol === right.endCol;
  } catch {
    return false;
  }
}

function isRangeWithinExcelBounds(range: { startRow: number; startCol: number; endRow: number; endCol: number }): boolean {
  return range.startRow >= 0
    && range.startCol >= 0
    && range.endRow <= EXCEL_MAX_ROW_INDEX
    && range.endCol <= EXCEL_MAX_COL_INDEX;
}

function clipRangeToExcelBounds(ref: string): string | null {
  try {
    const range = parseRangeRef(ref);
    const clippedStartRow = Math.max(0, Math.min(range.startRow, EXCEL_MAX_ROW_INDEX));
    const clippedStartCol = Math.max(0, Math.min(range.startCol, EXCEL_MAX_COL_INDEX));
    const clippedEndRow = Math.max(0, Math.min(range.endRow, EXCEL_MAX_ROW_INDEX));
    const clippedEndCol = Math.max(0, Math.min(range.endCol, EXCEL_MAX_COL_INDEX));
    if (clippedStartRow > clippedEndRow || clippedStartCol > clippedEndCol) {
      return null;
    }
    return serializeRangeOrCell(clippedStartRow, clippedStartCol, clippedEndRow, clippedEndCol);
  } catch {
    return null;
  }
}

function rangesOverlap(
  left: { startRow: number; startCol: number; endRow: number; endCol: number },
  right: { startRow: number; startCol: number; endRow: number; endCol: number },
): boolean {
  return left.startRow <= right.endRow
    && left.endRow >= right.startRow
    && left.startCol <= right.endCol
    && left.endCol >= right.startCol;
}

function parseSheetQualifiedRef(ref: string): { sheetName: string; target: string } | null {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return null;
  }
  return {
    sheetName: (match[1] ?? match[2] ?? "").replaceAll("''", "'"),
    target: (match[3] ?? "").trim(),
  };
}

function isClearlyInvalidDefinedNameRef(ref: string, knownSheets: Set<string>): boolean {
  const parsed = parseSheetQualifiedRef(ref);
  if (!parsed) {
    return false;
  }
  if (!knownSheets.has(parsed.sheetName)) {
    return true;
  }

  const segments = parsed.target.split(",").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    return true;
  }

  let attemptedA1Segment = false;
  for (const segment of segments) {
    if (segment.includes("(") || segment.includes(")")) {
      return false;
    }
    if (!/[A-Z]+\$?\d|\$?[A-Z]+\$?\d/i.test(segment)) {
      continue;
    }
    attemptedA1Segment = true;
    try {
      const range = parseRangeRef(segment.toUpperCase());
      if (!isRangeWithinExcelBounds(range)) {
        return true;
      }
    } catch {
      return true;
    }
  }

  return attemptedA1Segment ? false : false;
}

function isInvalidSheetName(sheetName: string): boolean {
  return sheetName.length === 0
    || sheetName.length > 31
    || INVALID_SHEET_NAME_PATTERN.test(sheetName)
    || /^'|'$/.test(sheetName);
}

function sanitizeSheetName(sheetName: string, usedNames: Set<string>): string {
  let base = sheetName
    .replace(INVALID_SHEET_NAME_PATTERN, "_")
    .replace(/^'+|'+$/g, "")
    .trim();
  if (!base) {
    base = "Sheet";
  }
  if (base.length > 31) {
    base = base.slice(0, 31);
  }
  let candidate = base;
  let suffix = 1;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffixText = `_${suffix++}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffixText.length))}${suffixText}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function collectWorksheetExtent(worksheet: any): { maxRow: number; maxCol: number; ref: string } {
  let maxRow = 0;
  let maxCol = 0;

  asArray(worksheet?.sheetData?.row).forEach((row, rowIndex) => {
    const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
    asArray(row.c).forEach((cell, cellIndex) => {
      const ref = resolveWorksheetCellRef(cell, rowNumber, cellIndex);
      if (!ref) {
        return;
      }
      const parsedRef = parseCellRef(ref);
      maxRow = Math.max(maxRow, parsedRef.row);
      maxCol = Math.max(maxCol, parsedRef.col);
    });
  });

  for (const mergeCell of asArray(worksheet?.mergeCells?.mergeCell)) {
    const ref = String(mergeCell["@_ref"] ?? "");
    try {
      const range = parseRangeRef(ref);
      maxRow = Math.max(maxRow, range.endRow);
      maxCol = Math.max(maxCol, range.endCol);
    } catch {
      // ignore invalid merge refs here; separate validation/repair can handle them later
    }
  }

  return {
    maxRow,
    maxCol,
    ref: serializeRangeOrCell(0, 0, maxRow, maxCol),
  };
}

function parseXmlAttributes(fragment: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(fragment)) !== null) {
    const [, name = "", value = ""] = match;
    attributes[name] = value;
  }

  return attributes;
}

function forEachWorksheetCellXml(
  sheetXml: string,
  callback: (cell: { attributes: Record<string, string>; innerXml: string; ref: string }) => void,
): void {
  const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  let inferredRowNumber = 1;
  while ((rowMatch = rowPattern.exec(sheetXml)) !== null) {
    const rowAttributes = parseXmlAttributes(rowMatch[1] ?? "");
    const explicitRowNumber = Number(rowAttributes.r ?? "");
    const rowNumber = Number.isFinite(explicitRowNumber) && explicitRowNumber > 0
      ? explicitRowNumber
      : inferredRowNumber;
    const rowXml = rowMatch[2] ?? "";
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cellMatch: RegExpExecArray | null;
    let inferredCol = 0;

    while ((cellMatch = cellPattern.exec(rowXml)) !== null) {
      const attributes = parseXmlAttributes(cellMatch[1] ?? cellMatch[3] ?? "");
      let ref = attributes.r ?? "";
      if (ref) {
        inferredCol = parseCellRef(ref).col + 1;
      } else if (Number.isFinite(rowNumber) && rowNumber > 0) {
        ref = cellRef(rowNumber - 1, inferredCol);
        inferredCol += 1;
      }

      callback({
        attributes,
        innerXml: cellMatch[2] ?? "",
        ref,
      });
    }

    inferredRowNumber = rowNumber + 1;
  }
}

function collectWorksheetExtentFromXml(sheetXml: string): { maxRow: number; maxCol: number; ref: string } {
  let maxRow = 0;
  let maxCol = 0;

  forEachWorksheetCellXml(sheetXml, ({ ref }) => {
    if (!ref) {
      return;
    }
    const parsedRef = parseCellRef(ref);
    maxRow = Math.max(maxRow, parsedRef.row);
    maxCol = Math.max(maxCol, parsedRef.col);
  });

  const mergePattern = /<mergeCell\b[^>]*\bref="([^"]+)"/g;
  let mergeMatch: RegExpExecArray | null;
  while ((mergeMatch = mergePattern.exec(sheetXml)) !== null) {
    const ref = mergeMatch[1] ?? "";
    try {
      const range = parseRangeRef(ref);
      maxRow = Math.max(maxRow, range.endRow);
      maxCol = Math.max(maxCol, range.endCol);
    } catch {
      // ignore invalid merge refs here; separate validation/repair can handle them later
    }
  }

  return {
    maxRow,
    maxCol,
    ref: serializeRangeOrCell(0, 0, maxRow, maxCol),
  };
}

function normalizeSqrefSegments(sqref: string): string[] {
  return sqref.split(/\s+/).map((segment) => segment.trim()).filter(Boolean);
}

function cellHasSerializedPayload(cell: any): boolean {
  return cell["@_t"] !== undefined
    || cell.f !== undefined
    || cell.v !== undefined
    || cell.is !== undefined;
}

function knownContentTypeForPath(path: string): string | undefined {
  if (path === "xl/workbook.xml") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
  if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";
  if (/^xl\/tables\/table\d+\.xml$/.test(path)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml";
  if (path === "xl/styles.xml") return "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml";
  if (path === "xl/sharedStrings.xml") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml";
  if (path === "xl/theme/theme1.xml") return "application/vnd.openxmlformats-officedocument.theme+xml";
  if (path === "docProps/core.xml") return "application/vnd.openxmlformats-package.core-properties+xml";
  if (path === "docProps/app.xml") return "application/vnd.openxmlformats-officedocument.extended-properties+xml";
  return undefined;
}

function verdictFromFindings(findings: SpreadsheetFinding[]): SpreadsheetValidationVerdict {
  if (findings.some((finding) => finding.severity === "error")) {
    return "errors";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "warnings";
  }
  return "clean";
}

async function inspectWorkbook(buffer: Buffer, options?: SpreadsheetBufferValidateOptions): Promise<WorkbookInspection> {
  const zip = await JSZip.loadAsync(buffer);
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir).sort();
  const pathSet = new Set(paths);
  const findings: SpreadsheetFinding[] = [];

  if (paths.length > (options?.maxPartCount ?? 2_000)) {
    findings.push({
      code: "EXTRA_CONTENT_TYPE",
      severity: "warning",
      category: "package",
      message: `Workbook contains an unusually high number of parts (${paths.length})`,
      repairable: false,
      crossAppCritical: false,
    });
  }

  const contentTypesXml = await zip.file("[Content_Types].xml")?.async("string");
  const contentTypes = contentTypesXml ? xmlParser.parse(contentTypesXml)?.Types : null;
  const overridePaths = new Set(asArray(contentTypes?.Override).map((override) => String(override["@_PartName"]).replace(/^\//, "")));
  const nonDefaultXmlParts = paths.filter((path) => path.endsWith(".xml") && path !== "[Content_Types].xml" && path !== "_rels/.rels" && !path.endsWith(".xml.rels"));
  const nonDefaultXmlPartSet = new Set(nonDefaultXmlParts);
  const missingOverrides = nonDefaultXmlParts.filter((path) => knownContentTypeForPath(path) && !overridePaths.has(path));
  const extraOverrides = [...overridePaths].filter((path) => !nonDefaultXmlPartSet.has(path));

  missingOverrides.forEach((path) => {
    findings.push({
      code: "MISSING_CONTENT_TYPE",
      severity: "error",
      category: "package",
      message: `Missing content type override for ${path}`,
      location: { path },
      repairable: true,
      crossAppCritical: true,
    });
  });

  extraOverrides.forEach((path) => {
    findings.push({
      code: "EXTRA_CONTENT_TYPE",
      severity: "warning",
      category: "package",
      message: `Content type override references a missing part: ${path}`,
      location: { path },
      repairable: true,
      crossAppCritical: false,
    });
  });

  const orphanRelationships: WorkbookInspection["orphanRelationships"] = [];
  const duplicateRelationshipIds: WorkbookInspection["duplicateRelationshipIds"] = [];
  const relationshipPaths = paths.filter((path) => path.endsWith(".rels"));
  for (const relPath of relationshipPaths) {
    const relXml = await zip.file(relPath)?.async("string");
    const rels = xmlParser.parse(relXml ?? "")?.Relationships;
    const seenRelationshipIds = new Set<string>();
    for (const relationship of asArray(rels?.Relationship)) {
      const relationshipId = String(relationship["@_Id"] ?? "");
      if (relationshipId) {
        if (seenRelationshipIds.has(relationshipId)) {
          duplicateRelationshipIds.push({ relPath, id: relationshipId });
          findings.push({
            code: "DUPLICATE_RELATIONSHIP_ID",
            severity: "error",
            category: "relationship",
            message: `Relationship ${relationshipId} is duplicated in ${relPath}`,
            location: { path: relPath },
            metadata: { relationshipId },
            repairable: true,
            crossAppCritical: true,
          });
        }
        seenRelationshipIds.add(relationshipId);
      }
      const target = String(relationship["@_Target"] ?? "");
      const external = relationship["@_TargetMode"] === "External";
      if (external || target.startsWith("http")) {
        continue;
      }
      const resolvedTarget = resolveRelationshipTarget(relPath, target);
      if (pathSet.has(resolvedTarget)) {
        continue;
      }

      const type = String(relationship["@_Type"] ?? "");
      orphanRelationships.push({
        relPath,
        id: String(relationship["@_Id"] ?? ""),
        type,
        resolvedTarget,
      });
      findings.push({
        code: type.endsWith("/table") ? "BROKEN_TABLE_RELATIONSHIP" : "ORPHAN_RELATIONSHIP",
        severity: "error",
        category: type.endsWith("/table") ? "table" : "relationship",
        message: `Relationship ${relationship["@_Id"]} in ${relPath} targets missing part ${resolvedTarget}`,
        location: { path: relPath },
        metadata: { relationshipId: String(relationship["@_Id"] ?? ""), target: resolvedTarget },
        repairable: true,
        crossAppCritical: true,
      });
    }
  }

  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const workbookRelsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  const workbook = workbookXml ? xmlParser.parse(workbookXml)?.workbook : null;
  if (workbookXml && workbookRelsXml) {
    const workbookRels = xmlParser.parse(workbookRelsXml)?.Relationships;
    const workbookRelMap = new Map(asArray(workbookRels?.Relationship).map((relationship) => [
      String(relationship["@_Id"]),
      resolveRelationshipTarget("xl/_rels/workbook.xml.rels", String(relationship["@_Target"] ?? "")),
    ]));
    for (const sheet of asArray(workbook?.sheets?.sheet)) {
      const sheetPath = workbookRelMap.get(String(sheet["@_r:id"] ?? ""));
      if (sheetPath && pathSet.has(sheetPath)) {
        continue;
      }
      findings.push({
        code: "MISSING_WORKSHEET_PART",
        severity: "error",
        category: "workbook",
        message: `Workbook sheet ${sheet["@_name"]} points to a missing worksheet part`,
        location: { path: "xl/workbook.xml", sheetName: String(sheet["@_name"] ?? "") },
        repairable: false,
        crossAppCritical: true,
      });
    }
  }

  const stylesXml = await zip.file("xl/styles.xml")?.async("string");
  const styleSheet = stylesXml ? xmlParser.parse(stylesXml)?.styleSheet : null;
  const maxStyleIndex = Math.max(0, asArray(styleSheet?.cellXfs?.xf).length - 1);
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const sharedStringsRoot = sharedStringsXml ? xmlParser.parse(sharedStringsXml)?.sst : null;
  const sharedStringCount = asArray(sharedStringsRoot?.si).length;
  const styleOutOfBounds: WorkbookInspection["styleOutOfBounds"] = [];
  const sharedStringOutOfBounds: WorkbookInspection["sharedStringOutOfBounds"] = [];
  const invalidTableRefs: WorkbookInspection["invalidTableRefs"] = [];
  const duplicateTableNames: WorkbookInspection["duplicateTableNames"] = [];
  const invalidSheetNames: WorkbookInspection["invalidSheetNames"] = [];
  const duplicateSheetNames: WorkbookInspection["duplicateSheetNames"] = [];
  const worksheetDimensionMismatches: WorkbookInspection["worksheetDimensionMismatches"] = [];
  const invalidMerges: WorkbookInspection["invalidMerges"] = [];
  const overlappingMerges: WorkbookInspection["overlappingMerges"] = [];
  const invalidHyperlinks: WorkbookInspection["invalidHyperlinks"] = [];
  const invalidDataValidationRanges: WorkbookInspection["invalidDataValidationRanges"] = [];
  const invalidDefinedNames: WorkbookInspection["invalidDefinedNames"] = [];
  const formulaCachedValueMissing: WorkbookInspection["formulaCachedValueMissing"] = [];
  const seenTableNames = new Set<string>();
  const tableSheetExtentMap = new Map<string, { sheetPath: string; maxRow: number; maxCol: number }>();
  const workbookSheetNames = new Set<string>();
  const seenWorkbookSheetNames = new Set<string>();

  if (workbook) {
    const sheets = asArray(workbook?.sheets?.sheet);
    sheets.forEach((sheet) => {
      const name = String(sheet["@_name"] ?? "");
      if (name) {
        if (isInvalidSheetName(name)) {
          invalidSheetNames.push({ sheetName: name });
          findings.push({
            code: "SHEET_NAME_INVALID",
            severity: "error",
            category: "workbook",
            message: `Worksheet name "${name}" is invalid for Excel.`,
            location: { path: "xl/workbook.xml", sheetName: name },
            repairable: true,
            crossAppCritical: true,
          });
        }
        const normalized = name.toLowerCase();
        if (seenWorkbookSheetNames.has(normalized)) {
          duplicateSheetNames.push({ sheetName: name });
          findings.push({
            code: "DUPLICATE_SHEET_NAME",
            severity: "error",
            category: "workbook",
            message: `Worksheet name "${name}" is duplicated.`,
            location: { path: "xl/workbook.xml", sheetName: name },
            repairable: true,
            crossAppCritical: true,
          });
        }
        seenWorkbookSheetNames.add(normalized);
        workbookSheetNames.add(name);
      }
    });
    for (const definedName of asArray(workbook?.definedNames?.definedName)) {
      const name = typeof definedName === "object" && definedName !== null ? String(definedName["@_name"] ?? "") : "";
      const ref = getTextContent(definedName).trim();
      if (!name || !ref || !isClearlyInvalidDefinedNameRef(ref, workbookSheetNames)) {
        continue;
      }
      invalidDefinedNames.push({ name, ref });
      findings.push({
        code: "DEFINED_NAME_INVALID",
        severity: "error",
        category: "workbook",
        message: `Defined name ${name} points to an invalid or missing-sheet reference`,
        location: { path: "xl/workbook.xml", rangeRef: ref },
        metadata: { name },
        repairable: true,
        crossAppCritical: true,
      });
    }
  }

  const sheetPaths = paths.filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
  for (const sheetPath of sheetPaths) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    const sheetXmlText = sheetXml ?? "";
    const extent = collectWorksheetExtentFromXml(sheetXmlText);
    const declaredDimension = sheetXmlText.match(/<dimension\b[^>]*\bref="([^"]+)"/)?.[1] ?? "A1";
    const actualDimension = extent.ref;
    let dimensionMatches = false;
    try {
      const declared = parseRangeRef(declaredDimension);
      const actual = parseRangeRef(actualDimension);
      dimensionMatches = declared.startRow === actual.startRow
        && declared.startCol === actual.startCol
        && declared.endRow === actual.endRow
        && declared.endCol === actual.endCol;
    } catch {
      dimensionMatches = false;
    }
    if (!dimensionMatches) {
      worksheetDimensionMismatches.push({
        sheetPath,
        expectedRef: actualDimension,
        actualRef: declaredDimension,
      });
      findings.push({
        code: "DIMENSION_MISMATCH",
        severity: "error",
        category: "worksheet",
        message: `Worksheet dimension ${declaredDimension} does not match actual populated extent ${actualDimension}`,
        location: { path: sheetPath, rangeRef: declaredDimension },
        metadata: { expectedRef: actualDimension },
        repairable: true,
        crossAppCritical: true,
      });
    }

    forEachWorksheetCellXml(sheetXmlText, ({ attributes, innerXml, ref }) => {
      if (!ref) {
        return;
      }

      if (attributes.s !== undefined) {
        const styleIndex = Number(attributes.s);
        if (styleIndex > maxStyleIndex) {
          styleOutOfBounds.push({
            sheetPath,
            cellRef: ref,
            styleIndex,
          });
          findings.push({
            code: "STYLE_INDEX_OOB",
            severity: "error",
            category: "styleString",
            message: `Cell ${ref} references style index ${styleIndex}, but max style index is ${maxStyleIndex}`,
            location: { path: sheetPath, cellRef: ref },
            metadata: { styleIndex, maxStyleIndex },
            repairable: true,
            crossAppCritical: true,
          });
        }
      }

      if (attributes.t === "s") {
        const valueMatch = /<v>([^<]*)<\/v>/.exec(innerXml);
        const sharedIndex = Number(valueMatch?.[1] ?? "");
        if (!(sharedIndex >= 0 && sharedIndex < sharedStringCount)) {
          sharedStringOutOfBounds.push({
            sheetPath,
            cellRef: ref,
            sharedStringIndex: sharedIndex,
          });
          findings.push({
            code: "SHARED_STRING_INDEX_OOB",
            severity: "error",
            category: "styleString",
            message: `Cell ${ref} references shared string index ${sharedIndex}, but only ${sharedStringCount} entries exist`,
            location: { path: sheetPath, cellRef: ref },
            metadata: { sharedStringIndex: sharedIndex, sharedStringCount },
            repairable: true,
            crossAppCritical: true,
          });
        }
      }

      if (/<f(?:\s|>)/.test(innerXml) && !/<v>[\s\S]*?<\/v>/.test(innerXml)) {
        formulaCachedValueMissing.push({
          sheetPath,
          cellRef: ref,
        });
        findings.push({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
          category: "worksheet",
          message: `Cell ${ref} contains a formula without a cached value.`,
          location: { path: sheetPath, cellRef: ref },
          repairable: true,
          crossAppCritical: true,
        });
      }
    });

    const hyperlinkPattern = /<hyperlink\b[^>]*\bref="([^"]+)"/g;
    let hyperlinkMatch: RegExpExecArray | null;
    while ((hyperlinkMatch = hyperlinkPattern.exec(sheetXmlText)) !== null) {
      const ref = hyperlinkMatch[1] ?? "";
      try {
        const range = parseRangeRef(ref);
        if (!isRangeWithinExcelBounds(range)) {
          throw new Error("out-of-bounds");
        }
      } catch {
        invalidHyperlinks.push({ sheetPath, ref });
        findings.push({
          code: "HYPERLINK_TARGET_INVALID",
          severity: "error",
          category: "worksheet",
          message: `Worksheet hyperlink ref ${ref} is invalid or outside Excel bounds`,
          location: { path: sheetPath, rangeRef: ref },
          repairable: true,
          crossAppCritical: true,
        });
      }
    }

    const dataValidationPattern = /<dataValidation\b[^>]*\bsqref="([^"]+)"/g;
    let dataValidationMatch: RegExpExecArray | null;
    while ((dataValidationMatch = dataValidationPattern.exec(sheetXmlText)) !== null) {
      const sqref = dataValidationMatch[1] ?? "";
      const segments = normalizeSqrefSegments(sqref);
      const valid = segments.length > 0 && segments.every((segment) => {
        try {
          const range = parseRangeRef(segment);
          return isRangeWithinExcelBounds(range);
        } catch {
          return false;
        }
      });
      if (!valid) {
        invalidDataValidationRanges.push({ sheetPath, sqref });
        findings.push({
          code: "INVALID_RANGE_REF",
          severity: "error",
          category: "worksheet",
          message: `Worksheet data validation sqref ${sqref} is invalid or outside Excel bounds`,
          location: { path: sheetPath, rangeRef: sqref },
          repairable: true,
          crossAppCritical: true,
        });
      }
    }

    const validMergeRanges: Array<{
      ref: string;
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    }> = [];
    const mergePattern = /<mergeCell\b[^>]*\bref="([^"]+)"/g;
    let mergeMatch: RegExpExecArray | null;
    while ((mergeMatch = mergePattern.exec(sheetXmlText)) !== null) {
      const ref = mergeMatch[1] ?? "";
      try {
        const range = parseRangeRef(ref);
        if (!isRangeWithinExcelBounds(range)) {
          throw new Error("out-of-bounds");
        }
        const overlap = validMergeRanges.find((existing) => rangesOverlap(existing, range));
        if (overlap) {
          overlappingMerges.push({
            sheetPath,
            ref,
            overlapsWith: overlap.ref,
          });
          findings.push({
            code: "MERGE_OVERLAP",
            severity: "error",
            category: "worksheet",
            message: `Worksheet merge ${ref} overlaps existing merge ${overlap.ref}`,
            location: { path: sheetPath, rangeRef: ref },
            metadata: { overlapsWith: overlap.ref },
            repairable: true,
            crossAppCritical: true,
          });
          continue;
        }
        validMergeRanges.push({
          ref,
          startRow: range.startRow,
          startCol: range.startCol,
          endRow: range.endRow,
          endCol: range.endCol,
        });
      } catch {
        invalidMerges.push({ sheetPath, ref });
        findings.push({
          code: "MERGE_RANGE_OUT_OF_BOUNDS",
          severity: "error",
          category: "worksheet",
          message: `Worksheet merge ref ${ref} is invalid or outside Excel bounds`,
          location: { path: sheetPath, rangeRef: ref },
          repairable: true,
          crossAppCritical: true,
        });
      }
    }

    const sheetRelsPath = worksheetRelsPathForSheet(sheetPath);
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async("string");
    const sheetRels = sheetRelsXml ? xmlParser.parse(sheetRelsXml)?.Relationships : null;
    for (const relationship of asArray(sheetRels?.Relationship)) {
      const type = String(relationship["@_Type"] ?? "");
      if (!type.endsWith("/table")) {
        continue;
      }
      const tablePath = resolveRelationshipTarget(sheetRelsPath, String(relationship["@_Target"] ?? ""));
      tableSheetExtentMap.set(tablePath, {
        sheetPath,
        maxRow: extent.maxRow,
        maxCol: extent.maxCol,
      });
    }
  }

  const tablePaths = paths.filter((path) => /^xl\/tables\/table\d+\.xml$/.test(path));
  for (const tablePath of tablePaths) {
    const tableXml = await zip.file(tablePath)?.async("string");
    const table = xmlParser.parse(tableXml ?? "")?.table;
    const tableName = String(table?.["@_name"] ?? "");
    const displayName = String(table?.["@_displayName"] ?? tableName);
    if (seenTableNames.has(displayName.toLowerCase())) {
      duplicateTableNames.push({
        tablePath,
        displayName,
      });
      findings.push({
        code: "DUPLICATE_TABLE_NAME",
        severity: "error",
        category: "table",
        message: `Duplicate table displayName detected: ${displayName}`,
        location: { path: tablePath },
        repairable: true,
        crossAppCritical: true,
      });
    }
    seenTableNames.add(displayName.toLowerCase());

    try {
      if (table?.["@_ref"]) {
        const parsedRange = parseRangeRef(String(table["@_ref"]));
        const extent = tableSheetExtentMap.get(tablePath);
        if (extent && (parsedRange.endRow > extent.maxRow || parsedRange.endCol > extent.maxCol)) {
          invalidTableRefs.push({
            tablePath,
            ref: String(table["@_ref"]),
            sheetPath: extent.sheetPath,
            maxRow: extent.maxRow,
            maxCol: extent.maxCol,
          });
          findings.push({
            code: "INVALID_TABLE_REF",
            severity: "error",
            category: "table",
            message: `Table ${tableName || tablePath} extends beyond the actual worksheet extent`,
            location: { path: tablePath, rangeRef: String(table["@_ref"]) },
            metadata: {
              maxRow: extent.maxRow + 1,
              maxCol: extent.maxCol + 1,
            },
            repairable: true,
            crossAppCritical: true,
          });
        }
      }
    } catch {
      invalidTableRefs.push({
        tablePath,
        ref: String(table?.["@_ref"] ?? ""),
        sheetPath: tableSheetExtentMap.get(tablePath)?.sheetPath,
        maxRow: tableSheetExtentMap.get(tablePath)?.maxRow,
        maxCol: tableSheetExtentMap.get(tablePath)?.maxCol,
      });
      findings.push({
        code: "INVALID_TABLE_REF",
        severity: "error",
        category: "table",
        message: `Table ${tableName || tablePath} has an invalid A1 ref`,
        location: { path: tablePath, rangeRef: String(table?.["@_ref"] ?? "") },
        repairable: true,
        crossAppCritical: true,
      });
    }
  }

  return {
    findings,
    paths,
    missingOverrides,
    extraOverrides,
    orphanRelationships,
    duplicateRelationshipIds,
    invalidSheetNames,
    duplicateSheetNames,
    styleOutOfBounds,
    sharedStringOutOfBounds,
    invalidTableRefs,
    duplicateTableNames,
    worksheetDimensionMismatches,
    invalidMerges,
    overlappingMerges,
    invalidHyperlinks,
    invalidDataValidationRanges,
    invalidDefinedNames,
    formulaCachedValueMissing,
  };
}

async function repairSharedStringIntegrity(
  zip: JSZip,
  inspection: WorkbookInspection,
  actions: SpreadsheetRepairAction[],
  findings: SpreadsheetFinding[],
  options: SpreadsheetRepairOptions | undefined,
): Promise<void> {
  if (options?.repairSharedStringIndices === false || inspection.sharedStringOutOfBounds.length === 0) {
    return;
  }

  const invalidRefsBySheet = new Map<string, Set<string>>();
  inspection.sharedStringOutOfBounds.forEach((issue) => {
    const refs = invalidRefsBySheet.get(issue.sheetPath) ?? new Set<string>();
    refs.add(issue.cellRef);
    invalidRefsBySheet.set(issue.sheetPath, refs);
  });

  for (const [sheetPath, refs] of invalidRefsBySheet) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (!sheetXml) {
      continue;
    }

    const sheetTree = xmlParser.parse(sheetXml);
    const rows = asArray(sheetTree?.worksheet?.sheetData?.row);
    let changed = false;

    rows.forEach((row, rowIndex) => {
      const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
      const originalCells = asArray(row.c);
      const repairedCells = originalCells.filter((cell, cellIndex) => {
        const ref = resolveWorksheetCellRef(cell, rowNumber, cellIndex);
        if (!refs.has(ref)) {
          return true;
        }

        delete cell["@_t"];
        delete cell.v;
        delete cell.is;
        changed = true;

        return cell["@_s"] !== undefined || cellHasSerializedPayload(cell);
      });

      if (repairedCells.length !== originalCells.length) {
        row.c = repairedCells;
      }
    });

    if (!changed) {
      continue;
    }

    zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
    actions.push({
      code: "REPAIR_SHARED_STRING_INDEX",
      description: `Cleared invalid shared string references in ${sheetPath}`,
      path: sheetPath,
    });
    findings.push({
      code: "SHARED_STRING_INDEX_OOB",
      severity: "warning",
      category: "styleString",
      message: `Cleared invalid shared string references in ${sheetPath}`,
      location: { path: sheetPath },
      repairable: true,
      repaired: true,
      crossAppCritical: false,
    });
  }
}

function buildContentTypesXml(paths: string[]): string {
  const overrides = paths
    .filter((path) => path.endsWith(".xml") && path !== "[Content_Types].xml" && path !== "_rels/.rels" && !path.endsWith(".xml.rels"))
    .map((path) => {
      const contentType = knownContentTypeForPath(path);
      return contentType ? { path, contentType } : null;
    })
    .filter((entry): entry is { path: string; contentType: string } => entry !== null)
    .sort((left, right) => left.path.localeCompare(right.path));

  return [
    XML_DECLARATION,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    ...overrides.map((override) => `<Override PartName="/${override.path}" ContentType="${override.contentType}"/>`),
    `</Types>`,
  ].join("");
}

function stripUnsafeParts(zip: JSZip, actions: SpreadsheetRepairAction[], findings: SpreadsheetFinding[]): void {
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  for (const path of paths) {
    const match = STRIPPABLE_PART_PATTERNS.find((entry) => entry.pattern.test(path));
    if (!match) {
      continue;
    }
    zip.remove(path);
    actions.push({
      code: match.code,
      description: match.message,
      path,
    });
    findings.push({
      code: match.code,
      severity: "warning",
      category: "security",
      message: match.message,
      location: { path },
      repairable: true,
      repaired: true,
      crossAppCritical: false,
    });
  }
}

async function repairTables(
  zip: JSZip,
  actions: SpreadsheetRepairAction[],
  findings: SpreadsheetFinding[],
  options: SpreadsheetRepairOptions | undefined,
): Promise<void> {
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir).sort();
  const sheetPaths = paths.filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
  const tableExtentMap = new Map<string, { maxRow: number; maxCol: number }>();

  for (const sheetPath of sheetPaths) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (!sheetXml) {
      continue;
    }
    const worksheet = xmlParser.parse(sheetXml)?.worksheet;
    const rows = asArray(worksheet?.sheetData?.row);
    let maxRow = 0;
    let maxCol = 0;
    rows.forEach((row, rowIndex) => {
      const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
      asArray(row.c).forEach((cell, cellIndex) => {
        const ref = resolveWorksheetCellRef(cell, rowNumber, cellIndex);
        if (!ref) {
          return;
        }
        const parsed = parseCellRef(ref);
        maxRow = Math.max(maxRow, parsed.row);
        maxCol = Math.max(maxCol, parsed.col);
      });
    });

    const sheetRelsPath = worksheetRelsPathForSheet(sheetPath);
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async("string");
    const sheetRels = sheetRelsXml ? xmlParser.parse(sheetRelsXml)?.Relationships : null;
    for (const relationship of asArray(sheetRels?.Relationship)) {
      if (!String(relationship["@_Type"] ?? "").endsWith("/table")) {
        continue;
      }
      const tablePath = resolveRelationshipTarget(sheetRelsPath, String(relationship["@_Target"] ?? ""));
      tableExtentMap.set(tablePath, { maxRow, maxCol });
    }
  }

  const tablePaths = paths.filter((path) => /^xl\/tables\/table\d+\.xml$/.test(path));
  const seenDisplayNames = new Map<string, number>();
  for (const tablePath of tablePaths) {
    const tableXml = await zip.file(tablePath)?.async("string");
    if (!tableXml) {
      continue;
    }
    const tableTree = xmlParser.parse(tableXml);
    const table = tableTree.table ?? {};
    let changed = false;

    if (options?.normalizeDuplicateTableNames !== false) {
      const currentDisplayName = String(table["@_displayName"] ?? table["@_name"] ?? "");
      const currentName = String(table["@_name"] ?? currentDisplayName);
      const normalized = currentDisplayName.toLowerCase();
      const count = (seenDisplayNames.get(normalized) ?? 0) + 1;
      seenDisplayNames.set(normalized, count);
      if (count > 1 && currentDisplayName) {
        const nextName = `${currentDisplayName}_${count}`;
        table["@_displayName"] = nextName;
        table["@_name"] = `${currentName}_${count}`;
        actions.push({
          code: "NORMALIZE_DUPLICATE_TABLE_NAME",
          description: `Renamed duplicate table ${currentDisplayName} to ${nextName}`,
          path: tablePath,
        });
        findings.push({
          code: "DUPLICATE_TABLE_NAME",
          severity: "warning",
          category: "table",
          message: `Normalized duplicate table name ${currentDisplayName} to ${nextName}`,
          location: { path: tablePath },
          repairable: true,
          repaired: true,
          crossAppCritical: false,
        });
        changed = true;
      }
    }

    if (options?.clipTableRefs !== false && typeof table["@_ref"] === "string") {
      const extent = tableExtentMap.get(tablePath);
      if (extent) {
        try {
          const parsedRef = parseRangeRef(String(table["@_ref"]));
          const clippedEndRow = Math.min(parsedRef.endRow, extent.maxRow);
          const clippedEndCol = Math.min(parsedRef.endCol, extent.maxCol);
          if (clippedEndRow >= parsedRef.startRow && clippedEndCol >= parsedRef.startCol
            && (clippedEndRow !== parsedRef.endRow || clippedEndCol !== parsedRef.endCol)) {
            table["@_ref"] = rangeRef(parsedRef.startRow, parsedRef.startCol, clippedEndRow, clippedEndCol);
            if (table.autoFilter?.["@_ref"]) {
              const autoFilterEndRow = Number(table["@_totalsRowCount"] ?? 0) > 0 && clippedEndRow > parsedRef.startRow
                ? clippedEndRow - 1
                : clippedEndRow;
              table.autoFilter["@_ref"] = rangeRef(parsedRef.startRow, parsedRef.startCol, autoFilterEndRow, clippedEndCol);
            }
            actions.push({
              code: "CLIP_TABLE_REF",
              description: `Clipped table ref for ${tablePath} to sheet extents`,
              path: tablePath,
            });
            findings.push({
              code: "INVALID_TABLE_REF",
              severity: "warning",
              category: "table",
              message: `Clipped table ref for ${tablePath} to the actual worksheet extent`,
              location: { path: tablePath, rangeRef: String(table["@_ref"]) },
              repairable: true,
              repaired: true,
              crossAppCritical: false,
            });
            changed = true;
          }
        } catch {
          // leave invalid non-A1 refs untouched; they remain validation findings
        }
      }
    }

    if (changed) {
      zip.file(tablePath, XML_DECLARATION + xmlBuilder.build(tableTree));
    }
  }
}

async function repairWorksheetIntegrity(
  zip: JSZip,
  actions: SpreadsheetRepairAction[],
  findings: SpreadsheetFinding[],
  options: SpreadsheetRepairOptions | undefined,
): Promise<void> {
  const sheetPaths = Object.keys(zip.files)
    .filter((path) => !zip.files[path]?.dir && /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
    .sort();

  for (const sheetPath of sheetPaths) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (!sheetXml) {
      continue;
    }
    const sheetTree = xmlParser.parse(sheetXml);
    const worksheet = sheetTree.worksheet ?? {};
    let changed = false;

    if (options?.repairMerges !== false && worksheet?.mergeCells?.mergeCell) {
      const originalMerges = asArray(worksheet.mergeCells.mergeCell);
      const repairedMerges: Array<Record<string, unknown>> = [];
      const keptRanges: Array<{
        ref: string;
        startRow: number;
        startCol: number;
        endRow: number;
        endCol: number;
      }> = [];

      for (const mergeCell of originalMerges) {
        const originalRef = String(mergeCell["@_ref"] ?? "");
        const clippedRef = clipRangeToExcelBounds(originalRef);
        if (!clippedRef) {
          continue;
        }
        try {
          const parsedRange = parseRangeRef(clippedRef);
          const overlap = keptRanges.find((existing) => rangesOverlap(existing, parsedRange));
          if (overlap) {
            continue;
          }
          keptRanges.push({
            ref: clippedRef,
            startRow: parsedRange.startRow,
            startCol: parsedRange.startCol,
            endRow: parsedRange.endRow,
            endCol: parsedRange.endCol,
          });
          repairedMerges.push({
            ...mergeCell,
            "@_ref": clippedRef,
          });
        } catch {
          // Ignore invalid merge refs that still fail after clipping.
        }
      }

      const mergeChanged = repairedMerges.length !== originalMerges.length
        || repairedMerges.some((mergeCell, index) => String(mergeCell["@_ref"] ?? "") !== String(originalMerges[index]?.["@_ref"] ?? ""));
      if (mergeChanged) {
        if (repairedMerges.length > 0) {
          worksheet.mergeCells = {
            "@_count": String(repairedMerges.length),
            mergeCell: repairedMerges,
          };
        } else {
          delete worksheet.mergeCells;
        }
        actions.push({
          code: "REPAIR_MERGES",
          description: `Clipped invalid merges and removed overlapping merges in ${sheetPath}`,
          path: sheetPath,
        });
        findings.push({
          code: "MERGE_OVERLAP",
          severity: "warning",
          category: "worksheet",
          message: `Clipped invalid merges and removed overlapping merges in ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false,
        });
        changed = true;
      }
    }

    if (options?.repairWorksheetDimensions !== false) {
      const actualDimension = collectWorksheetExtent(worksheet).ref;
      const currentDimension = String(worksheet?.dimension?.["@_ref"] ?? "A1");
      if (!rangeRefsMatch(currentDimension, actualDimension)) {
        worksheet.dimension = { "@_ref": actualDimension };
        actions.push({
          code: "RECALCULATE_DIMENSION",
          description: `Recalculated worksheet dimension for ${sheetPath}`,
          path: sheetPath,
        });
        findings.push({
          code: "DIMENSION_MISMATCH",
          severity: "warning",
          category: "worksheet",
          message: `Recalculated worksheet dimension from ${currentDimension} to ${actualDimension}`,
          location: { path: sheetPath, rangeRef: actualDimension },
          repairable: true,
          repaired: true,
          crossAppCritical: false,
        });
        changed = true;
      }
    }

    if (options?.removeInvalidHyperlinks !== false && worksheet?.hyperlinks?.hyperlink) {
      const originalHyperlinks = asArray(worksheet.hyperlinks.hyperlink);
      const keptHyperlinks = originalHyperlinks.filter((hyperlink) => {
        const ref = String(hyperlink["@_ref"] ?? "");
        try {
          const range = parseRangeRef(ref);
          return isRangeWithinExcelBounds(range);
        } catch {
          return false;
        }
      });
      if (keptHyperlinks.length !== originalHyperlinks.length) {
        if (keptHyperlinks.length > 0) {
          worksheet.hyperlinks.hyperlink = keptHyperlinks;
        } else {
          delete worksheet.hyperlinks;
        }
        actions.push({
          code: "REMOVE_INVALID_HYPERLINKS",
          description: `Removed invalid hyperlink refs from ${sheetPath}`,
          path: sheetPath,
        });
        findings.push({
          code: "HYPERLINK_TARGET_INVALID",
          severity: "warning",
          category: "worksheet",
          message: `Removed invalid hyperlink refs from ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false,
        });
        changed = true;
      }
    }

    if (options?.clipDataValidationRanges !== false && worksheet?.dataValidations?.dataValidation) {
      const originalValidations = asArray(worksheet.dataValidations.dataValidation);
      const repairedValidations = originalValidations.flatMap((validation) => {
        const sqref = String(validation["@_sqref"] ?? "");
        const repairedSegments = normalizeSqrefSegments(sqref)
          .map((segment) => clipRangeToExcelBounds(segment))
          .filter((segment): segment is string => Boolean(segment));
        if (repairedSegments.length === 0) {
          return [];
        }
        return [{
          ...validation,
          "@_sqref": repairedSegments.join(" "),
        }];
      });
      if (repairedValidations.length !== originalValidations.length
        || repairedValidations.some((validation, index) => String(validation["@_sqref"]) !== String(originalValidations[index]?.["@_sqref"]))) {
        if (repairedValidations.length > 0) {
          worksheet.dataValidations.dataValidation = repairedValidations;
          worksheet.dataValidations["@_count"] = String(repairedValidations.length);
        } else {
          delete worksheet.dataValidations;
        }
        actions.push({
          code: "CLIP_DATA_VALIDATION_RANGES",
          description: `Clipped or removed invalid data validation ranges in ${sheetPath}`,
          path: sheetPath,
        });
        findings.push({
          code: "INVALID_RANGE_REF",
          severity: "warning",
          category: "worksheet",
          message: `Clipped or removed invalid data validation ranges in ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false,
        });
        changed = true;
      }
    }

    if (changed) {
      zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
    }
  }
}

async function repairDefinedNames(
  zip: JSZip,
  actions: SpreadsheetRepairAction[],
  findings: SpreadsheetFinding[],
  options: SpreadsheetRepairOptions | undefined,
): Promise<void> {
  if (options?.removeInvalidDefinedNames === false) {
    return;
  }

  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  if (!workbookXml) {
    return;
  }

  const workbookTree = xmlParser.parse(workbookXml);
  const workbook = workbookTree.workbook ?? {};
  const sheets = asArray(workbook?.sheets?.sheet);
  const workbookSheetNames = new Set(
    sheets.map((sheet) => String(sheet["@_name"] ?? "")).filter(Boolean),
  );
  const originalDefinedNames = asArray(workbook?.definedNames?.definedName);
  const repairedDefinedNames = originalDefinedNames.filter((definedName) => {
    const ref = getTextContent(definedName).trim();
    return !ref || !isClearlyInvalidDefinedNameRef(ref, workbookSheetNames);
  });

  if (repairedDefinedNames.length === originalDefinedNames.length) {
    return;
  }

  if (repairedDefinedNames.length > 0) {
    workbook.definedNames.definedName = repairedDefinedNames;
  } else {
    delete workbook.definedNames;
  }

  zip.file("xl/workbook.xml", XML_DECLARATION + xmlBuilder.build(workbookTree));
  actions.push({
    code: "REMOVE_INVALID_DEFINED_NAMES",
    description: "Removed invalid defined names from xl/workbook.xml",
    path: "xl/workbook.xml",
  });
  findings.push({
    code: "DEFINED_NAME_INVALID",
    severity: "warning",
    category: "workbook",
    message: "Removed invalid defined names from xl/workbook.xml",
    location: { path: "xl/workbook.xml" },
    repairable: true,
    repaired: true,
    crossAppCritical: false,
  });
}

export async function validateSpreadsheetBuffer(
  buffer: Buffer,
  options?: SpreadsheetBufferValidateOptions,
): Promise<SpreadsheetValidationSummary> {
  const inspection = await inspectWorkbook(buffer, options);
  return {
    verdict: verdictFromFindings(inspection.findings),
    findings: inspection.findings,
  };
}

export async function repairSpreadsheetBuffer(
  buffer: Buffer,
  options?: SpreadsheetRepairOptions,
): Promise<SpreadsheetRepairResult> {
  const zip = await JSZip.loadAsync(buffer);
  const deterministic = options?.deterministic !== false;
  const actions: SpreadsheetRepairAction[] = [];
  const repairFindings: SpreadsheetFinding[] = [];

  if (options?.stripUnsafeArtifacts !== false) {
    stripUnsafeParts(zip, actions, repairFindings);
  }

  let inspection = await inspectWorkbook(await zip.generateAsync({ type: "nodebuffer" }));

  if (options?.fixContentTypes !== false && (inspection.missingOverrides.length > 0 || inspection.extraOverrides.length > 0 || !zip.file("[Content_Types].xml"))) {
    const currentPaths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir).sort();
    zip.file("[Content_Types].xml", buildContentTypesXml(currentPaths));
    actions.push({
      code: "FIX_CONTENT_TYPES",
      description: "Rebuilt [Content_Types].xml from the current package parts",
      path: "[Content_Types].xml",
    });
  }

  if (inspection.invalidSheetNames.length > 0 || inspection.duplicateSheetNames.length > 0) {
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    if (workbookXml) {
      const workbookTree = xmlParser.parse(workbookXml);
      const sheets = asArray(workbookTree?.workbook?.sheets?.sheet);
      const usedNames = new Set<string>();
      let changed = false;
      sheets.forEach((sheet) => {
        const currentName = String(sheet["@_name"] ?? "");
        const normalized = currentName.toLowerCase();
        if (!currentName || (!isInvalidSheetName(currentName) && !usedNames.has(normalized))) {
          if (currentName) {
            usedNames.add(normalized);
          }
          return;
        }
        const nextName = sanitizeSheetName(currentName, usedNames);
        if (nextName !== currentName) {
          sheet["@_name"] = nextName;
          changed = true;
        }
      });
      if (changed) {
        zip.file("xl/workbook.xml", XML_DECLARATION + xmlBuilder.build(workbookTree));
        actions.push({
          code: "NORMALIZE_SHEET_NAMES",
          description: "Normalized invalid or duplicate worksheet names in xl/workbook.xml",
          path: "xl/workbook.xml",
        });
        repairFindings.push({
          code: inspection.invalidSheetNames.length > 0 ? "SHEET_NAME_INVALID" : "DUPLICATE_SHEET_NAME",
          severity: "warning",
          category: "workbook",
          message: "Normalized invalid or duplicate worksheet names in xl/workbook.xml",
          location: { path: "xl/workbook.xml" },
          repairable: true,
          repaired: true,
          crossAppCritical: false,
        });
      }
    }
  }

  if (inspection.duplicateRelationshipIds.length > 0) {
    const duplicateIdsByRelPath = new Map<string, Set<string>>();
    inspection.duplicateRelationshipIds.forEach((issue) => {
      const ids = duplicateIdsByRelPath.get(issue.relPath) ?? new Set<string>();
      ids.add(issue.id);
      duplicateIdsByRelPath.set(issue.relPath, ids);
    });
    for (const [relPath, duplicateIds] of duplicateIdsByRelPath) {
      const relXml = await zip.file(relPath)?.async("string");
      if (!relXml) {
        continue;
      }
      const relTree = xmlParser.parse(relXml);
      const relationships = asArray(relTree?.Relationships?.Relationship);
      const seenIds = new Set<string>();
      relTree.Relationships.Relationship = relationships.filter((relationship) => {
        const relationshipId = String(relationship["@_Id"] ?? "");
        if (!duplicateIds.has(relationshipId)) {
          return true;
        }
        if (seenIds.has(relationshipId)) {
          return false;
        }
        seenIds.add(relationshipId);
        return true;
      });
      zip.file(relPath, XML_DECLARATION + xmlBuilder.build(relTree));
      actions.push({
        code: "DEDUPE_RELATIONSHIP_IDS",
        description: `Removed duplicate relationship ids from ${relPath}`,
        path: relPath,
      });
      repairFindings.push({
        code: "DUPLICATE_RELATIONSHIP_ID",
        severity: "warning",
        category: "relationship",
        message: `Removed duplicate relationship ids from ${relPath}`,
        location: { path: relPath },
        repairable: true,
        repaired: true,
        crossAppCritical: false,
      });
    }
  }

  if (options?.removeOrphanRelationships !== false && inspection.orphanRelationships.length > 0) {
    const orphanIdsByRelPath = new Map<string, Set<string>>();
    inspection.orphanRelationships.forEach((relationship) => {
      const ids = orphanIdsByRelPath.get(relationship.relPath) ?? new Set<string>();
      ids.add(relationship.id);
      orphanIdsByRelPath.set(relationship.relPath, ids);
    });

    for (const [relPath, orphanIds] of orphanIdsByRelPath) {
      const relXml = await zip.file(relPath)?.async("string");
      if (!relXml) {
        continue;
      }
      const relTree = xmlParser.parse(relXml);
      const relationships = asArray(relTree?.Relationships?.Relationship)
        .filter((relationship) => !orphanIds.has(String(relationship["@_Id"] ?? "")));
      relTree.Relationships.Relationship = relationships;
      zip.file(relPath, XML_DECLARATION + xmlBuilder.build(relTree));

      actions.push({
        code: "REMOVE_ORPHAN_RELATIONSHIPS",
        description: `Removed orphan relationships from ${relPath}`,
        path: relPath,
      });

      if (!/xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(relPath)) {
        continue;
      }

      const sheetPath = relPath.replace(/^xl\/worksheets\/_rels\/(sheet\d+)\.xml\.rels$/, "xl/worksheets/$1.xml");
      const sheetXml = await zip.file(sheetPath)?.async("string");
      if (!sheetXml) {
        continue;
      }
      const sheetTree = xmlParser.parse(sheetXml);
      const tableParts = asArray(sheetTree?.worksheet?.tableParts?.tablePart)
        .filter((tablePart) => !orphanIds.has(String(tablePart["@_r:id"] ?? "")));
      if (sheetTree?.worksheet?.tableParts) {
        if (tableParts.length > 0) {
          sheetTree.worksheet.tableParts.tablePart = tableParts;
          sheetTree.worksheet.tableParts["@_count"] = String(tableParts.length);
        } else {
          delete sheetTree.worksheet.tableParts;
        }
      }
      zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
    }
  }

  if (options?.clampStyleIndices !== false && inspection.styleOutOfBounds.length > 0) {
    const outOfBoundsBySheet = new Map<string, Set<string>>();
    inspection.styleOutOfBounds.forEach((issue) => {
      const refs = outOfBoundsBySheet.get(issue.sheetPath) ?? new Set<string>();
      refs.add(issue.cellRef);
      outOfBoundsBySheet.set(issue.sheetPath, refs);
    });

    for (const [sheetPath, refs] of outOfBoundsBySheet) {
      const sheetXml = await zip.file(sheetPath)?.async("string");
      if (!sheetXml) {
        continue;
      }
      const sheetTree = xmlParser.parse(sheetXml);
      asArray(sheetTree?.worksheet?.sheetData?.row).forEach((row, rowIndex) => {
        const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
        asArray(row.c).forEach((cell, cellIndex) => {
          if (!refs.has(resolveWorksheetCellRef(cell, rowNumber, cellIndex))) {
            return;
          }
          delete cell["@_s"];
        });
      });
      zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
      actions.push({
        code: "CLAMP_STYLE_INDEX",
        description: `Reset out-of-range style indices in ${sheetPath} to the default style`,
        path: sheetPath,
      });
    }
  }

  if (inspection.formulaCachedValueMissing.length > 0) {
    const formulaCellsBySheet = new Map<string, Set<string>>();
    inspection.formulaCachedValueMissing.forEach((issue) => {
      const refs = formulaCellsBySheet.get(issue.sheetPath) ?? new Set<string>();
      refs.add(issue.cellRef);
      formulaCellsBySheet.set(issue.sheetPath, refs);
    });
    for (const [sheetPath, refs] of formulaCellsBySheet) {
      const sheetXml = await zip.file(sheetPath)?.async("string");
      if (!sheetXml) {
        continue;
      }
      const repaired = sheetXml.replace(/<c\b([^>]*)\br="([^"]+)"([^>]*)>([\s\S]*?)<\/c>/g, (match, before: string, ref: string, after: string, innerXml: string) => {
        if (!refs.has(ref) || !/<f(?:\s|>)/.test(innerXml) || /<v>[\s\S]*?<\/v>/.test(innerXml)) {
          return match;
        }
        return `<c${before} r="${ref}"${after}>${innerXml}<v>0</v></c>`;
      });
      if (repaired !== sheetXml) {
        zip.file(sheetPath, repaired);
        actions.push({
          code: "ADD_FORMULA_CACHED_VALUES",
          description: `Inserted cached formula values into ${sheetPath}`,
          path: sheetPath,
        });
        repairFindings.push({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
          category: "worksheet",
          message: `Inserted cached formula values into ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false,
        });
      }
    }
  }

  await repairSharedStringIntegrity(zip, inspection, actions, repairFindings, options);
  await repairWorksheetIntegrity(zip, actions, repairFindings, options);
  await repairTables(zip, actions, repairFindings, options);
  await repairDefinedNames(zip, actions, repairFindings, options);

  if (deterministic) {
    for (const entry of Object.values(zip.files)) {
      entry.date = DETERMINISTIC_ZIP_DATE;
    }
  }

  const repairedBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  inspection = await inspectWorkbook(repairedBuffer, options);
  const findings = [
    ...inspection.findings,
    ...repairFindings,
  ];

  return {
    buffer: repairedBuffer,
    repaired: actions.length > 0,
    actions,
    findings,
    riskyTransformations: false,
  };
}

export async function validateAndRepairSpreadsheetBuffer(
  buffer: Buffer,
  options?: SpreadsheetRepairOptions,
): Promise<SpreadsheetRepairValidationResult> {
  const original = await validateSpreadsheetBuffer(buffer, options);
  const repair = await repairSpreadsheetBuffer(buffer, options);
  const repaired = await validateSpreadsheetBuffer(repair.buffer, options);

  const repairedCodes = new Set(repair.findings.filter((finding) => finding.repaired).map((finding) => finding.code));
  repair.findings.forEach((finding) => {
    if (repairedCodes.has(finding.code)) {
      finding.repaired = true;
    }
  });

  return {
    original,
    repair,
    repaired,
  };
}
