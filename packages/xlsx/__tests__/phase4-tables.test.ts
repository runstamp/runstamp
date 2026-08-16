import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, SpreadsheetValidationError } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Phase 4 structured tables", () => {
  it("renders native table parts and exposes them through template parsing", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Revenue",
          rows: [
            { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Status" }] },
            { cells: [{ value: "APAC" }, { value: 120 }, { value: "Open" }] },
            { cells: [{ value: "EMEA" }, { value: 240 }, { value: "Closed" }] },
            { cells: [{ value: null }, { value: null }, { value: null }] },
          ],
          tables: [
            {
              name: "RevenueTable",
              ref: "A1:C4",
              totalsRow: true,
              columns: [
                { totalsRowLabel: "Total" },
                { totalsRowFunction: "sum" },
                {},
              ],
              style: {
                name: "TableStyleMedium9",
                showFirstColumn: true,
              },
            },
          ],
        },
      ],
    });

    const tableXml = await readZipEntry(buffer, "xl/tables/table1.xml");
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const sheetRels = await readZipEntry(buffer, "xl/worksheets/_rels/sheet1.xml.rels");
    const contentTypes = await readZipEntry(buffer, "[Content_Types].xml");
    const template = await SpreadsheetEngine.parseTemplate(buffer);
    const validation = await SpreadsheetEngine.validate(buffer);

    expect(tableXml).toContain('<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="RevenueTable" displayName="RevenueTable" ref="A1:C4" headerRowCount="1" totalsRowCount="1">');
    expect(tableXml).toContain('<autoFilter ref="A1:C3"/>');
    expect(tableXml).toContain('<tableColumn id="1" name="Region" totalsRowLabel="Total"/>');
    expect(tableXml).toContain('<tableColumn id="2" name="Revenue" totalsRowFunction="sum"/>');
    expect(tableXml).toContain('<tableStyleInfo name="TableStyleMedium9" showFirstColumn="1" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>');
    expect(sheetXml).toContain('<tableParts count="1"><tablePart r:id="rId1"/></tableParts>');
    expect(sheetRels).toContain('Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table"');
    expect(sheetRels).toContain('Target="../tables/table1.xml"');
    expect(contentTypes).toContain('PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"');
    expect(template.tables).toEqual([
      expect.objectContaining({
        name: "RevenueTable",
        path: "xl/tables/table1.xml",
        ref: "A1:C4",
      }),
    ]);
    expect(template.sheets[0]?.tableNames).toEqual(["RevenueTable"]);
    expect(validation.verdict).toBe("warnings");
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
          location: expect.objectContaining({ cellRef: "B4" }),
        }),
      ]),
    );
  });

  it("keeps hyperlink and table worksheet relationships stable on the same sheet", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Revenue",
          rows: [
            { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Link" }] },
            { cells: [{ value: "APAC" }, { value: 120 }, { value: "Docs", hyperlink: "https://runstamp.com" }] },
            { cells: [{ value: "EMEA" }, { value: 240 }, { value: "Blog" }] },
          ],
          tables: [
            {
              name: "RevenueTable",
              ref: "A1:C3",
            },
          ],
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const sheetRels = await readZipEntry(buffer, "xl/worksheets/_rels/sheet1.xml.rels");

    expect(sheetXml).toContain('<hyperlinks><hyperlink ref="C2" r:id="rId1"/></hyperlinks>');
    expect(sheetXml).toContain('<tableParts count="1"><tablePart r:id="rId2"/></tableParts>');
    expect(sheetRels).toContain('Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"');
    expect(sheetRels).toContain('Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table"');
  });

  it("rejects overlapping tables and duplicate workbook table names", () => {
    expect(() => SpreadsheetEngine.validate({
      sheets: [
        {
          name: "Revenue",
          rows: [
            { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Status" }] },
            { cells: [{ value: "APAC" }, { value: 120 }, { value: "Open" }] },
            { cells: [{ value: "EMEA" }, { value: 240 }, { value: "Closed" }] },
          ],
          tables: [
            { name: "RevenueTable", ref: "A1:B3" },
            { name: "RevenueTable", ref: "B1:C3" },
          ],
        },
      ],
    })).toThrow(SpreadsheetValidationError);
  });
});
