import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { DETERMINISTIC_ZIP_DATE } from "../assembly/xlsx-assembler.js";
import { SpreadsheetEngine } from "../spreadsheet-engine.js";
import { XML_DECLARATION } from "../utils/xml.js";
import {
  createDuplicateTablesDocument,
  createRepairCorpusDocument,
} from "./workloads.js";

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

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function loadZip(buffer: Buffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

async function readXml(zip: JSZip, path: string): Promise<any> {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`Missing ZIP entry: ${path}`);
  }
  return xmlParser.parse(await file.async("string"));
}

function writeXml(zip: JSZip, path: string, tree: any): void {
  zip.file(path, XML_DECLARATION + xmlBuilder.build(tree), { date: DETERMINISTIC_ZIP_DATE });
}

async function generateZip(zip: JSZip): Promise<Buffer> {
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function removeContentTypeOverride(tree: any, partName: string): boolean {
  const overrides = asArray(tree?.Types?.Override);
  const kept = overrides.filter((entry) => String(entry["@_PartName"] ?? "") !== `/${partName}`);
  if (kept.length === overrides.length) {
    return false;
  }
  tree.Types.Override = kept;
  return true;
}

function firstSheetRelationshipPath(sheetNumber = 1): string {
  return `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`;
}

export async function createRepairableCorruptionBuffer(): Promise<Buffer> {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);

  const contentTypes = await readXml(zip, "[Content_Types].xml");
  removeContentTypeOverride(contentTypes, "xl/tables/table1.xml");
  writeXml(zip, "[Content_Types].xml", contentTypes);

  const workbook = await readXml(zip, "xl/workbook.xml");
  const definedNames = asArray(workbook?.workbook?.definedNames?.definedName);
  definedNames.push({
    "@_name": "BrokenLedgerRef",
    "#text": "Ghost!$A$1",
  });
  workbook.workbook.definedNames = { definedName: definedNames };
  writeXml(zip, "xl/workbook.xml", workbook);

  const sheet = await readXml(zip, "xl/worksheets/sheet1.xml");
  const rows = asArray(sheet?.worksheet?.sheetData?.row);
  const firstDataRow = rows.find((row) => Number(row["@_r"]) === 3) ?? rows[0];
  const firstCell = asArray(firstDataRow?.c)[0];
  if (firstCell) {
    firstCell["@_s"] = "9999";
  }
  sheet.worksheet.hyperlinks = {
    hyperlink: [
      {
        "@_ref": "XFE1",
        "@_r:id": "rId2",
      },
    ],
  };
  sheet.worksheet.dataValidations = {
    "@_count": "1",
    dataValidation: [
      {
        "@_type": "list",
        "@_sqref": "A1048577",
        formula1: "\"Open,Closed,Pending\"",
      },
    ],
  };
  sheet.worksheet.mergeCells = {
    "@_count": "3",
    mergeCell: [
      { "@_ref": "A1:D1" },
      { "@_ref": "B1:E1" },
      { "@_ref": "XFE0:XFE1" },
    ],
  };
  sheet.worksheet.dimension = { "@_ref": "A1:A1" };
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);

  const sheetRels = await readXml(zip, firstSheetRelationshipPath(1));
  const relationships = asArray(sheetRels?.Relationships?.Relationship);
  const tableRelationship = relationships.find((relationship) => (
    String(relationship["@_Type"] ?? "").includes("/table")
  ));
  if (tableRelationship) {
    tableRelationship["@_Target"] = "../tables/missing-table.xml";
  }
  writeXml(zip, firstSheetRelationshipPath(1), sheetRels);

  const table = await readXml(zip, "xl/tables/table1.xml");
  if (table?.table) {
    table.table["@_ref"] = "A2:XFE1048578";
    if (table.table.autoFilter) {
      table.table.autoFilter["@_ref"] = "A2:XFE1048578";
    }
  }
  writeXml(zip, "xl/tables/table1.xml", table);

  return generateZip(zip);
}

export async function createDuplicateTableCorruptionBuffer(): Promise<Buffer> {
  const base = await SpreadsheetEngine.render(createDuplicateTablesDocument());
  const zip = await loadZip(base);

  const secondTable = await readXml(zip, "xl/tables/table2.xml");
  if (secondTable?.table) {
    secondTable.table["@_name"] = "NorthTable";
    secondTable.table["@_displayName"] = "NorthTable";
    secondTable.table["@_ref"] = "A1:XFE1048578";
    if (secondTable.table.autoFilter) {
      secondTable.table.autoFilter["@_ref"] = "A1:XFE1048578";
    }
  }
  writeXml(zip, "xl/tables/table2.xml", secondTable);

  return generateZip(zip);
}

export async function createMissingContentTypeBuffer(): Promise<Buffer> {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const contentTypes = await readXml(zip, "[Content_Types].xml");
  removeContentTypeOverride(contentTypes, "xl/tables/table1.xml");
  writeXml(zip, "[Content_Types].xml", contentTypes);
  return generateZip(zip);
}

export async function createOrphanRelationshipBuffer(): Promise<Buffer> {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const sheetRels = await readXml(zip, firstSheetRelationshipPath(1));
  const relationships = asArray(sheetRels?.Relationships?.Relationship);
  const tableRelationship = relationships.find((relationship) => (
    String(relationship["@_Type"] ?? "").includes("/table")
  ));
  if (tableRelationship) {
    tableRelationship["@_Target"] = "../tables/missing-table.xml";
  }
  writeXml(zip, firstSheetRelationshipPath(1), sheetRels);
  return generateZip(zip);
}

export async function createStyleIndexOobBuffer(): Promise<Buffer> {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const sheet = await readXml(zip, "xl/worksheets/sheet1.xml");
  const rows = asArray(sheet?.worksheet?.sheetData?.row);
  const firstDataRow = rows.find((row) => Number(row["@_r"]) === 3) ?? rows[0];
  const firstCell = asArray(firstDataRow?.c)[0];
  if (firstCell) {
    firstCell["@_s"] = "9999";
  }
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);
  return generateZip(zip);
}

export async function createHyperlinkValidationCorruptionBuffer(): Promise<Buffer> {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const sheet = await readXml(zip, "xl/worksheets/sheet1.xml");
  sheet.worksheet.hyperlinks = {
    hyperlink: [
      {
        "@_ref": "XFE1",
        "@_r:id": "rId2",
      },
    ],
  };
  sheet.worksheet.dataValidations = {
    "@_count": "1",
    dataValidation: [
      {
        "@_type": "list",
        "@_sqref": "A1048577",
        formula1: "\"Open,Closed,Pending\"",
      },
    ],
  };
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);
  return generateZip(zip);
}

export async function createMergeDefinedNameCorruptionBuffer(): Promise<Buffer> {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);

  const workbook = await readXml(zip, "xl/workbook.xml");
  const definedNames = asArray(workbook?.workbook?.definedNames?.definedName);
  definedNames.push({
    "@_name": "BrokenLedgerRef",
    "#text": "Ghost!$A$1",
  });
  workbook.workbook.definedNames = { definedName: definedNames };
  writeXml(zip, "xl/workbook.xml", workbook);

  const sheet = await readXml(zip, "xl/worksheets/sheet1.xml");
  sheet.worksheet.mergeCells = {
    "@_count": "3",
    mergeCell: [
      { "@_ref": "A1:D1" },
      { "@_ref": "B1:E1" },
      { "@_ref": "XFE0:XFE1" },
    ],
  };
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);

  return generateZip(zip);
}

export async function createSharedStringIndexCorruptionBuffer(baseBuffer: Buffer): Promise<Buffer> {
  const zip = await loadZip(baseBuffer);
  const sheet = await readXml(zip, "xl/worksheets/sheet1.xml");
  const rows = asArray(sheet?.worksheet?.sheetData?.row);
  const firstCell = asArray(rows[0]?.c)[0];
  if (firstCell) {
    firstCell["@_t"] = "s";
    firstCell.v = "999999";
    delete firstCell.is;
  }
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);
  return generateZip(zip);
}
