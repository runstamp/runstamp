import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, SpreadsheetValidationError, validateSpreadsheetDocument } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Phase 3 structural features", () => {
  it("serializes freeze panes, auto-filter, merge cells, sheet state, tab color, and defined names in worksheet order", async () => {
    const buffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "RevenueData", ref: "Revenue!$B$2:$B$4" },
        { name: "ScopedValue", ref: "Summary!$A$1", scope: "Summary" },
      ],
      sheets: [
        {
          name: "Hidden",
          state: "hidden",
          rows: [{ cells: [{ value: "hidden" }] }],
        },
        {
          name: "Revenue",
          tabColor: "#4472C4",
          freezePane: { row: 1, col: 1 },
          autoFilter: true,
          rows: [
            {
              cells: [
                {
                  value: "Revenue Report",
                  colSpan: 3,
                  rowSpan: 2,
                  style: {
                    border: {
                      top: { style: "thin", color: "#333333" },
                      bottom: { style: "thin", color: "#333333" },
                      left: { style: "thin", color: "#333333" },
                      right: { style: "thin", color: "#333333" },
                    },
                  },
                },
                { value: "Status" },
              ],
            },
            {
              cells: [
                { value: "Open" },
              ],
            },
            {
              cells: [
                { value: "Q1" },
                { value: 420000 },
                { value: 0.24, style: "percentage" },
                { value: "Healthy" },
              ],
            },
            {
              cells: [
                { value: "Q2" },
                { value: 510000 },
                { value: 0.27, style: "percentage" },
                { value: "At Risk" },
              ],
            },
          ],
        },
        {
          name: "Summary",
          rows: [{ cells: [{ value: "Summary" }] }],
        },
      ],
    });

    const revenueSheet = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    const workbook = await readZipEntry(buffer, "xl/workbook.xml");

    expect(workbook).toContain('<sheet name="Hidden" sheetId="1" r:id="rId1" state="hidden"/>');
    expect(workbook).toContain('<sheet name="Revenue" sheetId="2" r:id="rId2"/>');
    expect(workbook).toContain('<definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">Revenue!$A$1:$D$4</definedName>');
    expect(workbook).toContain('<definedName name="RevenueData">Revenue!$B$2:$B$4</definedName>');
    expect(workbook).toContain('<definedName name="ScopedValue" localSheetId="2">Summary!$A$1:$A$1</definedName>');

    expect(revenueSheet).toContain('<sheetPr><tabColor rgb="FF4472C4"/><pageSetUpPr fitToPage="1"/></sheetPr>');
    expect(revenueSheet).toContain('<dimension ref="A1:D4"/>');
    expect(revenueSheet).toContain('<sheetView workbookViewId="0" tabSelected="1"><pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B2" sqref="B2"/></sheetView>');
    expect(revenueSheet).toContain('<autoFilter ref="A1:D4"/>');
    expect(revenueSheet).toContain('<mergeCells count="1"><mergeCell ref="A1:C2"/></mergeCells>');
    expect(revenueSheet).toContain('<c r="B1" s="');
    expect(revenueSheet).toContain('<c r="C2" s="');

    const sheetDataIndex = revenueSheet.indexOf("<sheetData>");
    const autoFilterIndex = revenueSheet.indexOf("<autoFilter");
    const mergeCellsIndex = revenueSheet.indexOf("<mergeCells");
    expect(sheetDataIndex).toBeGreaterThan(0);
    expect(autoFilterIndex).toBeGreaterThan(sheetDataIndex);
    expect(mergeCellsIndex).toBeGreaterThan(autoFilterIndex);
  });

  it("rejects overlapping merge ranges and consumed explicit merge cells", () => {
    expect(() => validateSpreadsheetDocument({
      sheets: [
        {
          name: "Overlap",
          mergedCells: ["A1:C3", "B2:D4"],
          rows: [
            { cells: [{ value: "Title" }, { value: "Should fail" }] },
            { cells: [] },
            { cells: [] },
            { cells: [] },
          ],
        },
      ],
    })).toThrowError(SpreadsheetValidationError);

    try {
      validateSpreadsheetDocument({
        sheets: [
          {
            name: "Overlap",
            mergedCells: ["A1:C3", "B2:D4"],
            rows: [
              { cells: [{ value: "Title" }, { value: "Should fail" }] },
              { cells: [] },
              { cells: [] },
              { cells: [] },
            ],
          },
        ],
      });
    } catch (error) {
      const validationError = error as SpreadsheetValidationError;
      expect(validationError.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "MERGE_RANGE_OVERLAP",
          message: expect.stringContaining("A1:C3"),
        }),
      ]));
      return;
    }

    throw new Error("Expected validation to fail");
  });

  it("serializes data validations and hyperlink relationships in worksheet order", async () => {
    const buffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "StatusList", ref: "Lookups!$A$1:$A$3" },
      ],
      sheets: [
        {
          name: "Summary",
          dataValidations: [
            {
              ref: "B2:B10",
              type: "list",
              formula1: "=StatusList",
              showDropDown: true,
              allowBlank: true,
              showInputMessage: true,
              promptTitle: "Status",
              prompt: "Choose one of the approved statuses",
              showErrorMessage: true,
              errorTitle: "Invalid status",
              error: "Select a status from the dropdown",
              errorStyle: "stop",
            },
            {
              ref: "C2:C10",
              type: "whole",
              operator: "between",
              formula1: "0",
              formula2: "1000000",
            },
          ],
          rows: [
            { cells: [{ value: "Account" }, { value: "Status" }, { value: "Budget" }, { value: "Docs" }] },
            {
              cells: [
                { value: "Northwind" },
                { value: "Active" },
                { value: 250000 },
                {
                  value: "Policy",
                  hyperlink: {
                    target: "https://example.com/policy",
                    tooltip: "Open the policy guide",
                  },
                },
              ],
            },
            {
              cells: [
                { value: "Contoso" },
                { value: "Pending" },
                { value: 180000 },
                {
                  value: "Jump to lookups",
                  hyperlink: {
                    location: "Lookups!A1",
                    display: "Lookup values",
                  },
                },
              ],
            },
          ],
        },
        {
          name: "Lookups",
          rows: [
            { cells: [{ value: "Active" }] },
            { cells: [{ value: "Inactive" }] },
            { cells: [{ value: "Pending" }] },
          ],
        },
      ],
    });

    const summarySheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const summaryRels = await readZipEntry(buffer, "xl/worksheets/_rels/sheet1.xml.rels");

    expect(summarySheet).toContain("<dataValidations count=\"2\">");
    expect(summarySheet).toContain("showDropDown=\"0\"");
    expect(summarySheet).toContain("<formula1>=StatusList</formula1>");
    expect(summarySheet).toContain("<formula2>1000000</formula2>");
    expect(summarySheet).toContain("<hyperlinks>");
    expect(summarySheet).toContain("<hyperlink ref=\"D2\" tooltip=\"Open the policy guide\" r:id=\"rId1\"/>");
    expect(summarySheet).toContain("<hyperlink ref=\"D3\" display=\"Lookup values\" location=\"Lookups!A1\"/>");

    const conditionalFormattingIndex = summarySheet.indexOf("<conditionalFormatting");
    const dataValidationsIndex = summarySheet.indexOf("<dataValidations");
    const hyperlinksIndex = summarySheet.indexOf("<hyperlinks");
    if (conditionalFormattingIndex >= 0) {
      expect(dataValidationsIndex).toBeGreaterThan(conditionalFormattingIndex);
    }
    expect(hyperlinksIndex).toBeGreaterThan(dataValidationsIndex);

    expect(summaryRels).toContain("Id=\"rId1\"");
    expect(summaryRels).toContain("Target=\"https://example.com/policy\"");
    expect(summaryRels).toContain("TargetMode=\"External\"");
  });

  it("rejects internal hyperlinks that reference missing sheets", () => {
    expect(() => validateSpreadsheetDocument({
      sheets: [
        {
          name: "Summary",
          rows: [
            {
              cells: [
                {
                  value: "Broken link",
                  hyperlink: {
                    location: "Missing Sheet!A1",
                  },
                },
              ],
            },
          ],
        },
      ],
    })).toThrowError(SpreadsheetValidationError);

    try {
      validateSpreadsheetDocument({
        sheets: [
          {
            name: "Summary",
            rows: [
              {
                cells: [
                  {
                    value: "Broken link",
                    hyperlink: {
                      location: "Missing Sheet!A1",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    } catch (error) {
      const validationError = error as SpreadsheetValidationError;
      expect(validationError.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "HYPERLINK_INVALID",
          path: "sheets[0].rows[0].cells[0].hyperlink",
        }),
      ]));
      return;
    }

    throw new Error("Expected validation to fail");
  });

  it("serializes print setup, margins, and workbook print defined names in worksheet order", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Report",
          pageSetup: {
            orientation: "landscape",
            paperSize: 1,
            scale: 85,
            fitToWidth: 1,
            fitToHeight: 0,
            printArea: "A1:D40",
            printTitles: {
              rows: { start: 0, end: 1 },
              columns: { start: 0, end: 0 },
            },
            options: {
              gridLines: true,
            },
            margins: {
              left: 0.7,
              right: 0.7,
              top: 0.75,
              bottom: 0.75,
              header: 0.3,
              footer: 0.3,
            },
          },
          rows: [
            { cells: [{ value: "Region" }, { value: "Quarter" }, { value: "Revenue" }, { value: "Growth" }] },
            { cells: [{ value: "NA" }, { value: "Q1" }, { value: 420000 }, { value: 0.24 }] },
          ],
        },
      ],
    });

    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const workbook = await readZipEntry(buffer, "xl/workbook.xml");

    expect(sheet).toContain("<sheetPr><pageSetUpPr fitToPage=\"1\"/></sheetPr>");
    expect(sheet).toContain("<printOptions gridLines=\"1\"/>");
    expect(sheet).toContain("<pageMargins left=\"0.7\" right=\"0.7\" top=\"0.75\" bottom=\"0.75\" header=\"0.3\" footer=\"0.3\"/>");
    expect(sheet).toContain("<pageSetup paperSize=\"1\" orientation=\"landscape\" scale=\"85\" fitToWidth=\"1\" fitToHeight=\"0\"/>");

    const printOptionsIndex = sheet.indexOf("<printOptions");
    const pageMarginsIndex = sheet.indexOf("<pageMargins");
    const pageSetupIndex = sheet.indexOf("<pageSetup");
    expect(printOptionsIndex).toBeGreaterThan(sheet.indexOf("<sheetData>"));
    expect(pageMarginsIndex).toBeGreaterThan(printOptionsIndex);
    expect(pageSetupIndex).toBeGreaterThan(pageMarginsIndex);

    expect(workbook).toContain("<definedName name=\"_xlnm.Print_Area\" localSheetId=\"0\">Report!$A$1:$D$40</definedName>");
    expect(workbook).toContain("<definedName name=\"_xlnm.Print_Titles\" localSheetId=\"0\">Report!$1:$2,Report!$A:$A</definedName>");
  });

  it("escapes XML-special sheet names inside print defined names", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "P&L FY2025",
          autoFilter: { ref: "A1:B2" },
          pageSetup: {
            printArea: "A1:B4",
            printTitles: { rows: { start: 0, end: 0 } },
          },
          rows: [
            { cells: [{ value: "Line" }, { value: "Amount" }] },
            { cells: [{ value: "Revenue" }, { value: 100 }] },
          ],
        },
      ],
    });

    const workbook = await readZipEntry(buffer, "xl/workbook.xml");
    expect(workbook).toContain("<definedName name=\"_xlnm.Print_Titles\" localSheetId=\"0\">&apos;P&amp;L FY2025&apos;!$1:$1</definedName>");
    expect(workbook).toContain("<definedName name=\"_xlnm.Print_Area\" localSheetId=\"0\">&apos;P&amp;L FY2025&apos;!$A$1:$B$4</definedName>");
    expect(workbook).toContain("name=\"_xlnm._FilterDatabase\"");
    expect(workbook).not.toContain("'P&L");
  });

  it("rejects invalid print title ranges", () => {
    expect(() => validateSpreadsheetDocument({
      sheets: [
        {
          name: "Report",
          pageSetup: {
            printTitles: {
              rows: { start: 3, end: 1 },
            },
          },
          rows: [],
        },
      ],
    })).toThrowError(SpreadsheetValidationError);

    try {
      validateSpreadsheetDocument({
        sheets: [
          {
            name: "Report",
            pageSetup: {
              printTitles: {
                rows: { start: 3, end: 1 },
              },
            },
            rows: [],
          },
        ],
      });
    } catch (error) {
      const validationError = error as SpreadsheetValidationError;
      expect(validationError.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "PRINT_SETUP_INVALID",
        }),
      ]));
      return;
    }

    throw new Error("Expected validation to fail");
  });

  it("serializes formula pass-through, cached values, array ranges, and cache misses", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Data Analysis",
          rows: [
            { cells: [{ value: 2 }, { value: 3 }] },
          ],
        },
        {
          name: "Summary",
          rows: [
            {
              cells: [
                { formula: "SUM('Data Analysis'!A1:B1)" },
                { formula: "IF(A2<B2,\"<less>\",\">=more\")" },
                { formula: "ROUND(ABS(-12.345),2)" },
                { formula: { expression: "SUM(A2:B2)", arrayRange: "D1:D3", cachedValue: 3 } },
                { formula: "IF(A2>B2,TRUE,FALSE)" },
                { formula: "IFERROR(VLOOKUP(A2,'Data Analysis'!A:B,2,FALSE),\"\")" },
                { formula: { expression: "A2/0", cachedValue: { error: "#DIV/0!" } } },
                { formula: { expression: "SEQUENCE(3)", dynamic: true } },
              ],
            },
            {
              cells: [
                { value: 1 },
                { value: 2 },
              ],
            },
          ],
        },
      ],
    });

    const summarySheet = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");

    expect(summarySheet).toContain("<c r=\"A1\"><f>SUM(&apos;Data Analysis&apos;!A1:B1)</f><v>5</v></c>");
    expect(summarySheet).toContain("<c r=\"B1\" t=\"str\"><f>IF(A2&lt;B2,&quot;&lt;less&gt;&quot;,&quot;&gt;=more&quot;)</f><v>&lt;less&gt;</v></c>");
    expect(summarySheet).toContain("<c r=\"C1\"><f>ROUND(ABS(-12.345),2)</f><v>12.35</v></c>");
    expect(summarySheet).toContain("<c r=\"D1\"><f t=\"array\" ref=\"D1:D3\">SUM(A2:B2)</f><v>3</v></c>");
    expect(summarySheet).toContain("<c r=\"E1\" t=\"b\"><f>IF(A2&gt;B2,TRUE,FALSE)</f><v>0</v></c>");
    expect(summarySheet).toContain("<c r=\"F1\"><f>IFERROR(VLOOKUP(A2,&apos;Data Analysis&apos;!A:B,2,FALSE),&quot;&quot;)</f></c>");
    expect(summarySheet).toContain("<c r=\"G1\" t=\"e\"><f>A2/0</f><v>#DIV/0!</v></c>");
    expect(summarySheet).toContain("<c r=\"H1\" cm=\"1\"><f>SEQUENCE(3)</f></c>");
  });
});
