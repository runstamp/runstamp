import type { SpreadsheetDocument, SpreadsheetPrintRange, SpreadsheetPrintTitles } from "../types/spreadsheet-ast.js";
import { absRangeRef, colIndexToLetter, parseRangeRef } from "../utils/cell-ref.js";
import { XML_DECLARATION, escapeXml } from "../utils/xml.js";
import { quoteSheetName } from "../worksheet/structure.js";
import type { WorkbookPivotCacheBinding } from "./pivot-serializer.js";
import { SpreadsheetValidationError, type SpreadsheetValidationIssue } from "../errors.js";

export interface WorkbookSheetFeatures {
  autoFilterRef?: string;
  printArea?: string;
  printTitles?: SpreadsheetPrintTitles;
}

function absolutizeWorksheetRef(ref: string): string {
  const [sheetName, range] = ref.split("!");
  if (!range) {
    const parsed = parseRangeRef(ref);
    return absRangeRef(parsed.startRow, parsed.startCol, parsed.endRow, parsed.endCol);
  }

  const parsed = parseRangeRef(range);
  return `${sheetName}!${absRangeRef(parsed.startRow, parsed.startCol, parsed.endRow, parsed.endCol)}`;
}

function parseDefinedNameSheetName(ref: string): string | undefined {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return undefined;
  }
  return (match[1] ?? match[2] ?? "").replaceAll("''", "'");
}

function assertNamedRangesResolve(document: SpreadsheetDocument): void {
  if (!document.namedRanges || document.namedRanges.length === 0) {
    return;
  }

  const sheetNames = new Set(document.sheets.map((sheet) => sheet.name));
  const issues: SpreadsheetValidationIssue[] = [];

  document.namedRanges.forEach((namedRange, index) => {
    if (namedRange.scope && !sheetNames.has(namedRange.scope)) {
      issues.push({
        path: `namedRanges[${index}].scope`,
        code: "NAMED_RANGE_INVALID",
        message: `Named range scope ${namedRange.scope} does not match a sheet name`,
      });
    }

    const sheetName = parseDefinedNameSheetName(namedRange.ref);
    if (sheetName && !sheetNames.has(sheetName)) {
      issues.push({
        path: `namedRanges[${index}].ref`,
        code: "NAMED_RANGE_INVALID",
        message: `Named range ${namedRange.name} references missing sheet ${sheetName}`,
      });
    }
  });

  if (issues.length > 0) {
    throw new SpreadsheetValidationError(issues);
  }
}

function formatPrintRowRange(range: SpreadsheetPrintRange): string {
  return `$${range.start + 1}:$${range.end + 1}`;
}

function formatPrintColumnRange(range: SpreadsheetPrintRange): string {
  return `$${colIndexToLetter(range.start)}:$${colIndexToLetter(range.end)}`;
}

function formatPrintTitles(sheetName: string, titles: SpreadsheetPrintTitles): string {
  const parts: string[] = [];
  if (titles.rows) {
    parts.push(`${quoteSheetName(sheetName)}!${formatPrintRowRange(titles.rows)}`);
  }
  if (titles.columns) {
    parts.push(`${quoteSheetName(sheetName)}!${formatPrintColumnRange(titles.columns)}`);
  }
  return parts.join(",");
}

export function serializeWorkbook(
  document: SpreadsheetDocument,
  options?: { sheetFeatures?: WorkbookSheetFeatures[]; pivotCaches?: WorkbookPivotCacheBinding[] },
): string {
  assertNamedRangesResolve(document);
  const parts: string[] = [
    XML_DECLARATION,
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
    `<fileVersion appName="Runstamp"/>`,
    document.date1904 ? `<workbookPr date1904="1"/>` : "",
    `<sheets>`,
  ];

  document.sheets.forEach((sheet, index) => {
    const attributes = [
      `name="${escapeXml(sheet.name)}"`,
      `sheetId="${index + 1}"`,
      `r:id="rId${index + 1}"`,
    ];
    if (sheet.state && sheet.state !== "visible") {
      attributes.push(`state="${sheet.state}"`);
    }
    parts.push(`<sheet ${attributes.join(" ")}/>`);
  });

  parts.push(`</sheets>`);

  const definedNames: string[] = [];
  options?.sheetFeatures?.forEach((sheetFeature, index) => {
    const sheet = document.sheets[index];
    if (!sheet) {
      return;
    }

    if (sheetFeature.autoFilterRef) {
      definedNames.push(
        `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">${escapeXml(`${quoteSheetName(sheet.name)}!${absolutizeWorksheetRef(sheetFeature.autoFilterRef)}`)}</definedName>`,
      );
    }

    if (sheetFeature.printArea) {
      definedNames.push(
        `<definedName name="_xlnm.Print_Area" localSheetId="${index}">${escapeXml(`${quoteSheetName(sheet.name)}!${absolutizeWorksheetRef(sheetFeature.printArea)}`)}</definedName>`,
      );
    }

    if (sheetFeature.printTitles) {
      definedNames.push(
        `<definedName name="_xlnm.Print_Titles" localSheetId="${index}">${escapeXml(formatPrintTitles(sheet.name, sheetFeature.printTitles))}</definedName>`,
      );
    }
  });

  document.namedRanges?.forEach((namedRange) => {
    const attributes = [`name="${escapeXml(namedRange.name)}"`];
    if (namedRange.scope) {
      const sheetIndex = document.sheets.findIndex((sheet) => sheet.name === namedRange.scope);
      if (sheetIndex >= 0) {
        attributes.push(`localSheetId="${sheetIndex}"`);
      }
    }
    definedNames.push(
      `<definedName ${attributes.join(" ")}>${escapeXml(absolutizeWorksheetRef(namedRange.ref))}</definedName>`,
    );
  });

  if (definedNames.length > 0) {
    parts.push(`<definedNames>${definedNames.join("")}</definedNames>`);
  }

  if ((options?.pivotCaches?.length ?? 0) > 0) {
    parts.push(
      `<pivotCaches>${options!.pivotCaches!.map((pivotCache) => `<pivotCache cacheId="${pivotCache.cacheId}" r:id="${pivotCache.relationshipId}"/>`).join("")}</pivotCaches>`,
    );
  }

  parts.push(`</workbook>`);
  return parts.join("");
}

export function serializeWorkbookRels(
  sheetCount: number,
  options?: { includeSharedStrings?: boolean; pivotCaches?: WorkbookPivotCacheBinding[] },
): string {
  const parts: string[] = [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
  ];

  for (let index = 0; index < sheetCount; index += 1) {
    parts.push(
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    );
  }

  parts.push(
    `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
  );
  let nextRelationshipId = sheetCount + 2;
  if (options?.includeSharedStrings !== false) {
    parts.push(
      `<Relationship Id="rId${nextRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`,
    );
    nextRelationshipId += 1;
  }
  parts.push(
    `<Relationship Id="rId${nextRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>`,
  );
  for (const pivotCache of options?.pivotCaches ?? []) {
    parts.push(
      `<Relationship Id="${pivotCache.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="pivotCache/${escapeXml(pivotCache.partName)}"/>`,
    );
  }
  parts.push(`</Relationships>`);

  return parts.join("");
}
