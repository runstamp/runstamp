import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { SpreadsheetTemplateParseError, type SpreadsheetTemplateParseIssue } from "./errors.js";
import { parseRangeRef } from "./utils/cell-ref.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

const DEFAULT_MAX_PART_COUNT = 2_000;
const DEFAULT_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_PART_BYTES = 16 * 1024 * 1024;

const REL_TYPE_WORKSHEET = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
const REL_TYPE_TABLE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/table";
const REL_TYPE_DRAWING = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing";

export interface SpreadsheetTemplateParseOptions {
  maxPartCount?: number;
  maxTotalBytes?: number;
  maxPartBytes?: number;
  preserveOpaqueParts?: boolean;
}

export interface SpreadsheetTemplateRelationship {
  source: string;
  target: string;
  type: string;
  id: string;
  external: boolean;
}

export interface SpreadsheetTemplateNamedRange {
  name: string;
  ref: string;
  scopeSheet?: string;
}

export interface SpreadsheetTemplateTable {
  name: string;
  displayName: string;
  ref: string;
  path: string;
  sheetName: string;
}

export interface SpreadsheetTemplateSheet {
  name: string;
  state: "visible" | "hidden" | "veryHidden";
  path: string;
  relationshipId: string;
  dimensionRef?: string;
  rowCount: number;
  formulaCells: string[];
  mergedRanges: string[];
  conditionalFormattingRefs: string[];
  dataValidationRefs: string[];
  tableNames: string[];
  drawingTargets: string[];
  hasPrintSettings: boolean;
  hasProtection: boolean;
}

export interface SpreadsheetTemplateStylesInventory {
  numFmtCount: number;
  fontCount: number;
  fillCount: number;
  borderCount: number;
  cellXfCount: number;
}

export type SpreadsheetTemplateSanitizationDisposition = "stripped" | "preserved" | "warning";

export interface SpreadsheetTemplateSanitizationAction {
  disposition: SpreadsheetTemplateSanitizationDisposition;
  path: string;
  category: string;
  reason: string;
}

export interface SpreadsheetPreservedOpaquePart {
  path: string;
  contentType?: string;
}

export interface SpreadsheetTemplateIndex {
  partNames: string[];
  relationships: SpreadsheetTemplateRelationship[];
  sheets: SpreadsheetTemplateSheet[];
  namedRanges: SpreadsheetTemplateNamedRange[];
  tables: SpreadsheetTemplateTable[];
  styles: SpreadsheetTemplateStylesInventory;
  preservedOpaqueParts: SpreadsheetPreservedOpaquePart[];
  sanitization: {
    actions: SpreadsheetTemplateSanitizationAction[];
  };
}

export interface SpreadsheetTemplateInjectionAnchor {
  kind: "namedRange" | "rowExpansion";
  label: string;
  sheetName?: string;
  ref: string;
  reason: string;
}

export interface SpreadsheetTemplateRowHint {
  sheetName: string;
  rowNumber: number;
  reason: string;
}

export interface SpreadsheetTemplateInspectionReport {
  sheetInventory: SpreadsheetTemplateSheet[];
  namedRangeInventory: SpreadsheetTemplateNamedRange[];
  tableInventory: SpreadsheetTemplateTable[];
  sanitizationActions: SpreadsheetTemplateSanitizationAction[];
  unsupportedPreservedParts: SpreadsheetPreservedOpaquePart[];
  recommendedInjectionAnchors: SpreadsheetTemplateInjectionAnchor[];
  rowTemplateDetectionHints: SpreadsheetTemplateRowHint[];
}

const templateSourceStores = new WeakMap<SpreadsheetTemplateIndex, Map<string, Buffer>>();

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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

function parseXml(xml: string, path: string): any {
  if (/<!(?:DOCTYPE|ENTITY)/i.test(xml)) {
    throw new SpreadsheetTemplateParseError([{
      code: "TEMPLATE_XML_UNSAFE",
      message: `Unsafe XML markup detected in ${path}`,
      path,
    }]);
  }
  return xmlParser.parse(xml);
}

function isUnsafePath(path: string): boolean {
  return path.startsWith("/")
    || path.includes("\\")
    || path.includes("..")
    || path.includes("__MACOSX")
    || [...path].some((character) => character.charCodeAt(0) <= 31);
}

function isStrippedTemplatePart(path: string): { category: string; reason: string } | null {
  if (/^(EncryptedPackage|EncryptionInfo)$/.test(path)) {
    return { category: "encryption", reason: "Encrypted Office packages are not supported" };
  }
  if (/^xl\/vbaProject\.bin$/i.test(path)) {
    return { category: "macro", reason: "VBA macro payloads are stripped during template parse" };
  }
  if (/^xl\/embeddings\//i.test(path)) {
    return { category: "embedding", reason: "OLE embeddings are stripped during template parse" };
  }
  if (/^xl\/connections(\.xml|\/)/i.test(path)) {
    return { category: "connection", reason: "External data connection metadata is stripped during template parse" };
  }
  if (/^xl\/externalLinks(\/|\.xml)/i.test(path)) {
    return { category: "externalLink", reason: "Linked external workbook parts are stripped during template parse" };
  }
  return null;
}

function inferContentType(
  path: string,
  overrides: Map<string, string>,
  defaults: Map<string, string>,
): string | undefined {
  const override = overrides.get(path);
  if (override) {
    return override;
  }
  const extension = path.split(".").pop()?.toLowerCase();
  if (!extension) {
    return undefined;
  }
  return defaults.get(extension);
}

function normalizeSheetState(value: string | undefined): "visible" | "hidden" | "veryHidden" {
  if (value === "hidden" || value === "veryHidden") {
    return value;
  }
  return "visible";
}

function parseDefinedNameTarget(ref: string): { sheetName?: string; rangeRef: string } {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return { rangeRef: ref.trim() };
  }
  return {
    sheetName: (match[1] ?? match[2] ?? "").replaceAll("''", "'"),
    rangeRef: match[3] ?? ref.trim(),
  };
}

function extractRowTemplateHints(index: SpreadsheetTemplateIndex): SpreadsheetTemplateRowHint[] {
  return index.namedRanges.flatMap((namedRange) => {
    const target = parseDefinedNameTarget(namedRange.ref);
    if (!target.sheetName) {
      return [];
    }
    try {
      const range = parseRangeRef(target.rangeRef);
      const spansMultipleCells = range.startRow !== range.endRow || range.startCol !== range.endCol;
      if (range.startRow !== range.endRow || !spansMultipleCells) {
        return [];
      }
      return [{
        sheetName: target.sheetName,
        rowNumber: range.startRow + 1,
        reason: `Named range ${namedRange.name} spans a single template row`,
      }];
    } catch {
      return [];
    }
  });
}

function extractRecommendedAnchors(index: SpreadsheetTemplateIndex): SpreadsheetTemplateInjectionAnchor[] {
  const namedAnchors = index.namedRanges.map((namedRange) => {
    const target = parseDefinedNameTarget(namedRange.ref);
    let kind: SpreadsheetTemplateInjectionAnchor["kind"] = "namedRange";
    let reason = "Workbook defined name can be targeted directly for injection";
    if (target.sheetName) {
      try {
        const range = parseRangeRef(target.rangeRef);
        const spansMultipleCells = range.startRow !== range.endRow || range.startCol !== range.endCol;
        if (range.startRow === range.endRow && spansMultipleCells) {
          kind = "rowExpansion";
          reason = "Single-row named range is a good candidate for row expansion";
        }
      } catch {
        // leave as named-range anchor when the ref is not a plain A1 range
      }
    }

    return {
      kind,
      label: namedRange.name,
      sheetName: target.sheetName,
      ref: namedRange.ref,
      reason,
    };
  });

  return namedAnchors;
}

function collectStylesInventory(stylesXml: string | undefined): SpreadsheetTemplateStylesInventory {
  if (!stylesXml) {
    return {
      numFmtCount: 0,
      fontCount: 0,
      fillCount: 0,
      borderCount: 0,
      cellXfCount: 0,
    };
  }

  const styles = parseXml(stylesXml, "xl/styles.xml")?.styleSheet;
  return {
    numFmtCount: Number(styles?.numFmts?.["@_count"] ?? asArray(styles?.numFmts?.numFmt).length),
    fontCount: Number(styles?.fonts?.["@_count"] ?? asArray(styles?.fonts?.font).length),
    fillCount: Number(styles?.fills?.["@_count"] ?? asArray(styles?.fills?.fill).length),
    borderCount: Number(styles?.borders?.["@_count"] ?? asArray(styles?.borders?.border).length),
    cellXfCount: Number(styles?.cellXfs?.["@_count"] ?? asArray(styles?.cellXfs?.xf).length),
  };
}

export async function parseTemplate(
  buffer: Buffer,
  options?: SpreadsheetTemplateParseOptions,
): Promise<SpreadsheetTemplateIndex> {
  const maxPartCount = options?.maxPartCount ?? DEFAULT_MAX_PART_COUNT;
  const maxTotalBytes = options?.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const maxPartBytes = options?.maxPartBytes ?? DEFAULT_MAX_PART_BYTES;
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.values(zip.files).filter((file) => !file.dir);
  const partNames = files.map((file) => file.name).sort();
  const issues: SpreadsheetTemplateParseIssue[] = [];

  if (partNames.length > maxPartCount) {
    issues.push({
      code: "TEMPLATE_TOO_MANY_PARTS",
      message: `Template contains ${partNames.length} parts, exceeding the ceiling of ${maxPartCount}`,
    });
  }

  let totalBytes = 0;
  for (const file of files) {
    if (isUnsafePath(file.name)) {
      issues.push({
        code: "TEMPLATE_FILENAME_UNSAFE",
        message: `Template contains an unsafe part path: ${file.name}`,
        path: file.name,
      });
      continue;
    }

    const content = await file.async("nodebuffer");
    totalBytes += content.length;

    if (content.length > maxPartBytes) {
      issues.push({
        code: "TEMPLATE_PART_TOO_LARGE",
        message: `Template part ${file.name} exceeds the per-part ceiling of ${maxPartBytes} bytes`,
        path: file.name,
      });
    }
  }

  if (totalBytes > maxTotalBytes) {
    issues.push({
      code: "TEMPLATE_TOO_LARGE",
      message: `Template expands to ${totalBytes} bytes, exceeding the ceiling of ${maxTotalBytes}`,
    });
  }

  if (partNames.includes("EncryptedPackage") || partNames.includes("EncryptionInfo")) {
    issues.push({
      code: "TEMPLATE_ENCRYPTED",
      message: "Encrypted Office packages are not supported",
    });
  }

  if (issues.length > 0) {
    throw new SpreadsheetTemplateParseError(issues);
  }

  const contentTypesFile = zip.file("[Content_Types].xml");
  const workbookFile = zip.file("xl/workbook.xml");
  const workbookRelsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (!workbookFile) {
    throw new SpreadsheetTemplateParseError([{ code: "TEMPLATE_WORKBOOK_MISSING", message: "Missing xl/workbook.xml", path: "xl/workbook.xml" }]);
  }
  if (!workbookRelsFile) {
    throw new SpreadsheetTemplateParseError([{ code: "TEMPLATE_WORKBOOK_RELS_MISSING", message: "Missing xl/_rels/workbook.xml.rels", path: "xl/_rels/workbook.xml.rels" }]);
  }

  const sanitizationActions: SpreadsheetTemplateSanitizationAction[] = [];
  const strippedParts = new Set<string>();
  for (const path of partNames) {
    const stripped = isStrippedTemplatePart(path);
    if (!stripped) {
      continue;
    }
    strippedParts.add(path);
    sanitizationActions.push({
      disposition: "stripped",
      path,
      category: stripped.category,
      reason: stripped.reason,
    });
  }

  const contentTypesXml = await contentTypesFile?.async("string");
  const contentTypes = contentTypesXml ? parseXml(contentTypesXml, "[Content_Types].xml")?.Types : null;
  const overrides = new Map(
    asArray(contentTypes?.Override).map((entry) => [
      String(entry["@_PartName"]).replace(/^\//, ""),
      String(entry["@_ContentType"]),
    ]),
  );
  const defaults = new Map(
    asArray(contentTypes?.Default).map((entry) => [
      String(entry["@_Extension"]).toLowerCase(),
      String(entry["@_ContentType"]),
    ]),
  );

  const workbookXml = await workbookFile.async("string");
  const workbook = parseXml(workbookXml, "xl/workbook.xml")?.workbook;
  const workbookRelsXml = await workbookRelsFile.async("string");
  const workbookRels = parseXml(workbookRelsXml, "xl/_rels/workbook.xml.rels")?.Relationships;
  const workbookRelationshipMap = new Map(
    asArray(workbookRels?.Relationship).map((relationship) => {
      const id = String(relationship["@_Id"]);
      const target = String(relationship["@_Target"]);
      return [id, {
        id,
        type: String(relationship["@_Type"]),
        target,
        resolvedTarget: resolveRelationshipTarget("xl/_rels/workbook.xml.rels", target),
        external: relationship["@_TargetMode"] === "External",
      }] as const;
    }),
  );

  const relationships: SpreadsheetTemplateRelationship[] = [...workbookRelationshipMap.values()].map((relationship) => ({
    source: "xl/workbook.xml",
    target: relationship.resolvedTarget,
    type: relationship.type,
    id: relationship.id,
    external: relationship.external,
  }));

  const tables: SpreadsheetTemplateTable[] = [];
  const sheets = await Promise.all(asArray(workbook?.sheets?.sheet).map(async (sheetNode) => {
    const relationshipId = String(sheetNode["@_r:id"]);
    const sheetRelationship = workbookRelationshipMap.get(relationshipId);
    const sheetPath = sheetRelationship?.resolvedTarget;
    if (!sheetPath || strippedParts.has(sheetPath) || sheetRelationship.type !== REL_TYPE_WORKSHEET) {
      return null;
    }

    const sheetXml = await zip.file(sheetPath)?.async("string");
    const sheetTree = sheetXml ? parseXml(sheetXml, sheetPath)?.worksheet : null;
    const sheetRelsPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", fileName) => `${prefix}_rels/${fileName}.xml.rels`);
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async("string");
    const sheetRels = sheetRelsXml ? parseXml(sheetRelsXml, sheetRelsPath)?.Relationships : null;
    const sheetRelationshipEntries = asArray(sheetRels?.Relationship).map((relationship) => ({
      id: String(relationship["@_Id"]),
      type: String(relationship["@_Type"]),
      target: String(relationship["@_Target"]),
      resolvedTarget: resolveRelationshipTarget(sheetRelsPath, String(relationship["@_Target"])),
      external: relationship["@_TargetMode"] === "External",
    }));
    relationships.push(...sheetRelationshipEntries.map((relationship) => ({
      source: sheetPath,
      target: relationship.resolvedTarget,
      type: relationship.type,
      id: relationship.id,
      external: relationship.external,
    })));

    const rows = asArray(sheetTree?.sheetData?.row);
    const formulaCells = rows.flatMap((row) => asArray(row.c)
      .filter((cell) => cell?.f !== undefined)
      .map((cell) => String(cell["@_r"])));
    const mergedRanges = asArray(sheetTree?.mergeCells?.mergeCell).map((mergeCell) => String(mergeCell["@_ref"]));
    const conditionalFormattingRefs = asArray(sheetTree?.conditionalFormatting).map((entry) => String(entry["@_sqref"])).filter(Boolean);
    const dataValidationRefs = asArray(sheetTree?.dataValidations?.dataValidation).map((entry) => String(entry["@_sqref"])).filter(Boolean);
    const drawingTargets = sheetRelationshipEntries
      .filter((relationship) => relationship.type === REL_TYPE_DRAWING && !strippedParts.has(relationship.resolvedTarget))
      .map((relationship) => relationship.resolvedTarget);

    const tableNames: string[] = [];
    for (const relationship of sheetRelationshipEntries.filter((entry) => entry.type === REL_TYPE_TABLE)) {
      if (strippedParts.has(relationship.resolvedTarget)) {
        continue;
      }
      const tableXml = await zip.file(relationship.resolvedTarget)?.async("string");
      const tableTree = tableXml ? parseXml(tableXml, relationship.resolvedTarget)?.table : null;
      const displayName = String(tableTree?.["@_displayName"] ?? tableTree?.["@_name"] ?? relationship.resolvedTarget);
      tableNames.push(displayName);
      tables.push({
        name: String(tableTree?.["@_name"] ?? displayName),
        displayName,
        ref: String(tableTree?.["@_ref"] ?? ""),
        path: relationship.resolvedTarget,
        sheetName: String(sheetNode["@_name"]),
      });
    }

    return {
      name: String(sheetNode["@_name"]),
      state: normalizeSheetState(sheetNode["@_state"]),
      path: sheetPath,
      relationshipId,
      dimensionRef: sheetTree?.dimension?.["@_ref"] ? String(sheetTree.dimension["@_ref"]) : undefined,
      rowCount: rows.length,
      formulaCells,
      mergedRanges,
      conditionalFormattingRefs,
      dataValidationRefs,
      tableNames,
      drawingTargets,
      hasPrintSettings: Boolean(sheetTree?.pageMargins || sheetTree?.pageSetup || sheetTree?.printOptions),
      hasProtection: Boolean(sheetTree?.sheetProtection),
    } satisfies SpreadsheetTemplateSheet;
  }));

  const namedRanges = asArray(workbook?.definedNames?.definedName).map((definedName) => ({
    name: String(definedName["@_name"]),
    ref: getTextContent(definedName),
    scopeSheet: definedName["@_localSheetId"] !== undefined
      ? sheets[Number(definedName["@_localSheetId"])]?.name
      : undefined,
  })).filter((namedRange) => namedRange.name && namedRange.ref);
  const filteredSheets = sheets.flatMap((sheet) => (sheet ? [sheet] : []));

  const understoodParts = new Set<string>([
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/sharedStrings.xml",
    "xl/theme/theme1.xml",
    "docProps/core.xml",
    "docProps/app.xml",
    ...filteredSheets.flatMap((sheet) => {
      const relPath = sheet.path.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", fileName) => `${prefix}_rels/${fileName}.xml.rels`);
      return [sheet.path, relPath];
    }),
    ...tables.map((table) => table.path),
  ]);

  const preservedOpaqueParts = partNames
    .filter((path) => !strippedParts.has(path) && !understoodParts.has(path))
    .map((path) => ({
      path,
      contentType: inferContentType(path, overrides, defaults),
    }));

  preservedOpaqueParts.forEach((part) => {
    sanitizationActions.push({
      disposition: "preserved",
      path: part.path,
      category: "opaquePart",
      reason: "Unknown but safe part preserved as an opaque template payload",
    });
  });

  const index: SpreadsheetTemplateIndex = {
    partNames,
    relationships,
    sheets: filteredSheets,
    namedRanges,
    tables,
    styles: collectStylesInventory(await zip.file("xl/styles.xml")?.async("string")),
    preservedOpaqueParts: options?.preserveOpaqueParts === false ? [] : preservedOpaqueParts,
    sanitization: {
      actions: sanitizationActions,
    },
  };

  const safeParts = new Map<string, Buffer>();
  await Promise.all(partNames
    .filter((path) => !strippedParts.has(path))
    .map(async (path) => {
      const content = await zip.file(path)?.async("nodebuffer");
      if (content) {
        safeParts.set(path, content);
      }
    }));
  templateSourceStores.set(index, safeParts);

  return index;
}

export function inspectTemplate(index: SpreadsheetTemplateIndex): SpreadsheetTemplateInspectionReport {
  return {
    sheetInventory: index.sheets,
    namedRangeInventory: index.namedRanges,
    tableInventory: index.tables,
    sanitizationActions: index.sanitization.actions,
    unsupportedPreservedParts: index.preservedOpaqueParts,
    recommendedInjectionAnchors: extractRecommendedAnchors(index),
    rowTemplateDetectionHints: extractRowTemplateHints(index),
  };
}

export function getTemplateSourceParts(index: SpreadsheetTemplateIndex): Map<string, Buffer> | undefined {
  return templateSourceStores.get(index);
}
