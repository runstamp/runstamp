import {
  cellRef,
  parseCellRef
} from "./chunk-YMTIFCEA.js";

// src/quality/structural-validation.ts
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
var xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false
});
function asArray(value) {
  if (value === void 0) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function resolveWorksheetRowNumber(row, rowIndex) {
  const explicit = Number(row?.["@_r"] ?? "");
  return Number.isFinite(explicit) && explicit > 0 ? explicit : rowIndex + 1;
}
function resolveWorksheetCellRef(cell, rowNumber, cellIndex) {
  const explicit = String(cell?.["@_r"] ?? "");
  if (explicit) {
    return explicit;
  }
  return rowNumber > 0 ? cellRef(rowNumber - 1, cellIndex) : "";
}
function addCheck(checks, name, passed, details) {
  checks.push({ name, passed, details });
}
function getRelationshipSourceBaseSegments(relPath) {
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
function resolveRelationshipTarget(relPath, target) {
  const baseSegments = getRelationshipSourceBaseSegments(relPath);
  for (const segment of target.split("/")) {
    if (segment === "." || segment === "") {
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
async function validateXlsxStructure(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir).sort();
  const checks = [];
  const contentTypesXml = await zip.file("[Content_Types].xml")?.async("string");
  if (!contentTypesXml) {
    return {
      passed: false,
      checks: [{ name: "content-types-present", passed: false, details: "Missing [Content_Types].xml" }]
    };
  }
  const contentTypes = xmlParser.parse(contentTypesXml);
  const overrides = asArray(contentTypes?.Types?.Override);
  const overridePaths = new Set(overrides.map((override) => String(override["@_PartName"]).replace(/^\//, "")));
  const nonDefaultXmlParts = paths.filter((path) => path.endsWith(".xml") && path !== "[Content_Types].xml" && path !== "_rels/.rels" && !path.endsWith(".xml.rels"));
  const missingOverrides = nonDefaultXmlParts.filter((path) => !overridePaths.has(path));
  const extraOverrides = [...overridePaths].filter((path) => !nonDefaultXmlParts.includes(path));
  addCheck(
    checks,
    "content-types-match-zip",
    missingOverrides.length === 0 && extraOverrides.length === 0,
    missingOverrides.length === 0 && extraOverrides.length === 0 ? "All XML parts and overrides match" : `Missing overrides: ${missingOverrides.join(", ") || "none"}; extra overrides: ${extraOverrides.join(", ") || "none"}`
  );
  const relationshipPaths = paths.filter((path) => path.endsWith(".rels"));
  for (const relPath of relationshipPaths) {
    const relXml = await zip.file(relPath)?.async("string");
    const rels = xmlParser.parse(relXml ?? "");
    const relationships = asArray(rels?.Relationships?.Relationship);
    const ids = relationships.map((relationship) => String(relationship["@_Id"]));
    const uniqueIds = new Set(ids);
    addCheck(
      checks,
      `unique-rids:${relPath}`,
      ids.length === uniqueIds.size,
      ids.length === uniqueIds.size ? "All relationship ids are unique" : `Duplicate relationship ids in ${relPath}`
    );
    const unresolved = relationships.map((relationship) => String(relationship["@_Target"])).filter((target) => !target.startsWith("http")).map((target) => resolveRelationshipTarget(relPath, target)).filter((targetPath) => !paths.includes(targetPath));
    addCheck(
      checks,
      `relationship-targets:${relPath}`,
      unresolved.length === 0,
      unresolved.length === 0 ? "All relationship targets resolve" : `Unresolved relationship targets: ${unresolved.join(", ")}`
    );
  }
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  if (sharedStringsXml) {
    const sharedStrings = xmlParser.parse(sharedStringsXml);
    const root = sharedStrings?.sst;
    const items = asArray(root?.si);
    const declaredCount = Number(root?.["@_count"] ?? 0);
    const declaredUniqueCount = Number(root?.["@_uniqueCount"] ?? 0);
    let references = 0;
    const sheetPaths2 = paths.filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
    for (const sheetPath of sheetPaths2) {
      const sheetXml = await zip.file(sheetPath)?.async("string");
      const matches = sheetXml?.match(/<c[^>]* t="s"[^>]*><v>(\d+)<\/v><\/c>/g) ?? [];
      references += matches.length;
    }
    addCheck(
      checks,
      "shared-strings-count",
      declaredCount === references,
      declaredCount === references ? `Declared count matches ${references} references` : `Declared count ${declaredCount} does not match ${references} references`
    );
    addCheck(
      checks,
      "shared-strings-unique-count",
      declaredUniqueCount === items.length,
      declaredUniqueCount === items.length ? `Declared unique count matches ${items.length} entries` : `Declared unique count ${declaredUniqueCount} does not match ${items.length} entries`
    );
  }
  const stylesXml = await zip.file("xl/styles.xml")?.async("string");
  const styles = stylesXml ? xmlParser.parse(stylesXml) : null;
  const cellXfs = asArray(styles?.styleSheet?.cellXfs?.xf);
  const maxStyleIndex = Math.max(0, cellXfs.length - 1);
  const WORKSHEET_ELEMENT_ORDER = [
    "sheetPr",
    "dimension",
    "sheetViews",
    "sheetFormatPr",
    "cols",
    "sheetData",
    "sheetCalcPr",
    "sheetProtection",
    "protectedRanges",
    "scenarios",
    "autoFilter",
    "sortState",
    "dataConsolidate",
    "customSheetViews",
    "mergeCells",
    "phoneticPr",
    "conditionalFormatting",
    "dataValidations",
    "hyperlinks",
    "printOptions",
    "pageMargins",
    "pageSetup",
    "headerFooter",
    "rowBreaks",
    "colBreaks",
    "customProperties",
    "cellWatches",
    "ignoredErrors",
    "smartTags",
    "drawing",
    "legacyDrawing",
    "legacyDrawingHF",
    "drawingHF",
    "picture",
    "oleObjects",
    "controls",
    "webPublishItems",
    "tableParts",
    "extLst"
  ];
  const elementOrderIndex = new Map(WORKSHEET_ELEMENT_ORDER.map((name, i) => [name, i]));
  const sheetPaths = paths.filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
  for (const sheetPath of sheetPaths) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    const worksheet = xmlParser.parse(sheetXml ?? "")?.worksheet;
    if (worksheet && sheetXml) {
      const topLevelElements = [];
      const tagPattern = /<(\w+)[\s>/]/g;
      const worksheetStart = sheetXml.indexOf("<worksheet");
      const innerXml = sheetXml.slice(worksheetStart);
      const bodyStart = innerXml.indexOf(">") + 1;
      const bodyEnd = innerXml.lastIndexOf("</worksheet>");
      const body = innerXml.slice(bodyStart, bodyEnd);
      let depth = 0;
      const topTagPattern = /<\/?(\w+)[^>]*\/?>/g;
      let match;
      while ((match = topTagPattern.exec(body)) !== null) {
        const fullMatch = match[0];
        const tagName = match[1];
        if (fullMatch.startsWith("</")) {
          depth--;
        } else if (fullMatch.endsWith("/>")) {
          if (depth === 0) topLevelElements.push(tagName);
        } else {
          if (depth === 0) topLevelElements.push(tagName);
          depth++;
        }
      }
      const uniqueOrdered = [];
      for (const el of topLevelElements) {
        if (uniqueOrdered.length === 0 || uniqueOrdered[uniqueOrdered.length - 1] !== el) {
          uniqueOrdered.push(el);
        }
      }
      const knownElements = uniqueOrdered.filter((el) => elementOrderIndex.has(el));
      let orderValid = true;
      let orderViolation = "";
      for (let i = 1; i < knownElements.length; i++) {
        const prevIdx = elementOrderIndex.get(knownElements[i - 1]);
        const currIdx = elementOrderIndex.get(knownElements[i]);
        if (currIdx < prevIdx) {
          orderValid = false;
          orderViolation = `${knownElements[i]} (spec position ${currIdx}) appears after ${knownElements[i - 1]} (spec position ${prevIdx})`;
          break;
        }
      }
      addCheck(
        checks,
        `element-order:${sheetPath}`,
        orderValid,
        orderValid ? "Worksheet elements follow OOXML spec order" : `Element order violation in ${sheetPath}: ${orderViolation}`
      );
    }
    const rows = asArray(worksheet?.sheetData?.row);
    const rowNumbers = rows.map((row, index) => resolveWorksheetRowNumber(row, index));
    const rowsAscending = rowNumbers.every((rowNumber, index) => index === 0 || rowNumbers[index - 1] < rowNumber);
    addCheck(
      checks,
      `rows-ascending:${sheetPath}`,
      rowsAscending,
      rowsAscending ? "Rows are strictly ascending" : `Row order violation in ${sheetPath}`
    );
    let cellOrderValid = true;
    let styleIndicesValid = true;
    let sharedStringIndicesValid = true;
    rows.forEach((row, rowIndex) => {
      const cells = asArray(row.c);
      const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
      const refs = cells.map((cell, cellIndex) => parseCellRef(resolveWorksheetCellRef(cell, rowNumber, cellIndex)));
      cellOrderValid = cellOrderValid && refs.every((ref, index) => index === 0 || refs[index - 1].col < ref.col);
      for (const cell of cells) {
        const styleIndex = cell["@_s"];
        if (styleIndex !== void 0 && Number(styleIndex) > maxStyleIndex) {
          styleIndicesValid = false;
        }
        if (cell["@_t"] === "s") {
          const sharedIndex = Number(cell.v);
          const sharedStrings = sharedStringsXml ? xmlParser.parse(sharedStringsXml)?.sst : null;
          const uniqueCount = Number(sharedStrings?.["@_uniqueCount"] ?? 0);
          if (!(sharedIndex >= 0 && sharedIndex < uniqueCount)) {
            sharedStringIndicesValid = false;
          }
        }
      }
    });
    addCheck(
      checks,
      `cells-ascending:${sheetPath}`,
      cellOrderValid,
      cellOrderValid ? "Cells are strictly ascending within each row" : `Cell order violation in ${sheetPath}`
    );
    addCheck(
      checks,
      `style-indices:${sheetPath}`,
      styleIndicesValid,
      styleIndicesValid ? `Style indices are within 0..${maxStyleIndex}` : `Style index out of range in ${sheetPath}`
    );
    addCheck(
      checks,
      `shared-string-indices:${sheetPath}`,
      sharedStringIndicesValid,
      sharedStringIndicesValid ? "Shared string references are in range" : `Shared string reference out of range in ${sheetPath}`
    );
  }
  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export {
  validateXlsxStructure
};
//# sourceMappingURL=chunk-J44ZSVSV.js.map
