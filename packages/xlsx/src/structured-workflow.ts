import { createHash } from "node:crypto";
import { posix } from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { DETERMINISTIC_ZIP_DATE } from "./assembly/xlsx-assembler.js";
import { cellRef, parseCellRef, parseRangeRef } from "./utils/cell-ref.js";
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

const DEFAULT_MAX_INPUT_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_PART_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_PARTS = 2_000;
const DEFAULT_MAX_CELLS = 1_000_000;

export type XlsxWorkflowCode =
  | "XLSX_ABORTED"
  | "XLSX_ARCHIVE_UNSAFE"
  | "XLSX_BUDGET_EXCEEDED"
  | "XLSX_CELL_NOT_FOUND"
  | "XLSX_ENCRYPTED_UNSUPPORTED"
  | "XLSX_EXTERNAL_LINK_PRESERVED"
  | "XLSX_FORMULA_CHANGED"
  | "XLSX_FORMULA_INJECTION"
  | "XLSX_FORMULA_NOT_RECALCULATED"
  | "XLSX_MACRO_PRESERVED_OPAQUE"
  | "XLSX_MAPPING_UNRESOLVED"
  | "XLSX_OPAQUE_PART_CHANGED"
  | "XLSX_OPAQUE_PART_PRESERVED"
  | "XLSX_STRUCTURE_CHANGED"
  | "XLSX_STYLE_CHANGED"
  | "XLSX_UNSUPPORTED_FEATURE_PRESERVED"
  | "XLSX_WRITE_CONFLICT"
  | "XLSX_XML_UNSAFE";

export class XlsxWorkflowError extends Error {
  readonly code: XlsxWorkflowCode;
  readonly locator?: XlsxLocator;

  constructor(code: XlsxWorkflowCode, message: string, locator?: XlsxLocator) {
    super(message);
    this.name = "XlsxWorkflowError";
    this.code = code;
    this.locator = locator;
  }
}

export interface XlsxWorkflowBudget {
  maxInputBytes?: number;
  maxPartBytes?: number;
  maxParts?: number;
  maxCells?: number;
}

export interface XlsxWorkflowOptions extends XlsxWorkflowBudget {
  artifactId?: string;
  signal?: AbortSignal;
}

export interface XlsxLocator {
  artifactId: string;
  scheme: "xlsx.a1";
  value: [sheet: string, ref: string];
}

export interface XlsxWorkflowDiagnostic {
  code: XlsxWorkflowCode;
  message: string;
  severity: "info" | "warning" | "error";
  locator?: XlsxLocator;
}

export interface XlsxWorkflowCell {
  locator: XlsxLocator;
  value: string | number | boolean | null;
  valueType: "blank" | "boolean" | "error" | "number" | "string";
  formula?: string;
  cachedValue?: string | number | boolean | null;
  styleId?: number;
}

export interface XlsxWorkflowComment {
  locator: XlsxLocator;
  author?: string;
  text: string;
}

export interface XlsxWorkflowValidation {
  ref: string;
  type?: string;
  operator?: string;
  formula1?: string;
  formula2?: string;
}

export interface XlsxWorkflowSheet {
  name: string;
  state: "visible" | "hidden" | "veryHidden";
  dimensionRef?: string;
  hiddenRows: number[];
  hiddenColumns: Array<{ min: number; max: number }>;
  mergedRanges: string[];
  validations: XlsxWorkflowValidation[];
  cells: XlsxWorkflowCell[];
  comments: XlsxWorkflowComment[];
}

export interface XlsxWorkflowNamedRange {
  name: string;
  ref: string;
  scopeSheet?: string;
}

export interface XlsxWorkflowTable {
  name: string;
  displayName: string;
  sheetName: string;
  ref: string;
}

export interface XlsxWorkflowInspection {
  artifactId: string;
  byteLength: number;
  sha256: string;
  date1904: boolean;
  sheets: XlsxWorkflowSheet[];
  namedRanges: XlsxWorkflowNamedRange[];
  tables: XlsxWorkflowTable[];
  styleCount: number;
  styleSha256?: string;
  macroParts: Array<{ path: string; sha256: string; byteLength: number }>;
  opaqueParts: Array<{ path: string; sha256: string; byteLength: number }>;
  externalLinks: string[];
  warnings: XlsxWorkflowDiagnostic[];
  losses: XlsxWorkflowDiagnostic[];
}

interface XlsxWorkflowPart {
  path: string;
  bytes: Buffer;
}

export interface XlsxWorkflowDocument {
  readonly artifactId: string;
  readonly inspection: XlsxWorkflowInspection;
  /** The source package is retained for explicit export/writeback; no embedded code is executed. */
  readonly buffer: Buffer;
  readonly parts: readonly XlsxWorkflowPart[];
}

export type XlsxMappingTarget =
  | { id: string; kind: "a1"; sheet: string; ref: string }
  | { id: string; kind: "namedRange"; name: string }
  | { id: string; kind: "table"; name: string };

export interface XlsxMappedTarget {
  id: string;
  source: XlsxMappingTarget["kind"];
  locator: XlsxLocator;
}

export type XlsxCellWriteValue = string | number | boolean | null | { error: string } | { dateSerial: number };

export interface XlsxCellWrite {
  locator: XlsxLocator;
  value?: XlsxCellWriteValue;
  formula?: { expression: string; cachedValue?: string | number | boolean | null };
  comment?: { text: string; author?: string } | null;
}

export interface XlsxVerificationIssue extends XlsxWorkflowDiagnostic {
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
}

export interface XlsxVerificationResult {
  status: "PASS" | "FAIL";
  issues: XlsxVerificationIssue[];
  allowedCells: XlsxLocator[];
}

interface Relationship {
  id: string;
  type: string;
  target: string;
  external: boolean;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) return String((value as { "#text"?: unknown })["#text"] ?? "");
  return "";
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new XlsxWorkflowError("XLSX_ABORTED", typeof signal.reason === "string" ? signal.reason : "XLSX workflow aborted.");
  }
}

function unsafeArchivePath(path: string): boolean {
  return path.startsWith("/")
    || path.includes("\\")
    || path.split("/").includes("..")
    || [...path].some((character) => character.charCodeAt(0) <= 31);
}

function parseXml(bytes: Buffer, path: string): any {
  const xml = bytes.toString("utf8");
  if (/<!(?:DOCTYPE|ENTITY)/i.test(xml)) {
    throw new XlsxWorkflowError("XLSX_XML_UNSAFE", `Unsafe XML declaration in ${path}.`);
  }
  return xmlParser.parse(xml);
}

function resolveTarget(sourcePath: string, target: string): string {
  const sourceDir = posix.dirname(sourcePath);
  return posix.normalize(posix.join(sourceDir, target)).replace(/^\//, "");
}

function relationshipsFrom(bytes: Buffer | undefined, sourcePath: string): Relationship[] {
  if (!bytes) return [];
  const root = parseXml(bytes, sourcePath)?.Relationships;
  return asArray<any>(root?.Relationship).map((entry) => ({
    id: String(entry?.["@_Id"] ?? ""),
    type: String(entry?.["@_Type"] ?? ""),
    target: entry?.["@_TargetMode"] === "External"
      ? String(entry?.["@_Target"] ?? "")
      : resolveTarget(sourcePath.replace(/\/_rels\/([^/]+)\.rels$/, "/$1"), String(entry?.["@_Target"] ?? "")),
    external: entry?.["@_TargetMode"] === "External",
  }));
}

function locator(artifactId: string, sheet: string, ref: string): XlsxLocator {
  return { artifactId, scheme: "xlsx.a1", value: [sheet, ref.toUpperCase()] };
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function parseSharedStrings(parts: Map<string, Buffer>): string[] {
  const bytes = parts.get("xl/sharedStrings.xml");
  if (!bytes) return [];
  const root = parseXml(bytes, "xl/sharedStrings.xml")?.sst;
  return asArray<any>(root?.si).map((entry) => {
    if (entry?.t !== undefined) return textOf(entry.t);
    return asArray<any>(entry?.r).map((run) => textOf(run?.t)).join("");
  });
}

function parseScalar(cell: any, sharedStrings: string[]): { value: XlsxWorkflowCell["value"]; type: XlsxWorkflowCell["valueType"] } {
  const type = String(cell?.["@_t"] ?? "n");
  if (type === "inlineStr") return { value: textOf(cell?.is?.t) || asArray<any>(cell?.is?.r).map((run) => textOf(run?.t)).join(""), type: "string" };
  if (type === "s") return { value: sharedStrings[Number(textOf(cell?.v))] ?? "", type: "string" };
  if (type === "str") return { value: textOf(cell?.v), type: "string" };
  if (type === "b") return { value: textOf(cell?.v) === "1", type: "boolean" };
  if (type === "e") return { value: textOf(cell?.v), type: "error" };
  const raw = textOf(cell?.v);
  if (raw === "") return { value: null, type: "blank" };
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? { value: numeric, type: "number" } : { value: raw, type: "string" };
}

function parseComments(
  artifactId: string,
  sheetName: string,
  sheetPath: string,
  parts: Map<string, Buffer>,
): XlsxWorkflowComment[] {
  const relPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", name) => `${prefix}_rels/${name}.xml.rels`);
  const relationship = relationshipsFrom(parts.get(relPath), relPath).find((entry) => entry.type.endsWith("/comments"));
  if (!relationship || relationship.external) return [];
  const commentBytes = parts.get(relationship.target);
  if (!commentBytes) return [];
  const root = parseXml(commentBytes, relationship.target)?.comments;
  const authors = asArray<any>(root?.authors?.author).map(textOf);
  return asArray<any>(root?.commentList?.comment).map((entry) => ({
    locator: locator(artifactId, sheetName, String(entry?.["@_ref"] ?? "A1")),
    author: authors[Number(entry?.["@_authorId"] ?? 0)],
    text: textOf(entry?.text?.t) || asArray<any>(entry?.text?.r).map((run) => textOf(run?.t)).join(""),
  }));
}

function knownPart(path: string): boolean {
  return path === "[Content_Types].xml"
    || path === "_rels/.rels"
    || path.startsWith("docProps/")
    || path === "xl/workbook.xml"
    || path === "xl/_rels/workbook.xml.rels"
    || path === "xl/styles.xml"
    || path === "xl/sharedStrings.xml"
    || path.startsWith("xl/worksheets/")
    || path.startsWith("xl/tables/")
    || path.startsWith("xl/comments")
    || path.startsWith("xl/theme/")
    || path.startsWith("xl/persons/")
    || path.startsWith("xl/threadedComments/");
}

function canonicalString(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalString).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalString(record[key])}`).join(",")}}`;
}

async function inspectParts(
  buffer: Buffer,
  artifactId: string,
  parts: Map<string, Buffer>,
  options: XlsxWorkflowOptions,
): Promise<XlsxWorkflowInspection> {
  const workbookBytes = parts.get("xl/workbook.xml");
  const relBytes = parts.get("xl/_rels/workbook.xml.rels");
  if (!workbookBytes || !relBytes) throw new XlsxWorkflowError("XLSX_ARCHIVE_UNSAFE", "Workbook XML or relationships are missing.");
  const workbook = parseXml(workbookBytes, "xl/workbook.xml")?.workbook;
  const relationships = relationshipsFrom(relBytes, "xl/_rels/workbook.xml.rels");
  const relById = new Map(relationships.map((entry) => [entry.id, entry]));
  const sharedStrings = parseSharedStrings(parts);
  const warnings: XlsxWorkflowDiagnostic[] = [];
  const losses: XlsxWorkflowDiagnostic[] = [];
  const macroParts: XlsxWorkflowInspection["macroParts"] = [];
  const opaqueParts: XlsxWorkflowInspection["opaqueParts"] = [];
  const externalLinkSet = new Set(relationships.filter((entry) => entry.external || entry.type.endsWith("/externalLink")).map((entry) => entry.target));

  for (const [path, bytes] of [...parts].sort(([left], [right]) => left.localeCompare(right))) {
    if (/vbaProject\.bin$/i.test(path)) {
      macroParts.push({ path, sha256: sha256(bytes), byteLength: bytes.length });
      warnings.push({ code: "XLSX_MACRO_PRESERVED_OPAQUE", message: `${path} is preserved as opaque bytes and is never executed.`, severity: "warning" });
    } else if (!knownPart(path)) {
      opaqueParts.push({ path, sha256: sha256(bytes), byteLength: bytes.length });
      losses.push({ code: "XLSX_OPAQUE_PART_PRESERVED", message: `${path} is preserved byte-for-byte but is not editable through v1.`, severity: "info" });
    }
  }
  const sheets: XlsxWorkflowSheet[] = [];
  const sheetPathByName = new Map<string, string>();
  let cellCount = 0;
  for (const sheetEntry of asArray<any>(workbook?.sheets?.sheet)) {
    checkAbort(options.signal);
    const sheetName = String(sheetEntry?.["@_name"] ?? "");
    const relationship = relById.get(String(sheetEntry?.["@_r:id"] ?? ""));
    if (!relationship || relationship.external || !relationship.type.endsWith("/worksheet")) continue;
    const sheetBytes = parts.get(relationship.target);
    if (!sheetBytes) continue;
    sheetPathByName.set(sheetName, relationship.target);
    const sheetRelPath = relationship.target.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", name) => `${prefix}_rels/${name}.xml.rels`);
    for (const sheetRel of relationshipsFrom(parts.get(sheetRelPath), sheetRelPath)) {
      if (sheetRel.external) externalLinkSet.add(sheetRel.target);
    }
    const sheet = parseXml(sheetBytes, relationship.target)?.worksheet;
    const cells: XlsxWorkflowCell[] = [];
    const hiddenRows: number[] = [];
    for (const row of asArray<any>(sheet?.sheetData?.row)) {
      if (parseBoolean(row?.["@_hidden"])) hiddenRows.push(Number(row?.["@_r"] ?? 0));
      for (const cell of asArray<any>(row?.c)) {
        cellCount += 1;
        if (cellCount > (options.maxCells ?? DEFAULT_MAX_CELLS)) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `Workbook exceeds maxCells ${options.maxCells ?? DEFAULT_MAX_CELLS}.`);
        const ref = String(cell?.["@_r"] ?? "");
        const scalar = parseScalar(cell, sharedStrings);
        const formula = cell?.f === undefined ? undefined : textOf(cell.f);
        cells.push({
          locator: locator(artifactId, sheetName, ref),
          value: formula ? null : scalar.value,
          valueType: formula ? "blank" : scalar.type,
          formula,
          cachedValue: formula ? scalar.value : undefined,
          styleId: cell?.["@_s"] === undefined ? undefined : Number(cell["@_s"]),
        });
      }
    }
    const hiddenColumns = asArray<any>(sheet?.cols?.col)
      .filter((column) => parseBoolean(column?.["@_hidden"]))
      .map((column) => ({ min: Number(column?.["@_min"]), max: Number(column?.["@_max"]) }));
    const validations = asArray<any>(sheet?.dataValidations?.dataValidation).map((entry) => ({
      ref: String(entry?.["@_sqref"] ?? ""),
      type: entry?.["@_type"] === undefined ? undefined : String(entry["@_type"]),
      operator: entry?.["@_operator"] === undefined ? undefined : String(entry["@_operator"]),
      formula1: entry?.formula1 === undefined ? undefined : textOf(entry.formula1),
      formula2: entry?.formula2 === undefined ? undefined : textOf(entry.formula2),
    }));
    sheets.push({
      name: sheetName,
      state: sheetEntry?.["@_state"] === "hidden" || sheetEntry?.["@_state"] === "veryHidden" ? sheetEntry["@_state"] : "visible",
      dimensionRef: sheet?.dimension?.["@_ref"] === undefined ? undefined : String(sheet.dimension["@_ref"]),
      hiddenRows,
      hiddenColumns,
      mergedRanges: asArray<any>(sheet?.mergeCells?.mergeCell).map((entry) => String(entry?.["@_ref"] ?? "")),
      validations,
      cells,
      comments: parseComments(artifactId, sheetName, relationship.target, parts),
    });
  }

  const namedRanges: XlsxWorkflowNamedRange[] = asArray<any>(workbook?.definedNames?.definedName).map((entry) => {
    const scopeIndex = entry?.["@_localSheetId"] === undefined ? undefined : Number(entry["@_localSheetId"]);
    return {
      name: String(entry?.["@_name"] ?? ""),
      ref: textOf(entry),
      scopeSheet: scopeIndex === undefined ? undefined : sheets[scopeIndex]?.name,
    };
  });
  const tables: XlsxWorkflowTable[] = [];
  for (const sheet of sheets) {
    const sheetPath = sheetPathByName.get(sheet.name);
    if (!sheetPath) continue;
    const relPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", name) => `${prefix}_rels/${name}.xml.rels`);
    for (const relationship of relationshipsFrom(parts.get(relPath), relPath).filter((entry) => entry.type.endsWith("/table") && !entry.external)) {
      const table = parts.get(relationship.target) ? parseXml(parts.get(relationship.target)!, relationship.target)?.table : undefined;
      if (table) tables.push({ name: String(table["@_name"] ?? ""), displayName: String(table["@_displayName"] ?? table["@_name"] ?? ""), sheetName: sheet.name, ref: String(table["@_ref"] ?? "") });
    }
  }
  const styleRoot = parts.get("xl/styles.xml") ? parseXml(parts.get("xl/styles.xml")!, "xl/styles.xml")?.styleSheet : undefined;
  const styleCount = Number(styleRoot?.cellXfs?.["@_count"] ?? asArray(styleRoot?.cellXfs?.xf).length);
  const styleSha256 = parts.get("xl/styles.xml") ? sha256(parts.get("xl/styles.xml")!) : undefined;
  const externalLinks = [...externalLinkSet].sort();
  for (const target of externalLinks) warnings.push({ code: "XLSX_EXTERNAL_LINK_PRESERVED", message: `External link ${target} is preserved but never fetched.`, severity: "warning" });
  if (sheets.some((sheet) => sheet.cells.some((cell) => cell.formula !== undefined))) {
    warnings.push({ code: "XLSX_FORMULA_NOT_RECALCULATED", message: "Formula expressions and cached values are preserved; arbitrary formulas are not recalculated.", severity: "warning" });
  }
  return {
    artifactId,
    byteLength: buffer.length,
    sha256: sha256(buffer),
    date1904: parseBoolean(workbook?.workbookPr?.["@_date1904"]),
    sheets,
    namedRanges,
    tables,
    styleCount,
    styleSha256,
    macroParts,
    opaqueParts,
    externalLinks,
    warnings,
    losses,
  };
}

export async function importXlsxWorkflow(buffer: Buffer, options: XlsxWorkflowOptions = {}): Promise<XlsxWorkflowDocument> {
  checkAbort(options.signal);
  const maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;
  if (buffer.length > maxInputBytes) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `Input ${buffer.length} bytes exceeds maxInputBytes ${maxInputBytes}.`);
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  } catch (error) {
    throw new XlsxWorkflowError(
      "XLSX_ARCHIVE_UNSAFE",
      `Workbook is not a readable XLSX ZIP package: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const files = Object.values(zip.files).filter((file) => !file.dir);
  if (files.length > (options.maxParts ?? DEFAULT_MAX_PARTS)) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `Archive exceeds maxParts ${options.maxParts ?? DEFAULT_MAX_PARTS}.`);
  const parts = new Map<string, Buffer>();
  let total = 0;
  for (const file of files.sort((left, right) => left.name.localeCompare(right.name))) {
    checkAbort(options.signal);
    const originalName = (file as typeof file & { unsafeOriginalName?: string }).unsafeOriginalName ?? file.name;
    if (unsafeArchivePath(originalName) || unsafeArchivePath(file.name)) throw new XlsxWorkflowError("XLSX_ARCHIVE_UNSAFE", `Unsafe archive path ${originalName}.`);
    const bytes = await file.async("nodebuffer");
    if (bytes.length > (options.maxPartBytes ?? DEFAULT_MAX_PART_BYTES)) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `${file.name} exceeds maxPartBytes ${options.maxPartBytes ?? DEFAULT_MAX_PART_BYTES}.`);
    total += bytes.length;
    if (total > maxInputBytes) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `Expanded archive exceeds maxInputBytes ${maxInputBytes}.`);
    parts.set(file.name, bytes);
  }
  if (parts.has("EncryptedPackage") || parts.has("EncryptionInfo")) throw new XlsxWorkflowError("XLSX_ENCRYPTED_UNSUPPORTED", "Encrypted workbooks are not supported.");
  const artifactId = options.artifactId ?? sha256(buffer);
  const inspection = await inspectParts(buffer, artifactId, parts, options);
  return { artifactId, buffer: Buffer.from(buffer), inspection, parts: [...parts].map(([path, bytes]) => ({ path, bytes })) };
}

export async function inspectXlsxWorkflow(buffer: Buffer, options: XlsxWorkflowOptions = {}): Promise<XlsxWorkflowInspection> {
  return (await importXlsxWorkflow(buffer, options)).inspection;
}

function parseQualifiedRef(ref: string): { sheet: string; ref: string } | undefined {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) return undefined;
  const normalizedRef = String(match[3]).replaceAll("$", "");
  const [start, end] = normalizedRef.split(":");
  return { sheet: (match[1] ?? match[2] ?? "").replaceAll("''", "'"), ref: end === start ? start! : normalizedRef };
}

export function mapXlsxWorkflow(document: XlsxWorkflowDocument, targets: XlsxMappingTarget[]): XlsxMappedTarget[] {
  return targets.map((target) => {
    if (target.kind === "a1") {
      parseRangeRef(target.ref);
      if (!document.inspection.sheets.some((sheet) => sheet.name === target.sheet)) throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", `Sheet ${target.sheet} does not exist.`);
      return { id: target.id, source: target.kind, locator: locator(document.artifactId, target.sheet, target.ref) };
    }
    if (target.kind === "namedRange") {
      const found = document.inspection.namedRanges.find((entry) => entry.name.toLowerCase() === target.name.toLowerCase());
      const resolved = found && parseQualifiedRef(found.ref);
      if (!resolved) throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", `Defined name ${target.name} is absent or is not a plain A1 range.`);
      return { id: target.id, source: target.kind, locator: locator(document.artifactId, resolved.sheet, resolved.ref) };
    }
    const table = document.inspection.tables.find((entry) => entry.name.toLowerCase() === target.name.toLowerCase() || entry.displayName.toLowerCase() === target.name.toLowerCase());
    if (!table) throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", `Table ${target.name} does not exist.`);
    return { id: target.id, source: target.kind, locator: locator(document.artifactId, table.sheetName, table.ref) };
  });
}

function inRange(ref: string, range: string): boolean {
  const cell = parseCellRef(ref);
  const parsed = parseRangeRef(range);
  return cell.row >= parsed.startRow && cell.row <= parsed.endRow && cell.col >= parsed.startCol && cell.col <= parsed.endCol;
}

export function readXlsxWorkflow(document: XlsxWorkflowDocument, locators: XlsxLocator[]): XlsxWorkflowCell[] {
  const output: XlsxWorkflowCell[] = [];
  for (const target of locators) {
    if (target.artifactId !== document.artifactId || target.scheme !== "xlsx.a1") throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", "Locator does not belong to this workbook.", target);
    const [sheetName, ref] = target.value;
    const sheet = document.inspection.sheets.find((entry) => entry.name === sheetName);
    if (!sheet) throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", `Sheet ${sheetName} does not exist.`, target);
    const isRange = ref.includes(":");
    const matches = sheet.cells.filter((cell) => isRange ? inRange(cell.locator.value[1], ref) : cell.locator.value[1] === ref);
    if (!isRange && matches.length === 0) throw new XlsxWorkflowError("XLSX_CELL_NOT_FOUND", `Cell ${sheetName}!${ref} does not exist.`, target);
    output.push(...matches);
  }
  return output;
}

function ensureRows(worksheet: any): any[] {
  const sheetData = worksheet.sheetData ?? (worksheet.sheetData = {});
  if (sheetData.row === undefined) sheetData.row = [];
  else if (!Array.isArray(sheetData.row)) sheetData.row = [sheetData.row];
  return sheetData.row;
}

function ensureCells(row: any): any[] {
  if (row.c === undefined) row.c = [];
  else if (!Array.isArray(row.c)) row.c = [row.c];
  return row.c;
}

function findOrCreateCell(worksheet: any, ref: string): any {
  const parsed = parseCellRef(ref);
  const rows = ensureRows(worksheet);
  let row = rows.find((entry) => Number(entry?.["@_r"]) === parsed.row + 1);
  if (!row) {
    row = { "@_r": String(parsed.row + 1), c: [] };
    rows.push(row);
    rows.sort((left, right) => Number(left["@_r"]) - Number(right["@_r"]));
  }
  const cells = ensureCells(row);
  let cell = cells.find((entry) => String(entry?.["@_r"]) === ref);
  if (!cell) {
    cell = { "@_r": ref };
    cells.push(cell);
    cells.sort((left, right) => parseCellRef(String(left["@_r"])).col - parseCellRef(String(right["@_r"])).col);
  }
  return cell;
}

function clearCell(cell: any): void {
  delete cell["@_t"];
  delete cell.f;
  delete cell.v;
  delete cell.is;
}

function setCachedValue(cell: any, value: string | number | boolean | null | undefined): void {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") { cell["@_t"] = "b"; cell.v = value ? "1" : "0"; }
  else if (typeof value === "number") cell.v = formatNumberForCell(value);
  else { cell["@_t"] = "str"; cell.v = sanitizeSharedString(value); }
}

function setWriteValue(cell: any, value: XlsxCellWriteValue): void {
  clearCell(cell);
  if (value === null) return;
  if (typeof value === "string") {
    let firstContent = 0;
    while (firstContent < value.length && value.charCodeAt(firstContent) <= 0x20) firstContent += 1;
    if ("=+-@".includes(value[firstContent] ?? "")) throw new XlsxWorkflowError("XLSX_FORMULA_INJECTION", "Formula-like strings are rejected; use the explicit formula field for trusted formulas.");
    const sanitized = sanitizeSharedString(value);
    cell["@_t"] = "inlineStr";
    cell.is = { t: needsXmlSpacePreserve(sanitized) ? { "@_xml:space": "preserve", "#text": sanitized } : sanitized };
  } else if (typeof value === "number") cell.v = formatNumberForCell(value);
  else if (typeof value === "boolean") { cell["@_t"] = "b"; cell.v = value ? "1" : "0"; }
  else if ("dateSerial" in value) cell.v = formatNumberForCell(value.dateSerial);
  else { cell["@_t"] = "e"; cell.v = value.error; }
}

function updateExistingComment(parts: Map<string, Buffer>, sheetPath: string, write: XlsxCellWrite): void {
  if (write.comment === undefined) return;
  const relPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", name) => `${prefix}_rels/${name}.xml.rels`);
  const relationship = relationshipsFrom(parts.get(relPath), relPath).find((entry) => entry.type.endsWith("/comments") && !entry.external);
  if (!relationship || !parts.has(relationship.target)) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "v1 can update or remove an existing legacy comment but cannot create a new comment container.", write.locator);
  const root = parseXml(parts.get(relationship.target)!, relationship.target)?.comments;
  const comments = asArray<any>(root?.commentList?.comment);
  const target = comments.find((entry) => String(entry?.["@_ref"]) === write.locator.value[1]);
  if (!target) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "v1 can update or remove only an existing legacy comment.", write.locator);
  if (write.comment === null) root.commentList.comment = comments.filter((entry) => entry !== target);
  else {
    target.text = { t: write.comment.text };
    if (write.comment.author) {
      const authors = asArray<any>(root?.authors?.author).map(textOf);
      let authorId = authors.indexOf(write.comment.author);
      if (authorId < 0) { authors.push(write.comment.author); authorId = authors.length - 1; }
      root.authors = { author: authors };
      target["@_authorId"] = String(authorId);
    }
  }
  parts.set(relationship.target, Buffer.from(XML_DECLARATION + xmlBuilder.build({ comments: root }), "utf8"));
}

async function encodeParts(parts: Map<string, Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [path, bytes] of [...parts].sort(([left], [right]) => left.localeCompare(right))) {
    zip.file(path, bytes, { date: DETERMINISTIC_ZIP_DATE, createFolders: false });
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 }, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function writeXlsxWorkflow(document: XlsxWorkflowDocument, writes: XlsxCellWrite[], options: XlsxWorkflowOptions = {}): Promise<XlsxWorkflowDocument> {
  const parts = new Map(document.parts.map((part) => [part.path, Buffer.from(part.bytes)]));
  const workbook = parseXml(parts.get("xl/workbook.xml")!, "xl/workbook.xml")?.workbook;
  const relationships = new Map(relationshipsFrom(parts.get("xl/_rels/workbook.xml.rels"), "xl/_rels/workbook.xml.rels").map((entry) => [entry.id, entry]));
  const pathBySheet = new Map(asArray<any>(workbook?.sheets?.sheet).flatMap((entry) => {
    const relationship = relationships.get(String(entry?.["@_r:id"] ?? ""));
    return relationship && !relationship.external ? [[String(entry?.["@_name"] ?? ""), relationship.target] as const] : [];
  }));
  const seen = new Set<string>();
  for (const write of writes) {
    checkAbort(options.signal);
    if (write.locator.artifactId !== document.artifactId || write.locator.scheme !== "xlsx.a1" || write.locator.value[1].includes(":")) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "Writes require a single-cell locator owned by this workbook.", write.locator);
    const [sheetName, ref] = write.locator.value;
    parseCellRef(ref);
    const key = `${sheetName}!${ref}`;
    if (seen.has(key)) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", `Duplicate write target ${key}.`, write.locator);
    seen.add(key);
    if (write.value !== undefined && write.formula !== undefined) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "A write cannot contain both value and formula.", write.locator);
    const sheetPath = pathBySheet.get(sheetName);
    if (!sheetPath || !parts.has(sheetPath)) throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", `Sheet ${sheetName} does not exist.`, write.locator);
    if (write.value !== undefined || write.formula !== undefined) {
      const tree = parseXml(parts.get(sheetPath)!, sheetPath);
      const worksheet = tree?.worksheet ?? {};
      const cell = findOrCreateCell(worksheet, ref);
      if (write.formula) {
        clearCell(cell);
        cell.f = write.formula.expression.replace(/^=/, "");
        setCachedValue(cell, write.formula.cachedValue);
      } else if (write.value !== undefined) setWriteValue(cell, write.value);
      parts.set(sheetPath, Buffer.from(XML_DECLARATION + xmlBuilder.build({ worksheet }), "utf8"));
    }
    updateExistingComment(parts, sheetPath, write);
  }
  const buffer = await encodeParts(parts);
  return importXlsxWorkflow(buffer, { ...options, artifactId: document.artifactId });
}

export async function exportXlsxWorkflow(document: XlsxWorkflowDocument, options: { signal?: AbortSignal } = {}): Promise<Buffer> {
  checkAbort(options.signal);
  return encodeParts(new Map(document.parts.map((part) => [part.path, Buffer.from(part.bytes)])));
}

function cellKey(cell: XlsxWorkflowCell): string {
  return `${cell.locator.value[0]}!${cell.locator.value[1]}`;
}

function structureSnapshot(inspection: XlsxWorkflowInspection, allowed: ReadonlySet<string>): unknown {
  return {
    date1904: inspection.date1904,
    sheets: inspection.sheets.map((sheet) => ({
      name: sheet.name,
      state: sheet.state,
      hiddenRows: sheet.hiddenRows,
      hiddenColumns: sheet.hiddenColumns,
      mergedRanges: sheet.mergedRanges,
      validations: sheet.validations,
      comments: sheet.comments.filter((comment) => !allowed.has(`${sheet.name}!${comment.locator.value[1]}`)),
    })),
    namedRanges: inspection.namedRanges,
    tables: inspection.tables,
    macroParts: inspection.macroParts,
    opaqueParts: inspection.opaqueParts,
    externalLinks: inspection.externalLinks,
  };
}

export function verifyXlsxWorkflow(before: XlsxWorkflowDocument, after: XlsxWorkflowDocument, options: { allowedCells: XlsxLocator[] }): XlsxVerificationResult {
  const allowed = new Set(options.allowedCells.map((entry) => `${entry.value[0]}!${entry.value[1]}`));
  const issues: XlsxVerificationIssue[] = [];
  const beforeStructure = structureSnapshot(before.inspection, allowed);
  const afterStructure = structureSnapshot(after.inspection, allowed);
  if (before.inspection.styleCount !== after.inspection.styleCount || before.inspection.styleSha256 !== after.inspection.styleSha256) {
    issues.push({ code: "XLSX_STYLE_CHANGED", message: "Workbook style table changed outside the allowed write contract.", severity: "error", before: before.inspection.styleCount, after: after.inspection.styleCount });
  }
  if (canonicalString(beforeStructure) !== canonicalString(afterStructure)) {
    const beforeOpaque = canonicalString({ macro: before.inspection.macroParts, opaque: before.inspection.opaqueParts });
    const afterOpaque = canonicalString({ macro: after.inspection.macroParts, opaque: after.inspection.opaqueParts });
    issues.push({ code: beforeOpaque === afterOpaque ? "XLSX_STRUCTURE_CHANGED" : "XLSX_OPAQUE_PART_CHANGED", message: "Workbook structure or preserved opaque-part hashes changed outside the allowed cell set.", severity: "error" });
  }
  const beforeCells = new Map(before.inspection.sheets.flatMap((sheet) => sheet.cells).map((cell) => [cellKey(cell), cell]));
  const afterCells = new Map(after.inspection.sheets.flatMap((sheet) => sheet.cells).map((cell) => [cellKey(cell), cell]));
  for (const key of new Set([...beforeCells.keys(), ...afterCells.keys()])) {
    if (allowed.has(key)) continue;
    const prior = beforeCells.get(key);
    const next = afterCells.get(key);
    const target = prior?.locator ?? next?.locator;
    if (!prior || !next) {
      issues.push({ code: "XLSX_STRUCTURE_CHANGED", message: `Cell ${key} was ${prior ? "removed" : "added"}.`, severity: "error", locator: target });
      continue;
    }
    if (prior.formula !== next.formula || canonicalString(prior.cachedValue) !== canonicalString(next.cachedValue)) issues.push({ code: "XLSX_FORMULA_CHANGED", message: `Formula or cached value changed at ${key}.`, severity: "error", locator: target, before: prior.formula ?? prior.cachedValue, after: next.formula ?? next.cachedValue });
    if (prior.styleId !== next.styleId) issues.push({ code: "XLSX_STYLE_CHANGED", message: `Style reference changed at ${key}.`, severity: "error", locator: target, before: prior.styleId, after: next.styleId });
    if (!prior.formula && canonicalString(prior.value) !== canonicalString(next.value)) issues.push({ code: "XLSX_STRUCTURE_CHANGED", message: `Value changed at undeclared cell ${key}.`, severity: "error", locator: target, before: prior.value, after: next.value });
  }
  return { status: issues.length === 0 ? "PASS" : "FAIL", issues, allowedCells: options.allowedCells };
}

export const XLSX_STRUCTURED_WORKFLOW_MANIFEST = {
  schemaVersion: 1 as const,
  id: "runstamp.xlsx.structured-workflow",
  version: "1.0.0",
  catalogItemId: "A02",
  title: "XLSX structured workflow",
  operations: ["inspect", "import", "map", "read", "write", "export", "verify"].map((name) => ({ name, summary: `${name} an XLSX workbook without executing embedded content.`, inputKinds: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], outputKinds: ["application/json"] })),
  warningCodes: [
    { code: "XLSX_EXTERNAL_LINK_PRESERVED", description: "An external link was preserved without fetching it." },
    { code: "XLSX_FORMULA_NOT_RECALCULATED", description: "Formula caches are preserved, not recalculated." },
    { code: "XLSX_MACRO_PRESERVED_OPAQUE", description: "A macro payload was preserved without execution." },
    { code: "XLSX_UNSUPPORTED_FEATURE_PRESERVED", description: "An unsupported feature was preserved opaquely." },
  ],
  lossCodes: [
    { code: "XLSX_OPAQUE_PART_PRESERVED", description: "A safe unknown part was retained but is not editable in v1." },
  ],
};

function objectInput(input: unknown): Record<string, any> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new XlsxWorkflowError("XLSX_ARCHIVE_UNSAFE", "Operation input must be an object.");
  return input as Record<string, any>;
}

function serializableInspection(inspection: XlsxWorkflowInspection): Record<string, any> {
  return JSON.parse(JSON.stringify(inspection)) as Record<string, any>;
}

/** Structurally implements the neutral EX01 ExtensionDefinition without adding a runtime dependency. */
export function createXlsxStructuredWorkflowExtension() {
  return {
    manifest: XLSX_STRUCTURED_WORKFLOW_MANIFEST,
    async execute(request: any, context: any) {
      const input = objectInput(request.input);
      const decode = (field = "workbookBase64") => Buffer.from(String(input[field] ?? ""), "base64");
      const workflowOptions: XlsxWorkflowOptions = {
        artifactId: typeof input.artifactId === "string" ? input.artifactId : undefined,
        signal: context.signal,
        maxInputBytes: context.budget.maxInputBytes,
        maxParts: context.budget.maxEntries,
        maxCells: context.budget.maxEntries,
        maxPartBytes: context.budget.maxInputBytes,
      };
      context.reportProgress({ completed: 0, total: 1, message: request.operation });
      let output: any;
      let artifacts: any[] = [];
      let warnings: XlsxWorkflowDiagnostic[] = [];
      let losses: XlsxWorkflowDiagnostic[] = [];
      if (request.operation === "verify") {
        const before = await importXlsxWorkflow(decode("originalBase64"), workflowOptions);
        const after = await importXlsxWorkflow(decode("candidateBase64"), { ...workflowOptions, artifactId: before.artifactId });
        output = verifyXlsxWorkflow(before, after, { allowedCells: (input.allowedCells ?? []) as XlsxLocator[] });
      } else {
        const document = await importXlsxWorkflow(decode(), workflowOptions);
        warnings = document.inspection.warnings;
        losses = document.inspection.losses;
        if (request.operation === "inspect" || request.operation === "import") output = serializableInspection(document.inspection);
        else if (request.operation === "map") output = { mappings: mapXlsxWorkflow(document, input.targets ?? []) };
        else if (request.operation === "read") output = { cells: readXlsxWorkflow(document, input.locators ?? []) };
        else if (request.operation === "write") {
          const updated = await writeXlsxWorkflow(document, input.writes ?? [], workflowOptions);
          const bytes = await exportXlsxWorkflow(updated, { signal: context.signal });
          const digest = sha256(bytes);
          output = { workbookBase64: bytes.toString("base64"), inspection: serializableInspection(updated.inspection) };
          artifacts = [{ name: "workbook.xlsx", mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", byteLength: bytes.length, sha256: digest }];
        } else if (request.operation === "export") {
          const bytes = await exportXlsxWorkflow(document, { signal: context.signal });
          output = { workbookBase64: bytes.toString("base64") };
          artifacts = [{ name: "workbook.xlsx", mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", byteLength: bytes.length, sha256: sha256(bytes) }];
        } else throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", `Unsupported operation ${request.operation}.`);
      }
      const cleanOutput = JSON.parse(JSON.stringify(output));
      context.checkpoint({ outputBytes: Buffer.byteLength(JSON.stringify(cleanOutput)), entries: Array.isArray(cleanOutput) ? cleanOutput.length : 1, depth: 8 });
      context.reportProgress({ completed: 1, total: 1, message: request.operation });
      return { status: "ok" as const, output: cleanOutput, warnings, losses, artifacts };
    },
  };
}
