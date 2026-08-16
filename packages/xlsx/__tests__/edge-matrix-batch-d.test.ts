import { describe, expect, it } from "vitest";
import {
  SpreadsheetEngine,
  SpreadsheetValidationError,
} from "../src/index.js";
import type {
  SpreadsheetChart,
  SpreadsheetDocument,
} from "../src/index.js";
import { openZip, parseZipXml } from "./helpers.js";

function chart(overrides: Partial<SpreadsheetChart>): SpreadsheetChart {
  return {
    type: "col",
    title: "Edge matrix",
    series: [{ values: "Data!$B$2:$B$3" }],
    anchor: { from: { col: 3, row: 0 }, to: { col: 10, row: 15 } },
    ...overrides,
  };
}

describe("P2C Batch D xlsx edge matrix", () => {
  it("cell 1: round-trips a 10k-character cell byte-identically and preserves its width hint", async () => {
    const value = `A<&B>${"x".repeat(9_995)}`;
    expect(value).toHaveLength(10_000);
    const document: SpreadsheetDocument = {
      sheets: [{
        name: "Overflow",
        columns: [{ width: 42 }],
        rows: [{ cells: [{ value }] }],
      }],
    };

    const buffer = await SpreadsheetEngine.render(document, {
      stringStrategy: "inlineStrings",
    });
    const sheet = await parseZipXml(buffer, "xl/worksheets/sheet1.xml");
    const parsedValue = sheet.worksheet.sheetData.row.c.is.t;
    const column = sheet.worksheet.cols.col;

    expect(Buffer.from(parsedValue, "utf8")).toEqual(Buffer.from(value, "utf8"));
    expect(Number(column["@_width"])).toBe(42);
    expect((await SpreadsheetEngine.validate(buffer)).verdict).toBe("clean");
  });

  it("cell 2: stores an unbreakable string verbatim, caps an excessive width hint, and lints it", async () => {
    const value = "https://example.test/" + "x".repeat(300);
    const document: SpreadsheetDocument = {
      sheets: [{
        name: "Unbreakable",
        columns: [{ width: 300 }],
        rows: [{ cells: [{ value }] }],
      }],
    };

    const lint = SpreadsheetEngine.lint(document);
    expect(lint.ok).toBe(true);
    expect(lint.issues).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "XLSX_LINT_COLUMN_WIDTH_CAPPED",
      path: "sheets[0].columns[0].width",
    }));

    const buffer = await SpreadsheetEngine.render(document, {
      stringStrategy: "inlineStrings",
    });
    const sheet = await parseZipXml(buffer, "xl/worksheets/sheet1.xml");

    expect(sheet.worksheet.sheetData.row.c.is.t).toBe(value);
    expect(Number(sheet.worksheet.cols.col["@_width"])).toBe(255);
    expect((await SpreadsheetEngine.validate(buffer)).verdict).toBe("clean");
  });

  it("cell 5: renders a series with no value range as an explicit empty placeholder and lints it", async () => {
    const document: SpreadsheetDocument = {
      sheets: [{
        name: "Data",
        rows: [{ cells: [{ value: "Category" }, { value: "Value" }] }],
        charts: [chart({ series: [{ name: "Data!$B$1", values: "" }] })],
      }],
    };

    expect(() => SpreadsheetEngine.validateDocument(document)).not.toThrow();
    expect(SpreadsheetEngine.lint(document).issues).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "XLSX_LINT_CHART_EMPTY_SERIES",
      path: "sheets[0].charts[0].series[0].values",
    }));

    const buffer = await SpreadsheetEngine.render(document);
    const zip = await openZip(buffer);
    const parsedChart = await parseZipXml(buffer, "xl/charts/chart1.xml");
    const chartXml = await zip.file("xl/charts/chart1.xml")!.async("string");

    expect(parsedChart["c:chartSpace"]["c:chart"]["c:plotArea"]).toBeDefined();
    expect(chartXml).toContain('<c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="0"/></c:numLit>');
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
    expect((await SpreadsheetEngine.validate(buffer)).verdict).toBe("clean");
  });

  it("cell 5: marks an all-empty referenced range with an empty cache and resolves the referenced series name", async () => {
    const document: SpreadsheetDocument = {
      sheets: [{
        name: "Dashboard",
        rows: [
          { cells: [{ value: "Category" }, { value: "Revenue" }] },
          { cells: [{ value: "Q1" }, {}] },
          { cells: [{ value: "Q2" }, { value: null }] },
        ],
        charts: [chart({
          series: [{
            name: "Dashboard!$B$1",
            categories: "Dashboard!$A$2:$A$3",
            values: "Dashboard!$B$2:$B$3",
          }],
        })],
      }],
    };

    expect(SpreadsheetEngine.lint(document).issues).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "XLSX_LINT_CHART_EMPTY_SERIES",
    }));

    const buffer = await SpreadsheetEngine.render(document);
    const zip = await openZip(buffer);
    const chartXml = await zip.file("xl/charts/chart1.xml")!.async("string");
    const parsedChart = await parseZipXml(buffer, "xl/charts/chart1.xml");

    expect(parsedChart["c:chartSpace"]["c:chart"]["c:plotArea"]).toBeDefined();
    expect(chartXml).toContain('<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="0"/></c:numCache>');
    expect(chartXml).toContain("<c:tx><c:v>Revenue</c:v></c:tx>");
    expect(chartXml).not.toContain("<c:tx><c:strRef>");
    expect((await SpreadsheetEngine.validate(buffer)).verdict).toBe("clean");
  });

  it("cell 5: rejects a chart with zero series during validation", () => {
    const document: SpreadsheetDocument = {
      sheets: [{
        name: "Data",
        rows: [{ cells: [{ value: "Value" }] }],
        charts: [chart({ series: [] })],
      }],
    };

    expect(() => SpreadsheetEngine.validateDocument(document)).toThrow(SpreadsheetValidationError);
  });
});
