import {
  DETERMINISTIC_ZIP_DATE,
  XML_DECLARATION,
  formatNumberForCell,
  needsXmlSpacePreserve,
  parseCellRef,
  parseRangeRef,
  sanitizeSharedString
} from "./chunk-YMTIFCEA.js";

// src/structured-workflow.ts
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
var xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false
});
var xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: false
});
var DEFAULT_MAX_INPUT_BYTES = 64 * 1024 * 1024;
var DEFAULT_MAX_PART_BYTES = 16 * 1024 * 1024;
var DEFAULT_MAX_PARTS = 2e3;
var DEFAULT_MAX_CELLS = 1e6;
var XlsxWorkflowError = class extends Error {
  code;
  locator;
  constructor(code, message, locator2) {
    super(message);
    this.name = "XlsxWorkflowError";
    this.code = code;
    this.locator = locator2;
  }
};
function asArray(value) {
  if (value === void 0) return [];
  return Array.isArray(value) ? value : [value];
}
function textOf(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) return String(value["#text"] ?? "");
  return "";
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function checkAbort(signal) {
  if (signal?.aborted) {
    throw new XlsxWorkflowError("XLSX_ABORTED", typeof signal.reason === "string" ? signal.reason : "XLSX workflow aborted.");
  }
}
function unsafeArchivePath(path) {
  return path.startsWith("/") || path.includes("\\") || path.split("/").includes("..") || [...path].some((character) => character.charCodeAt(0) <= 31);
}
function parseXml(bytes, path) {
  const xml = bytes.toString("utf8");
  if (/<!(?:DOCTYPE|ENTITY)/i.test(xml)) {
    throw new XlsxWorkflowError("XLSX_XML_UNSAFE", `Unsafe XML declaration in ${path}.`);
  }
  return xmlParser.parse(xml);
}
function resolveTarget(sourcePath, target) {
  const sourceDir = posix.dirname(sourcePath);
  return posix.normalize(posix.join(sourceDir, target)).replace(/^\//, "");
}
function relationshipsFrom(bytes, sourcePath) {
  if (!bytes) return [];
  const root = parseXml(bytes, sourcePath)?.Relationships;
  return asArray(root?.Relationship).map((entry) => ({
    id: String(entry?.["@_Id"] ?? ""),
    type: String(entry?.["@_Type"] ?? ""),
    target: entry?.["@_TargetMode"] === "External" ? String(entry?.["@_Target"] ?? "") : resolveTarget(sourcePath.replace(/\/_rels\/([^/]+)\.rels$/, "/$1"), String(entry?.["@_Target"] ?? "")),
    external: entry?.["@_TargetMode"] === "External"
  }));
}
function locator(artifactId, sheet, ref) {
  return { artifactId, scheme: "xlsx.a1", value: [sheet, ref.toUpperCase()] };
}
function parseBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}
function parseSharedStrings(parts) {
  const bytes = parts.get("xl/sharedStrings.xml");
  if (!bytes) return [];
  const root = parseXml(bytes, "xl/sharedStrings.xml")?.sst;
  return asArray(root?.si).map((entry) => {
    if (entry?.t !== void 0) return textOf(entry.t);
    return asArray(entry?.r).map((run) => textOf(run?.t)).join("");
  });
}
function parseScalar(cell, sharedStrings) {
  const type = String(cell?.["@_t"] ?? "n");
  if (type === "inlineStr") return { value: textOf(cell?.is?.t) || asArray(cell?.is?.r).map((run) => textOf(run?.t)).join(""), type: "string" };
  if (type === "s") return { value: sharedStrings[Number(textOf(cell?.v))] ?? "", type: "string" };
  if (type === "str") return { value: textOf(cell?.v), type: "string" };
  if (type === "b") return { value: textOf(cell?.v) === "1", type: "boolean" };
  if (type === "e") return { value: textOf(cell?.v), type: "error" };
  const raw = textOf(cell?.v);
  if (raw === "") return { value: null, type: "blank" };
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? { value: numeric, type: "number" } : { value: raw, type: "string" };
}
function parseComments(artifactId, sheetName, sheetPath, parts) {
  const relPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", name) => `${prefix}_rels/${name}.xml.rels`);
  const relationship = relationshipsFrom(parts.get(relPath), relPath).find((entry) => entry.type.endsWith("/comments"));
  if (!relationship || relationship.external) return [];
  const commentBytes = parts.get(relationship.target);
  if (!commentBytes) return [];
  const root = parseXml(commentBytes, relationship.target)?.comments;
  const authors = asArray(root?.authors?.author).map(textOf);
  return asArray(root?.commentList?.comment).map((entry) => ({
    locator: locator(artifactId, sheetName, String(entry?.["@_ref"] ?? "A1")),
    author: authors[Number(entry?.["@_authorId"] ?? 0)],
    text: textOf(entry?.text?.t) || asArray(entry?.text?.r).map((run) => textOf(run?.t)).join("")
  }));
}
function knownPart(path) {
  return path === "[Content_Types].xml" || path === "_rels/.rels" || path.startsWith("docProps/") || path === "xl/workbook.xml" || path === "xl/_rels/workbook.xml.rels" || path === "xl/styles.xml" || path === "xl/sharedStrings.xml" || path.startsWith("xl/worksheets/") || path.startsWith("xl/tables/") || path.startsWith("xl/comments") || path.startsWith("xl/theme/") || path.startsWith("xl/persons/") || path.startsWith("xl/threadedComments/");
}
function canonicalString(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalString).join(",")}]`;
  const record = value;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalString(record[key])}`).join(",")}}`;
}
async function inspectParts(buffer, artifactId, parts, options) {
  const workbookBytes = parts.get("xl/workbook.xml");
  const relBytes = parts.get("xl/_rels/workbook.xml.rels");
  if (!workbookBytes || !relBytes) throw new XlsxWorkflowError("XLSX_ARCHIVE_UNSAFE", "Workbook XML or relationships are missing.");
  const workbook = parseXml(workbookBytes, "xl/workbook.xml")?.workbook;
  const relationships = relationshipsFrom(relBytes, "xl/_rels/workbook.xml.rels");
  const relById = new Map(relationships.map((entry) => [entry.id, entry]));
  const sharedStrings = parseSharedStrings(parts);
  const warnings = [];
  const losses = [];
  const macroParts = [];
  const opaqueParts = [];
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
  const sheets = [];
  const sheetPathByName = /* @__PURE__ */ new Map();
  let cellCount = 0;
  for (const sheetEntry of asArray(workbook?.sheets?.sheet)) {
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
    const cells = [];
    const hiddenRows = [];
    for (const row of asArray(sheet?.sheetData?.row)) {
      if (parseBoolean(row?.["@_hidden"])) hiddenRows.push(Number(row?.["@_r"] ?? 0));
      for (const cell of asArray(row?.c)) {
        cellCount += 1;
        if (cellCount > (options.maxCells ?? DEFAULT_MAX_CELLS)) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `Workbook exceeds maxCells ${options.maxCells ?? DEFAULT_MAX_CELLS}.`);
        const ref = String(cell?.["@_r"] ?? "");
        const scalar = parseScalar(cell, sharedStrings);
        const formula = cell?.f === void 0 ? void 0 : textOf(cell.f);
        cells.push({
          locator: locator(artifactId, sheetName, ref),
          value: formula ? null : scalar.value,
          valueType: formula ? "blank" : scalar.type,
          formula,
          cachedValue: formula ? scalar.value : void 0,
          styleId: cell?.["@_s"] === void 0 ? void 0 : Number(cell["@_s"])
        });
      }
    }
    const hiddenColumns = asArray(sheet?.cols?.col).filter((column) => parseBoolean(column?.["@_hidden"])).map((column) => ({ min: Number(column?.["@_min"]), max: Number(column?.["@_max"]) }));
    const validations = asArray(sheet?.dataValidations?.dataValidation).map((entry) => ({
      ref: String(entry?.["@_sqref"] ?? ""),
      type: entry?.["@_type"] === void 0 ? void 0 : String(entry["@_type"]),
      operator: entry?.["@_operator"] === void 0 ? void 0 : String(entry["@_operator"]),
      formula1: entry?.formula1 === void 0 ? void 0 : textOf(entry.formula1),
      formula2: entry?.formula2 === void 0 ? void 0 : textOf(entry.formula2)
    }));
    sheets.push({
      name: sheetName,
      state: sheetEntry?.["@_state"] === "hidden" || sheetEntry?.["@_state"] === "veryHidden" ? sheetEntry["@_state"] : "visible",
      dimensionRef: sheet?.dimension?.["@_ref"] === void 0 ? void 0 : String(sheet.dimension["@_ref"]),
      hiddenRows,
      hiddenColumns,
      mergedRanges: asArray(sheet?.mergeCells?.mergeCell).map((entry) => String(entry?.["@_ref"] ?? "")),
      validations,
      cells,
      comments: parseComments(artifactId, sheetName, relationship.target, parts)
    });
  }
  const namedRanges = asArray(workbook?.definedNames?.definedName).map((entry) => {
    const scopeIndex = entry?.["@_localSheetId"] === void 0 ? void 0 : Number(entry["@_localSheetId"]);
    return {
      name: String(entry?.["@_name"] ?? ""),
      ref: textOf(entry),
      scopeSheet: scopeIndex === void 0 ? void 0 : sheets[scopeIndex]?.name
    };
  });
  const tables = [];
  for (const sheet of sheets) {
    const sheetPath = sheetPathByName.get(sheet.name);
    if (!sheetPath) continue;
    const relPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", name) => `${prefix}_rels/${name}.xml.rels`);
    for (const relationship of relationshipsFrom(parts.get(relPath), relPath).filter((entry) => entry.type.endsWith("/table") && !entry.external)) {
      const table = parts.get(relationship.target) ? parseXml(parts.get(relationship.target), relationship.target)?.table : void 0;
      if (table) tables.push({ name: String(table["@_name"] ?? ""), displayName: String(table["@_displayName"] ?? table["@_name"] ?? ""), sheetName: sheet.name, ref: String(table["@_ref"] ?? "") });
    }
  }
  const styleRoot = parts.get("xl/styles.xml") ? parseXml(parts.get("xl/styles.xml"), "xl/styles.xml")?.styleSheet : void 0;
  const styleCount = Number(styleRoot?.cellXfs?.["@_count"] ?? asArray(styleRoot?.cellXfs?.xf).length);
  const styleSha256 = parts.get("xl/styles.xml") ? sha256(parts.get("xl/styles.xml")) : void 0;
  const externalLinks = [...externalLinkSet].sort();
  for (const target of externalLinks) warnings.push({ code: "XLSX_EXTERNAL_LINK_PRESERVED", message: `External link ${target} is preserved but never fetched.`, severity: "warning" });
  if (sheets.some((sheet) => sheet.cells.some((cell) => cell.formula !== void 0))) {
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
    losses
  };
}
async function importXlsxWorkflow(buffer, options = {}) {
  checkAbort(options.signal);
  const maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;
  if (buffer.length > maxInputBytes) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `Input ${buffer.length} bytes exceeds maxInputBytes ${maxInputBytes}.`);
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  } catch (error) {
    throw new XlsxWorkflowError(
      "XLSX_ARCHIVE_UNSAFE",
      `Workbook is not a readable XLSX ZIP package: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const files = Object.values(zip.files).filter((file) => !file.dir);
  if (files.length > (options.maxParts ?? DEFAULT_MAX_PARTS)) throw new XlsxWorkflowError("XLSX_BUDGET_EXCEEDED", `Archive exceeds maxParts ${options.maxParts ?? DEFAULT_MAX_PARTS}.`);
  const parts = /* @__PURE__ */ new Map();
  let total = 0;
  for (const file of files.sort((left, right) => left.name.localeCompare(right.name))) {
    checkAbort(options.signal);
    const originalName = file.unsafeOriginalName ?? file.name;
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
async function inspectXlsxWorkflow(buffer, options = {}) {
  return (await importXlsxWorkflow(buffer, options)).inspection;
}
function parseQualifiedRef(ref) {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) return void 0;
  const normalizedRef = String(match[3]).replaceAll("$", "");
  const [start, end] = normalizedRef.split(":");
  return { sheet: (match[1] ?? match[2] ?? "").replaceAll("''", "'"), ref: end === start ? start : normalizedRef };
}
function mapXlsxWorkflow(document, targets) {
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
function inRange(ref, range) {
  const cell = parseCellRef(ref);
  const parsed = parseRangeRef(range);
  return cell.row >= parsed.startRow && cell.row <= parsed.endRow && cell.col >= parsed.startCol && cell.col <= parsed.endCol;
}
function readXlsxWorkflow(document, locators) {
  const output = [];
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
function ensureRows(worksheet) {
  const sheetData = worksheet.sheetData ?? (worksheet.sheetData = {});
  if (sheetData.row === void 0) sheetData.row = [];
  else if (!Array.isArray(sheetData.row)) sheetData.row = [sheetData.row];
  return sheetData.row;
}
function ensureCells(row) {
  if (row.c === void 0) row.c = [];
  else if (!Array.isArray(row.c)) row.c = [row.c];
  return row.c;
}
function findOrCreateCell(worksheet, ref) {
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
function clearCell(cell) {
  delete cell["@_t"];
  delete cell.f;
  delete cell.v;
  delete cell.is;
}
function setCachedValue(cell, value) {
  if (value === void 0 || value === null) return;
  if (typeof value === "boolean") {
    cell["@_t"] = "b";
    cell.v = value ? "1" : "0";
  } else if (typeof value === "number") cell.v = formatNumberForCell(value);
  else {
    cell["@_t"] = "str";
    cell.v = sanitizeSharedString(value);
  }
}
function setWriteValue(cell, value) {
  clearCell(cell);
  if (value === null) return;
  if (typeof value === "string") {
    let firstContent = 0;
    while (firstContent < value.length && value.charCodeAt(firstContent) <= 32) firstContent += 1;
    if ("=+-@".includes(value[firstContent] ?? "")) throw new XlsxWorkflowError("XLSX_FORMULA_INJECTION", "Formula-like strings are rejected; use the explicit formula field for trusted formulas.");
    const sanitized = sanitizeSharedString(value);
    cell["@_t"] = "inlineStr";
    cell.is = { t: needsXmlSpacePreserve(sanitized) ? { "@_xml:space": "preserve", "#text": sanitized } : sanitized };
  } else if (typeof value === "number") cell.v = formatNumberForCell(value);
  else if (typeof value === "boolean") {
    cell["@_t"] = "b";
    cell.v = value ? "1" : "0";
  } else if ("dateSerial" in value) cell.v = formatNumberForCell(value.dateSerial);
  else {
    cell["@_t"] = "e";
    cell.v = value.error;
  }
}
function updateExistingComment(parts, sheetPath, write) {
  if (write.comment === void 0) return;
  const relPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", name) => `${prefix}_rels/${name}.xml.rels`);
  const relationship = relationshipsFrom(parts.get(relPath), relPath).find((entry) => entry.type.endsWith("/comments") && !entry.external);
  if (!relationship || !parts.has(relationship.target)) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "v1 can update or remove an existing legacy comment but cannot create a new comment container.", write.locator);
  const root = parseXml(parts.get(relationship.target), relationship.target)?.comments;
  const comments = asArray(root?.commentList?.comment);
  const target = comments.find((entry) => String(entry?.["@_ref"]) === write.locator.value[1]);
  if (!target) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "v1 can update or remove only an existing legacy comment.", write.locator);
  if (write.comment === null) root.commentList.comment = comments.filter((entry) => entry !== target);
  else {
    target.text = { t: write.comment.text };
    if (write.comment.author) {
      const authors = asArray(root?.authors?.author).map(textOf);
      let authorId = authors.indexOf(write.comment.author);
      if (authorId < 0) {
        authors.push(write.comment.author);
        authorId = authors.length - 1;
      }
      root.authors = { author: authors };
      target["@_authorId"] = String(authorId);
    }
  }
  parts.set(relationship.target, Buffer.from(XML_DECLARATION + xmlBuilder.build({ comments: root }), "utf8"));
}
async function encodeParts(parts) {
  const zip = new JSZip();
  for (const [path, bytes] of [...parts].sort(([left], [right]) => left.localeCompare(right))) {
    zip.file(path, bytes, { date: DETERMINISTIC_ZIP_DATE, createFolders: false });
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 }, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
async function writeXlsxWorkflow(document, writes, options = {}) {
  const parts = new Map(document.parts.map((part) => [part.path, Buffer.from(part.bytes)]));
  const workbook = parseXml(parts.get("xl/workbook.xml"), "xl/workbook.xml")?.workbook;
  const relationships = new Map(relationshipsFrom(parts.get("xl/_rels/workbook.xml.rels"), "xl/_rels/workbook.xml.rels").map((entry) => [entry.id, entry]));
  const pathBySheet = new Map(asArray(workbook?.sheets?.sheet).flatMap((entry) => {
    const relationship = relationships.get(String(entry?.["@_r:id"] ?? ""));
    return relationship && !relationship.external ? [[String(entry?.["@_name"] ?? ""), relationship.target]] : [];
  }));
  const seen = /* @__PURE__ */ new Set();
  for (const write of writes) {
    checkAbort(options.signal);
    if (write.locator.artifactId !== document.artifactId || write.locator.scheme !== "xlsx.a1" || write.locator.value[1].includes(":")) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "Writes require a single-cell locator owned by this workbook.", write.locator);
    const [sheetName, ref] = write.locator.value;
    parseCellRef(ref);
    const key = `${sheetName}!${ref}`;
    if (seen.has(key)) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", `Duplicate write target ${key}.`, write.locator);
    seen.add(key);
    if (write.value !== void 0 && write.formula !== void 0) throw new XlsxWorkflowError("XLSX_WRITE_CONFLICT", "A write cannot contain both value and formula.", write.locator);
    const sheetPath = pathBySheet.get(sheetName);
    if (!sheetPath || !parts.has(sheetPath)) throw new XlsxWorkflowError("XLSX_MAPPING_UNRESOLVED", `Sheet ${sheetName} does not exist.`, write.locator);
    if (write.value !== void 0 || write.formula !== void 0) {
      const tree = parseXml(parts.get(sheetPath), sheetPath);
      const worksheet = tree?.worksheet ?? {};
      const cell = findOrCreateCell(worksheet, ref);
      if (write.formula) {
        clearCell(cell);
        cell.f = write.formula.expression.replace(/^=/, "");
        setCachedValue(cell, write.formula.cachedValue);
      } else if (write.value !== void 0) setWriteValue(cell, write.value);
      parts.set(sheetPath, Buffer.from(XML_DECLARATION + xmlBuilder.build({ worksheet }), "utf8"));
    }
    updateExistingComment(parts, sheetPath, write);
  }
  const buffer = await encodeParts(parts);
  return importXlsxWorkflow(buffer, { ...options, artifactId: document.artifactId });
}
async function exportXlsxWorkflow(document, options = {}) {
  checkAbort(options.signal);
  return encodeParts(new Map(document.parts.map((part) => [part.path, Buffer.from(part.bytes)])));
}
function cellKey(cell) {
  return `${cell.locator.value[0]}!${cell.locator.value[1]}`;
}
function structureSnapshot(inspection, allowed) {
  return {
    date1904: inspection.date1904,
    sheets: inspection.sheets.map((sheet) => ({
      name: sheet.name,
      state: sheet.state,
      hiddenRows: sheet.hiddenRows,
      hiddenColumns: sheet.hiddenColumns,
      mergedRanges: sheet.mergedRanges,
      validations: sheet.validations,
      comments: sheet.comments.filter((comment) => !allowed.has(`${sheet.name}!${comment.locator.value[1]}`))
    })),
    namedRanges: inspection.namedRanges,
    tables: inspection.tables,
    macroParts: inspection.macroParts,
    opaqueParts: inspection.opaqueParts,
    externalLinks: inspection.externalLinks
  };
}
function verifyXlsxWorkflow(before, after, options) {
  const allowed = new Set(options.allowedCells.map((entry) => `${entry.value[0]}!${entry.value[1]}`));
  const issues = [];
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
  for (const key of /* @__PURE__ */ new Set([...beforeCells.keys(), ...afterCells.keys()])) {
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
var XLSX_STRUCTURED_WORKFLOW_MANIFEST = {
  schemaVersion: 1,
  id: "runstamp.xlsx.structured-workflow",
  version: "1.0.0",
  catalogItemId: "A02",
  title: "XLSX structured workflow",
  operations: ["inspect", "import", "map", "read", "write", "export", "verify"].map((name) => ({ name, summary: `${name} an XLSX workbook without executing embedded content.`, inputKinds: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], outputKinds: ["application/json"] })),
  warningCodes: [
    { code: "XLSX_EXTERNAL_LINK_PRESERVED", description: "An external link was preserved without fetching it." },
    { code: "XLSX_FORMULA_NOT_RECALCULATED", description: "Formula caches are preserved, not recalculated." },
    { code: "XLSX_MACRO_PRESERVED_OPAQUE", description: "A macro payload was preserved without execution." },
    { code: "XLSX_UNSUPPORTED_FEATURE_PRESERVED", description: "An unsupported feature was preserved opaquely." }
  ],
  lossCodes: [
    { code: "XLSX_OPAQUE_PART_PRESERVED", description: "A safe unknown part was retained but is not editable in v1." }
  ]
};
function objectInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new XlsxWorkflowError("XLSX_ARCHIVE_UNSAFE", "Operation input must be an object.");
  return input;
}
function serializableInspection(inspection) {
  return JSON.parse(JSON.stringify(inspection));
}
function createXlsxStructuredWorkflowExtension() {
  return {
    manifest: XLSX_STRUCTURED_WORKFLOW_MANIFEST,
    async execute(request, context) {
      const input = objectInput(request.input);
      const decode = (field = "workbookBase64") => Buffer.from(String(input[field] ?? ""), "base64");
      const workflowOptions = {
        artifactId: typeof input.artifactId === "string" ? input.artifactId : void 0,
        signal: context.signal,
        maxInputBytes: context.budget.maxInputBytes,
        maxParts: context.budget.maxEntries,
        maxCells: context.budget.maxEntries,
        maxPartBytes: context.budget.maxInputBytes
      };
      context.reportProgress({ completed: 0, total: 1, message: request.operation });
      let output;
      let artifacts = [];
      let warnings = [];
      let losses = [];
      if (request.operation === "verify") {
        const before = await importXlsxWorkflow(decode("originalBase64"), workflowOptions);
        const after = await importXlsxWorkflow(decode("candidateBase64"), { ...workflowOptions, artifactId: before.artifactId });
        output = verifyXlsxWorkflow(before, after, { allowedCells: input.allowedCells ?? [] });
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
      return { status: "ok", output: cleanOutput, warnings, losses, artifacts };
    }
  };
}

export {
  XlsxWorkflowError,
  importXlsxWorkflow,
  inspectXlsxWorkflow,
  mapXlsxWorkflow,
  readXlsxWorkflow,
  writeXlsxWorkflow,
  exportXlsxWorkflow,
  verifyXlsxWorkflow,
  XLSX_STRUCTURED_WORKFLOW_MANIFEST,
  createXlsxStructuredWorkflowExtension
};
//# sourceMappingURL=chunk-2CSFJDLR.js.map
