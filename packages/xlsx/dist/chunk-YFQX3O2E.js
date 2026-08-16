import {
  SpreadsheetEngine
} from "./chunk-GCRW3VCZ.js";
import {
  DETERMINISTIC_ZIP_DATE,
  XML_DECLARATION
} from "./chunk-YMTIFCEA.js";

// src/diagnostics/workloads.ts
function createRepairCorpusDocument() {
  return {
    namedRanges: [
      { name: "LedgerWindow", ref: "Ledger!$A$2:$D$5" }
    ],
    sheets: [
      {
        name: "Ledger",
        dataValidations: [
          {
            ref: "C3:C20",
            type: "list",
            formula1: '"Open,Closed,Pending"',
            allowBlank: true
          }
        ],
        rows: [
          {
            cells: [
              {
                value: "Ledger Overview",
                colSpan: 4,
                style: {
                  fill: { color: "#D9E2F3" },
                  alignment: { horizontal: "center", vertical: "center" },
                  border: {
                    top: { style: "thin", color: "#5B9BD5" },
                    bottom: { style: "thin", color: "#5B9BD5" },
                    left: { style: "thin", color: "#5B9BD5" },
                    right: { style: "thin", color: "#5B9BD5" }
                  }
                }
              }
            ]
          },
          {
            cells: [
              { value: "Account", style: "header" },
              { value: "Amount", style: "header" },
              { value: "Status", style: "header" },
              { value: "Docs", style: "header" }
            ]
          },
          {
            cells: [
              { value: "Northwind" },
              { value: 12e4, style: "currency" },
              { value: "Open" },
              {
                value: "Policy",
                hyperlink: {
                  target: "https://example.com/policy",
                  tooltip: "Open the policy document"
                }
              }
            ]
          },
          {
            cells: [
              { value: "Contoso" },
              { value: 85500, style: "currency" },
              { value: "Closed" },
              {
                value: "Guide",
                hyperlink: {
                  location: "Lookups!A1",
                  display: "Jump to lookup sheet"
                }
              }
            ]
          },
          {
            cells: [
              { value: "Fabrikam" },
              { value: 61250, style: "currency" },
              { value: "Pending" },
              { value: "Escalated" }
            ]
          }
        ],
        tables: [
          {
            name: "LedgerTable",
            ref: "A2:D5",
            columns: [{}, {}, {}, {}],
            style: {
              name: "TableStyleMedium2"
            }
          }
        ]
      },
      {
        name: "Lookups",
        rows: [
          { cells: [{ value: "Open" }] },
          { cells: [{ value: "Closed" }] },
          { cells: [{ value: "Pending" }] }
        ]
      }
    ]
  };
}
function createDuplicateTablesDocument() {
  return {
    sheets: [
      {
        name: "North",
        rows: [
          {
            cells: [
              { value: "Region" },
              { value: "Revenue" }
            ]
          },
          {
            cells: [
              { value: "NA" },
              { value: 120 }
            ]
          },
          {
            cells: [
              { value: "EMEA" },
              { value: 180 }
            ]
          }
        ],
        tables: [
          {
            name: "NorthTable",
            ref: "A1:B3",
            columns: [{}, {}]
          }
        ]
      },
      {
        name: "South",
        rows: [
          {
            cells: [
              { value: "Region" },
              { value: "Revenue" }
            ]
          },
          {
            cells: [
              { value: "APAC" },
              { value: 90 }
            ]
          },
          {
            cells: [
              { value: "LATAM" },
              { value: 75 }
            ]
          }
        ],
        tables: [
          {
            name: "SouthTable",
            ref: "A1:B3",
            columns: [{}, {}]
          }
        ]
      }
    ]
  };
}
function createTemplateBenchmarkDocument() {
  return {
    namedRanges: [
      { name: "InvoiceHeader", ref: "Invoice!$B$1" },
      { name: "LineItems", ref: "Invoice!$A$4:$D$4" }
    ],
    sheets: [
      {
        name: "Invoice",
        rows: [
          {
            cells: [
              { value: "Customer" },
              { value: "Acme Co" }
            ]
          },
          {
            cells: [
              { value: "Prepared" },
              { value: new Date(Date.UTC(2026, 2, 28)) }
            ]
          },
          {
            cells: [
              { value: "Item", style: "header" },
              { value: "Qty", style: "header" },
              { value: "Price", style: "header" },
              { value: "Total", style: "header" }
            ]
          },
          {
            cells: [
              { value: "Starter" },
              { value: 1 },
              { value: 10 },
              { formula: "B4*C4", style: "currency" }
            ]
          },
          {
            cells: [
              { value: "Grand Total" },
              { value: null },
              { value: null },
              { formula: "SUM(D4:D4)", style: "currency" }
            ]
          }
        ],
        tables: [
          {
            name: "InvoiceTable",
            ref: "A3:D4",
            columns: [{}, {}, {}, {}],
            style: {
              name: "TableStyleMedium9"
            }
          }
        ]
      }
    ]
  };
}

// src/diagnostics/corruption.ts
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
function asArray(value) {
  if (value === void 0) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
async function loadZip(buffer) {
  return JSZip.loadAsync(buffer);
}
async function readXml(zip, path) {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`Missing ZIP entry: ${path}`);
  }
  return xmlParser.parse(await file.async("string"));
}
function writeXml(zip, path, tree) {
  zip.file(path, XML_DECLARATION + xmlBuilder.build(tree), { date: DETERMINISTIC_ZIP_DATE });
}
async function generateZip(zip) {
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
function removeContentTypeOverride(tree, partName) {
  const overrides = asArray(tree?.Types?.Override);
  const kept = overrides.filter((entry) => String(entry["@_PartName"] ?? "") !== `/${partName}`);
  if (kept.length === overrides.length) {
    return false;
  }
  tree.Types.Override = kept;
  return true;
}
function firstSheetRelationshipPath(sheetNumber = 1) {
  return `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`;
}
async function createRepairableCorruptionBuffer() {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const contentTypes = await readXml(zip, "[Content_Types].xml");
  removeContentTypeOverride(contentTypes, "xl/tables/table1.xml");
  writeXml(zip, "[Content_Types].xml", contentTypes);
  const workbook = await readXml(zip, "xl/workbook.xml");
  const definedNames = asArray(workbook?.workbook?.definedNames?.definedName);
  definedNames.push({
    "@_name": "BrokenLedgerRef",
    "#text": "Ghost!$A$1"
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
        "@_r:id": "rId2"
      }
    ]
  };
  sheet.worksheet.dataValidations = {
    "@_count": "1",
    dataValidation: [
      {
        "@_type": "list",
        "@_sqref": "A1048577",
        formula1: '"Open,Closed,Pending"'
      }
    ]
  };
  sheet.worksheet.mergeCells = {
    "@_count": "3",
    mergeCell: [
      { "@_ref": "A1:D1" },
      { "@_ref": "B1:E1" },
      { "@_ref": "XFE0:XFE1" }
    ]
  };
  sheet.worksheet.dimension = { "@_ref": "A1:A1" };
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);
  const sheetRels = await readXml(zip, firstSheetRelationshipPath(1));
  const relationships = asArray(sheetRels?.Relationships?.Relationship);
  const tableRelationship = relationships.find((relationship) => String(relationship["@_Type"] ?? "").includes("/table"));
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
async function createDuplicateTableCorruptionBuffer() {
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
async function createMissingContentTypeBuffer() {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const contentTypes = await readXml(zip, "[Content_Types].xml");
  removeContentTypeOverride(contentTypes, "xl/tables/table1.xml");
  writeXml(zip, "[Content_Types].xml", contentTypes);
  return generateZip(zip);
}
async function createOrphanRelationshipBuffer() {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const sheetRels = await readXml(zip, firstSheetRelationshipPath(1));
  const relationships = asArray(sheetRels?.Relationships?.Relationship);
  const tableRelationship = relationships.find((relationship) => String(relationship["@_Type"] ?? "").includes("/table"));
  if (tableRelationship) {
    tableRelationship["@_Target"] = "../tables/missing-table.xml";
  }
  writeXml(zip, firstSheetRelationshipPath(1), sheetRels);
  return generateZip(zip);
}
async function createStyleIndexOobBuffer() {
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
async function createHyperlinkValidationCorruptionBuffer() {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const sheet = await readXml(zip, "xl/worksheets/sheet1.xml");
  sheet.worksheet.hyperlinks = {
    hyperlink: [
      {
        "@_ref": "XFE1",
        "@_r:id": "rId2"
      }
    ]
  };
  sheet.worksheet.dataValidations = {
    "@_count": "1",
    dataValidation: [
      {
        "@_type": "list",
        "@_sqref": "A1048577",
        formula1: '"Open,Closed,Pending"'
      }
    ]
  };
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);
  return generateZip(zip);
}
async function createMergeDefinedNameCorruptionBuffer() {
  const base = await SpreadsheetEngine.render(createRepairCorpusDocument());
  const zip = await loadZip(base);
  const workbook = await readXml(zip, "xl/workbook.xml");
  const definedNames = asArray(workbook?.workbook?.definedNames?.definedName);
  definedNames.push({
    "@_name": "BrokenLedgerRef",
    "#text": "Ghost!$A$1"
  });
  workbook.workbook.definedNames = { definedName: definedNames };
  writeXml(zip, "xl/workbook.xml", workbook);
  const sheet = await readXml(zip, "xl/worksheets/sheet1.xml");
  sheet.worksheet.mergeCells = {
    "@_count": "3",
    mergeCell: [
      { "@_ref": "A1:D1" },
      { "@_ref": "B1:E1" },
      { "@_ref": "XFE0:XFE1" }
    ]
  };
  writeXml(zip, "xl/worksheets/sheet1.xml", sheet);
  return generateZip(zip);
}
async function createSharedStringIndexCorruptionBuffer(baseBuffer) {
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

export {
  createTemplateBenchmarkDocument,
  createRepairableCorruptionBuffer,
  createDuplicateTableCorruptionBuffer,
  createMissingContentTypeBuffer,
  createOrphanRelationshipBuffer,
  createStyleIndexOobBuffer,
  createHyperlinkValidationCorruptionBuffer,
  createMergeDefinedNameCorruptionBuffer,
  createSharedStringIndexCorruptionBuffer
};
//# sourceMappingURL=chunk-YFQX3O2E.js.map
