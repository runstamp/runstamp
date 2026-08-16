import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { SpreadsheetEngine } from "../src/index.js";
import { getPhase1Fixture } from "../src/fixtures/phase1.js";
import { readZipEntry } from "./helpers.js";

describe("Workbook quality APIs", () => {
  it("validates clean generated workbooks as clean", async () => {
    const fixture = getPhase1Fixture("single-cell");
    const buffer = await SpreadsheetEngine.render(fixture.document);
    const summary = await SpreadsheetEngine.validate(buffer);

    expect(summary.verdict).toBe("clean");
    expect(summary.findings).toEqual([]);
  });

  it("validates clean generated workbooks with inferred cell refs as clean", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Wide",
          rows: Array.from({ length: 4 }, (_unused, rowIndex) => ({
            cells: Array.from({ length: 20 }, (_cellUnused, columnIndex) => ({
              value: columnIndex % 2 === 0 ? `R${rowIndex + 1}C${columnIndex + 1}` : rowIndex * 100 + columnIndex,
              style: {
                font: { bold: columnIndex % 3 === 0 },
                fill: { color: columnIndex % 4 === 0 ? "#E5E7EB" : "#BFDBFE" },
              },
            })),
          })),
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const summary = await SpreadsheetEngine.validate(buffer);

    expect(sheetXml).toContain("<row r=\"1\">");
    expect(sheetXml).toContain("<c t=\"s\"");
    expect(sheetXml).not.toContain("<c r=\"A1\"");
    expect(summary.verdict).toBe("clean");
    expect(summary.findings).toEqual([]);
  });

  it("validates clean generated workbooks with inferred row and cell refs as clean", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "LargeWide",
          rows: Array.from({ length: 600 }, (_unused, rowIndex) => ({
            cells: Array.from({ length: 20 }, (_cellUnused, columnIndex) => ({
              value: columnIndex % 2 === 0 ? `R${rowIndex + 1}C${columnIndex + 1}` : rowIndex * 100 + columnIndex,
              style: {
                font: { bold: columnIndex % 3 === 0 },
                fill: { color: columnIndex % 4 === 0 ? "#E5E7EB" : "#BFDBFE" },
              },
            })),
          })),
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const summary = await SpreadsheetEngine.validate(buffer);

    expect(sheetXml).not.toContain("<row r=\"1\">");
    expect(sheetXml).toContain("<row>");
    expect(sheetXml).not.toContain("<c r=\"A1\"");
    expect(summary.verdict).toBe("clean");
    expect(summary.findings).toEqual([]);
  });

  it("detects repairable package and style damage", async () => {
    const fixture = getPhase1Fixture("single-cell");
    const validBuffer = await SpreadsheetEngine.render(fixture.document);
    const zip = await JSZip.loadAsync(validBuffer);
    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
    const workbookRels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");

    expect(contentTypes).toBeDefined();
    expect(workbookRels).toBeDefined();
    expect(sheetXml).toBeDefined();

    zip.file(
      "[Content_Types].xml",
      String(contentTypes).replace('<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>', ""),
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      String(workbookRels).replace("</Relationships>", '<Relationship Id="rId999" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="missing.xml"/></Relationships>'),
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      String(sheetXml).replace('<c r="A1" t="s">', '<c r="A1" s="99" t="s">'),
    );

    const brokenBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const summary = await SpreadsheetEngine.validate(brokenBuffer);
    const codes = summary.findings.map((finding) => finding.code);

    expect(summary.verdict).toBe("errors");
    expect(codes).toEqual(expect.arrayContaining([
      "MISSING_CONTENT_TYPE",
      "ORPHAN_RELATIONSHIP",
      "STYLE_INDEX_OOB",
    ]));
  });

  it("repairs repairable damage and returns a cleaner revalidated workbook", async () => {
    const fixture = getPhase1Fixture("single-cell");
    const validBuffer = await SpreadsheetEngine.render(fixture.document);
    const zip = await JSZip.loadAsync(validBuffer);
    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
    const workbookRels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");

    zip.file(
      "[Content_Types].xml",
      String(contentTypes).replace('<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>', ""),
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      String(workbookRels).replace("</Relationships>", '<Relationship Id="rId999" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="missing.xml"/></Relationships>'),
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      String(sheetXml).replace('<c r="A1" t="s">', '<c r="A1" s="99" t="s">'),
    );
    zip.file("xl/vbaProject.bin", Buffer.from("macro"));

    const brokenBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await SpreadsheetEngine.validateAndRepair(brokenBuffer);
    const repairedContentTypes = await readZipEntry(result.repair.buffer, "[Content_Types].xml");
    const repairedWorkbookRels = await readZipEntry(result.repair.buffer, "xl/_rels/workbook.xml.rels");
    const repairedSheetXml = await readZipEntry(result.repair.buffer, "xl/worksheets/sheet1.xml");
    const repairedZip = await JSZip.loadAsync(result.repair.buffer);

    expect(result.original.verdict).toBe("errors");
    expect(result.repair.repaired).toBe(true);
    expect(result.repaired.verdict).toBe("clean");
    expect(result.repair.actions.map((action) => action.code)).toEqual(expect.arrayContaining([
      "FIX_CONTENT_TYPES",
      "REMOVE_ORPHAN_RELATIONSHIPS",
      "CLAMP_STYLE_INDEX",
      "MACRO_STRIPPED",
    ]));
    expect(repairedContentTypes).toContain('/xl/styles.xml');
    expect(repairedWorkbookRels).not.toContain('rId999');
    expect(repairedSheetXml).not.toContain(' s="99"');
    expect(repairedZip.file("xl/vbaProject.bin")).toBeNull();
  });

  it("normalizes duplicate table names and clips out-of-bounds table refs during repair", async () => {
    const validBuffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "North",
          rows: [
            { cells: [{ value: "Region" }, { value: "Revenue" }] },
            { cells: [{ value: "APAC" }, { value: 120 }] },
          ],
          tables: [
            { name: "RevenueTable", ref: "A1:B2" },
          ],
        },
        {
          name: "South",
          rows: [
            { cells: [{ value: "Region" }, { value: "Revenue" }] },
            { cells: [{ value: "EMEA" }, { value: 240 }] },
          ],
          tables: [
            { name: "RevenueTableTwo", ref: "A1:B2" },
          ],
        },
      ],
    });

    const zip = await JSZip.loadAsync(validBuffer);
    const table2Xml = await zip.file("xl/tables/table2.xml")?.async("string");
    expect(table2Xml).toBeDefined();

    zip.file(
      "xl/tables/table2.xml",
      String(table2Xml)
        .replace('name="RevenueTableTwo"', 'name="RevenueTable"')
        .replace('displayName="RevenueTableTwo"', 'displayName="RevenueTable"')
        .replace('ref="A1:B2"', 'ref="A1:B10"')
        .replace('autoFilter ref="A1:B2"', 'autoFilter ref="A1:B10"'),
    );

    const brokenBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const brokenSummary = await SpreadsheetEngine.validate(brokenBuffer);
    expect(brokenSummary.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "DUPLICATE_TABLE_NAME",
      "INVALID_TABLE_REF",
    ]));

    const repaired = await SpreadsheetEngine.repair(brokenBuffer);
    const repairedTable2 = await readZipEntry(repaired.buffer, "xl/tables/table2.xml");
    const repairedSummary = await SpreadsheetEngine.validate(repaired.buffer);

    expect(repaired.actions.map((action) => action.code)).toEqual(expect.arrayContaining([
      "NORMALIZE_DUPLICATE_TABLE_NAME",
      "CLIP_TABLE_REF",
    ]));
    expect(repairedTable2).toContain('displayName="RevenueTable_2"');
    expect(repairedTable2).toContain('name="RevenueTable_2"');
    expect(repairedTable2).toContain('ref="A1:B2"');
    expect(repairedTable2).toContain('<autoFilter ref="A1:B2"/>');
    expect(repairedSummary.verdict).toBe("clean");
  });

  it("recalculates worksheet dimensions, removes invalid hyperlinks, and clips data validation ranges", async () => {
    const validBuffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Repairs",
          dataValidations: [
            {
              ref: "A2",
              type: "whole",
              operator: "greaterThan",
              formula1: "0",
            },
          ],
          rows: [
            { cells: [{ value: "Name" }, { value: "Link" }] },
            { cells: [{ value: "Alpha" }, { value: "Docs", hyperlink: "https://runstamp.com" }] },
          ],
        },
      ],
    });

    const zip = await JSZip.loadAsync(validBuffer);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    expect(sheetXml).toBeDefined();

    zip.file(
      "xl/worksheets/sheet1.xml",
      String(sheetXml)
        .replace('dimension ref="A1:B2"', 'dimension ref="A1:A1"')
        .replace('hyperlink ref="B2"', 'hyperlink ref="BADREF"')
        .replace('dataValidation sqref="A2"', 'dataValidation sqref="XFE1"'),
    );

    const brokenBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const brokenSummary = await SpreadsheetEngine.validate(brokenBuffer);
    expect(brokenSummary.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "DIMENSION_MISMATCH",
      "HYPERLINK_TARGET_INVALID",
      "INVALID_RANGE_REF",
    ]));

    const repaired = await SpreadsheetEngine.repair(brokenBuffer);
    const repairedSheet = await readZipEntry(repaired.buffer, "xl/worksheets/sheet1.xml");
    const repairedSummary = await SpreadsheetEngine.validate(repaired.buffer);

    expect(repaired.actions.map((action) => action.code)).toEqual(expect.arrayContaining([
      "RECALCULATE_DIMENSION",
      "REMOVE_INVALID_HYPERLINKS",
      "CLIP_DATA_VALIDATION_RANGES",
    ]));
    expect(repairedSheet).toContain('<dimension ref="A1:B2"/>');
    expect(repairedSheet).not.toContain("BADREF");
    expect(repairedSheet).toContain('dataValidation sqref="XFD1"');
    expect(repairedSummary.verdict).toBe("clean");
  });

  it("removes invalid defined names and overlapping merges during repair", async () => {
    const validBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "GoodRange", ref: "Repairs!$A$2:$A$2" },
      ],
      sheets: [
        {
          name: "Repairs",
          mergedCells: ["A2:B2"],
          rows: [
            { cells: [{ value: "Header" }, { value: "Value" }, { value: "Extra" }] },
            { cells: [{ value: "North" }] },
          ],
        },
      ],
    });

    const zip = await JSZip.loadAsync(validBuffer);
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    expect(workbookXml).toBeDefined();
    expect(sheetXml).toBeDefined();

    zip.file(
      "xl/workbook.xml",
      String(workbookXml).replace(
        "</definedNames>",
        '<definedName name="BrokenName">Missing!$A$1:$A$1</definedName></definedNames>',
      ),
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      String(sheetXml).replace(
        '<mergeCells count="1"><mergeCell ref="A2:B2"/></mergeCells>',
        '<mergeCells count="2"><mergeCell ref="A2:B2"/><mergeCell ref="B2:C2"/></mergeCells>',
      ),
    );

    const brokenBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const brokenSummary = await SpreadsheetEngine.validate(brokenBuffer);
    expect(brokenSummary.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "DEFINED_NAME_INVALID",
      "MERGE_OVERLAP",
    ]));

    const repaired = await SpreadsheetEngine.repair(brokenBuffer);
    const repairedWorkbook = await readZipEntry(repaired.buffer, "xl/workbook.xml");
    const repairedSheet = await readZipEntry(repaired.buffer, "xl/worksheets/sheet1.xml");
    const repairedSummary = await SpreadsheetEngine.validate(repaired.buffer);

    expect(repaired.actions.map((action) => action.code)).toEqual(expect.arrayContaining([
      "REMOVE_INVALID_DEFINED_NAMES",
      "REPAIR_MERGES",
    ]));
    expect(repairedWorkbook).toContain('definedName name="GoodRange"');
    expect(repairedWorkbook).not.toContain('definedName name="BrokenName"');
    expect(repairedSheet).toContain('<mergeCells count="1"><mergeCell ref="A2:B2"/></mergeCells>');
    expect(repairedSheet).not.toContain('mergeCell ref="B2:C2"');
    expect(repairedSummary.verdict).toBe("clean");
  });

  it("clears invalid shared string references during repair", async () => {
    const baseBuffer = await SpreadsheetEngine.render(getPhase1Fixture("strings-unicode").document);
    const zip = await JSZip.loadAsync(baseBuffer);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");

    expect(sheetXml).toBeDefined();

    zip.file(
      "xl/worksheets/sheet1.xml",
      String(sheetXml).replace('<c r="A1" t="s"><v>0</v></c>', '<c r="A1" t="s"><v>999999</v></c>'),
    );

    const brokenBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const brokenSummary = await SpreadsheetEngine.validate(brokenBuffer);
    expect(brokenSummary.findings.map((finding) => finding.code)).toContain("SHARED_STRING_INDEX_OOB");

    const repaired = await SpreadsheetEngine.repair(brokenBuffer);
    const repairedSheet = await readZipEntry(repaired.buffer, "xl/worksheets/sheet1.xml");
    const repairedSummary = await SpreadsheetEngine.validate(repaired.buffer);

    expect(repaired.actions.map((action) => action.code)).toContain("REPAIR_SHARED_STRING_INDEX");
    expect(repairedSheet).not.toContain("<v>999999</v>");
    expect(repairedSummary.verdict).toBe("clean");
  });
});
