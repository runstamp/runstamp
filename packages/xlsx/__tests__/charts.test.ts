import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument, SpreadsheetChart } from "../src/types/spreadsheet-ast.js";
import { openZip, readZipEntry } from "./helpers.js";
import { assertExplicitDataLabelVector } from "../src/serializers/chart-serializer.js";

const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function makeChart(overrides?: Partial<SpreadsheetChart>): SpreadsheetChart {
  return {
    type: "col",
    title: "Sales",
    series: [{
      name: "Sheet1!$B$1",
      categories: "Sheet1!$A$2:$A$5",
      values: "Sheet1!$B$2:$B$5",
    }],
    anchor: { from: { col: 0, row: 5 }, to: { col: 8, row: 20 } },
    ...overrides,
  };
}

function singleChartWorkbook(chartOverrides?: Partial<SpreadsheetChart>): SpreadsheetDocument {
  return {
    sheets: [{
      name: "Sheet1",
      rows: [
        { cells: [{ value: "Category" }, { value: "Value" }] },
        { cells: [{ value: "Q1" }, { value: 100 }] },
        { cells: [{ value: "Q2" }, { value: 200 }] },
        { cells: [{ value: "Q3" }, { value: 150 }] },
        { cells: [{ value: "Q4" }, { value: 300 }] },
      ],
      charts: [makeChart(chartOverrides)],
    }],
  };
}

describe("Chart support", () => {
  it("should generate a bar chart with barDir=bar (horizontal)", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook({ type: "bar" }));
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain("<c:barChart>");
    expect(chartXml).toContain('<c:barDir val="bar"/>');
    expect(chartXml).toContain('<c:grouping val="clustered"/>');
    expect(chartXml).toContain("<c:catAx>");
    expect(chartXml).toContain("<c:valAx>");
  });

  it("should generate a column chart with barDir=col (vertical)", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook({ type: "col" }));
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain("<c:barChart>");
    expect(chartXml).toContain('<c:barDir val="col"/>');
    expect(chartXml).toContain('<c:grouping val="clustered"/>');
  });

  it("uses the full 0-100% value axis for percentage-only charts", async () => {
    const document = singleChartWorkbook();
    for (const [index, row] of document.sheets[0]!.rows.slice(1).entries()) {
      row.cells[1] = {
        value: [0.2, 0.75, 1, 0][index],
        style: { numberFormat: "0%" },
      };
    }

    const buffer = await SpreadsheetEngine.render(document);
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain('<c:scaling><c:orientation val="minMax"/><c:min val="0"/><c:max val="1"/></c:scaling>');
  });

  it("should generate a line chart", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook({ type: "line" }));
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain("<c:lineChart>");
    expect(chartXml).toContain('<c:grouping val="standard"/>');
    expect(chartXml).toContain("<c:catAx>");
    expect(chartXml).toContain("<c:valAx>");
  });

  it("should generate a pie chart with no axes", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook({ type: "pie" }));
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain("<c:pieChart>");
    expect(chartXml).not.toContain("<c:catAx>");
    expect(chartXml).not.toContain("<c:valAx>");
    expect(chartXml).not.toContain("<c:axId");
  });

  it("emits resolved series text so legends never display a raw range reference", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sales KPI",
        rows: [
          { cells: [{ value: "Month" }, { value: "Net revenue" }] },
          { cells: [{ value: "Jan" }, { value: 100 }] },
        ],
        charts: [makeChart({
          series: [{
            name: "'Sales KPI'!$B$1",
            categories: "'Sales KPI'!$A$2",
            values: "'Sales KPI'!$B$2",
          }],
        })],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain("<c:tx><c:v>Net revenue</c:v></c:tx>");
    expect(chartXml).not.toContain("<c:tx><c:strRef>");
    expect(chartXml).not.toContain("&apos;Sales KPI&apos;!$B$1");
  });

  it("quotes spaced sheet references and caches formula-backed chart data", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Dept Summary",
        rows: [
          { cells: [{ value: "Department" }, { value: "End HC" }] },
          { cells: [{ value: "Engineering" }, { formula: { expression: "1+60", cachedValue: 61 } }] },
          { cells: [{ value: "Product" }, { formula: { expression: "4+5", cachedValue: 9 } }] },
        ],
        charts: [makeChart({
          series: [{
            name: "Headcount",
            categories: "Dept Summary!$A$2:$A$3",
            values: "Dept Summary!$B$2:$B$3",
          }],
        })],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain("<c:f>&apos;Dept Summary&apos;!$A$2:$A$3</c:f>");
    expect(chartXml).toContain('<c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>Engineering</c:v></c:pt>');
    expect(chartXml).toContain("<c:f>&apos;Dept Summary&apos;!$B$2:$B$3</c:f>");
    expect(chartXml).toContain('<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>61</c:v></c:pt><c:pt idx="1"><c:v>9</c:v></c:pt>');
  });

  it("varies pie colors and emits a fill for every data point", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook({ type: "pie" }));
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain('<c:pieChart><c:varyColors val="1"/>');
    expect(chartXml.match(/<c:dPt>/g)).toHaveLength(4);
    expect(chartXml).toContain('<c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:schemeClr val="accent1"/>');
    expect(chartXml).toContain('<c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:schemeClr val="accent2"/>');
  });

  it("uses a repeated sheet brand fill and distinct professional pie colors", async () => {
    const document = singleChartWorkbook({ type: "pie" });
    for (const row of document.sheets[0]!.rows.slice(0, 2)) {
      for (const cell of row.cells) {
        cell.style = { fill: { type: "solid", fgColor: "FF3E5741" } };
      }
    }

    const buffer = await SpreadsheetEngine.render(document);
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain('<c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="3E5741"/>');
    expect(chartXml).toContain('<c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="547AA5"/>');
    expect(new Set([...chartXml.matchAll(/<c:dPt>.*?<a:srgbClr val="([0-9A-F]{6})"/gu)].map((match) => match[1])).size).toBe(4);
  });

  it("fits wide used ranges to one page by default", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Wide",
        rows: [{
          cells: Array.from({ length: 16 }, (_unused, index) => ({ value: `Column ${index + 1}` })),
        }],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const lint = SpreadsheetEngine.lint(doc);

    expect(sheetXml).toContain('<pageSetUpPr fitToPage="1"/>');
    expect(sheetXml).toContain('<pageSetup fitToWidth="1" fitToHeight="0"/>');
    expect(lint.issues).toContainEqual(expect.objectContaining({
      code: "XLSX_LINT_WIDE_PRINT_RANGE",
      path: "sheets[0].pageSetup",
    }));
  });

  it("infers the print area from populated cells instead of trailing row and column scaffolding", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Used range",
        columns: Array.from({ length: 8 }, () => ({ width: 12 })),
        rows: [
          { cells: [{ value: "Metric" }, { value: "Value" }] },
          { cells: [{ value: "ARR" }, { value: 42 }] },
          ...Array.from({ length: 8 }, () => ({ cells: [] })),
        ],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const workbookXml = await readZipEntry(buffer, "xl/workbook.xml");

    expect(workbookXml).toContain("&apos;Used range&apos;!$A$1:$B$2");
  });

  it("extends an inferred print area through anchored visual content", async () => {
    const doc = singleChartWorkbook({
      anchor: { from: { col: 3, row: 4 }, to: { col: 8, row: 15 } },
    });
    const buffer = await SpreadsheetEngine.render(doc);
    const workbookXml = await readZipEntry(buffer, "xl/workbook.xml");

    expect(workbookXml).toContain("Sheet1!$A$1:$C$39");
  });

  it("preserves explicit unconstrained pagination for long used ranges", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Long plan",
        pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
        rows: Array.from({ length: 64 }, (_unused, index) => ({ cells: [{ value: `Task ${index + 1}` }] })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
    expect(sheetXml).not.toContain("<rowBreaks");
  });

  it("preserves unconstrained vertical pagination for a standard 43-row datasheet", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Customer master",
        pageSetup: { orientation: "portrait", fitToWidth: 1, fitToHeight: 0 },
        rows: Array.from({ length: 43 }, (_unused, index) => ({ cells: [{ value: `Customer ${index + 1}` }] })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0"/>');
  });

  it("preserves explicit unconstrained pagination for a long transaction ledger", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Transactions",
        pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
        rows: Array.from({ length: 134 }, (_unused, index) => ({ cells: [{ value: `Transaction ${index + 1}` }] })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
    expect(sheetXml).not.toContain("<rowBreaks");
  });

  it("uses a smaller paper canvas and bounded enlargement for compact sheets", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Compact",
        pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
        rows: Array.from({ length: 10 }, (_unused, index) => ({
          cells: [{ value: `Metric ${index + 1}` }, { value: index + 1 }],
        })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<pageSetup paperSize="11" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
    expect(sheetXml).toMatch(/<sheetFormatPr defaultRowHeight="(?:2\d|3\d|4[0-5])(?:\.\d+)?"/);
  });

  it("keeps automatically configured compact sheets to one print page", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Summary",
        pageSetup: { orientation: "landscape", fitToWidth: 1 },
        rows: Array.from({ length: 13 }, (_unused, index) => ({
          cells: [{ value: index === 12 ? "Approval note" : `Budget ${index + 1}` }],
        })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<pageSetup paperSize="11" orientation="landscape" fitToWidth="1" fitToHeight="1"/>');
    expect(sheetXml).toContain('<pageMargins left="0.35" right="0.35" top="0.3" bottom="0.3" header="0.15" footer="0.15"/>');
  });

  it("reserves continuation-title headroom when enlarging a compact print sheet", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Financing history",
        columns: Array.from({ length: 6 }, () => ({ width: 16 })),
        pageSetup: {
          orientation: "landscape",
          fitToWidth: 1,
          fitToHeight: 0,
          printTitles: { rows: { start: 1, end: 1 } },
        },
        rows: Array.from({ length: 9 }, (_unused, index) => ({
          cells: Array.from({ length: 6 }, (_unusedCell, column) => ({ value: `${index}:${column}` })),
        })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const defaultHeight = /<sheetFormatPr defaultRowHeight="([\d.]+)"/u.exec(sheetXml)?.[1];

    expect(Number(defaultHeight)).toBeGreaterThan(15);
    expect(Number(defaultHeight)).toBeLessThan(35);
  });

  it("does not enlarge intentional blank spacer rows on compact sheets", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Compact with spacer",
        pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
        rows: [
          { cells: [{ value: "Planning assumptions" }] },
          { cells: [] },
          { cells: [{ value: "Burden multiple" }, { value: 1.28 }] },
        ],
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<row r="2" ht="15" customHeight="1"></row>');
  });

  it("accounts for fit-to-width shrinkage when enlarging compact wide sheets", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Wide summary",
        columns: Array.from({ length: 7 }, () => ({ width: 24 })),
        pageSetup: { orientation: "landscape", fitToWidth: 1 },
        rows: Array.from({ length: 10 }, (_unused, rowIndex) => ({
          cells: Array.from({ length: 7 }, (_unusedCell, columnIndex) => ({ value: `${rowIndex}:${columnIndex}` })),
        })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    const defaultHeight = /<sheetFormatPr defaultRowHeight="([\d.]+)"/u.exec(sheetXml)?.[1];
    expect(Number(defaultHeight)).toBeGreaterThan(15);
  });

  it("does not overexpand very wide compact forecasts onto a totals-only page", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Quarterly forecast",
        columns: Array.from({ length: 16 }, () => ({ width: 12 })),
        pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
        rows: Array.from({ length: 13 }, (_unused, rowIndex) => ({
          cells: Array.from({ length: 16 }, (_unusedCell, columnIndex) => ({ value: `${rowIndex}:${columnIndex}` })),
        })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    const defaultHeight = /<sheetFormatPr defaultRowHeight="([\d.]+)"/u.exec(sheetXml)?.[1];
    expect(Number(defaultHeight)).toBeGreaterThan(15);
    expect(Number(defaultHeight)).toBeLessThanOrEqual(24);
    expect(sheetXml).not.toMatch(/<row r="\d+" ht="(?:4\d|[5-9]\d)/u);
  });

  it("accounts for chart-only columns when expanding a combined print page", async () => {
    const document = singleChartWorkbook({
      anchor: { from: { col: 8, row: 3 }, to: { col: 14, row: 18 } },
    });
    document.sheets[0]!.columns = Array.from({ length: 8 }, () => ({ width: 11 }));
    document.sheets[0]!.rows = Array.from({ length: 28 }, (_unused, index) => ({
      cells: [{ value: `Budget ${index + 1}` }, { value: index + 1 }],
    }));
    document.sheets[0]!.pageSetup = { orientation: "landscape", fitToWidth: 1 };

    const buffer = await SpreadsheetEngine.render(document);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const firstRowHeight = /<row r="1" ht="([\d.]+)" customHeight="1"/u.exec(sheetXml)?.[1];
    expect(Number(firstRowHeight)).toBeGreaterThan(15);
  });

  it("does not vertically shrink dense wide registers that opt out of fitting", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Risk register",
        columns: Array.from({ length: 13 }, () => ({ width: 14 })),
        pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
        rows: Array.from({ length: 36 }, (_unused, rowIndex) => ({
          cells: Array.from({ length: 13 }, (_unusedCell, columnIndex) => ({ value: `${rowIndex}:${columnIndex}` })),
        })),
      }],
    };
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('fitToWidth="1" fitToHeight="0"');
    expect(sheetXml).not.toContain("<rowBreaks");
    expect(sheetXml).toContain('<col min="1" max="13" width="14" customWidth="1"/>');
  });

  it("enlarges a compact chart placed on its own fitted print page", async () => {
    const document = singleChartWorkbook({
      anchor: { from: { col: 0, row: 20 }, to: { col: 6, row: 32 } },
    });
    document.sheets[0]!.pageSetup = { orientation: "landscape", fitToWidth: 1 };
    const buffer = await SpreadsheetEngine.render(document);
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");

    expect(drawingXml).toContain("<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>6</xdr:row>");
    expect(drawingXml).toContain("<xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>40</xdr:row>");
  });

  it("combines an 18-row forecast and its following chart on one balanced page", async () => {
    const document = singleChartWorkbook({
      anchor: { from: { col: 0, row: 29 }, to: { col: 8, row: 44 } },
    });
    document.sheets[0]!.columns = Array.from({ length: 14 }, () => ({ width: 11 }));
    document.sheets[0]!.rows = Array.from({ length: 18 }, (_unused, index) => ({
      cells: [{ value: `MRR ${index + 1}` }, { value: index + 1 }],
    }));
    document.sheets[0]!.pageSetup = {
      fitToHeight: 0,
      fitToWidth: 1,
      orientation: "landscape",
    };

    const buffer = await SpreadsheetEngine.render(document);
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(drawingXml).toContain("<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>19</xdr:row>");
    expect(drawingXml).toContain("<xdr:to><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>37</xdr:row>");
    expect(sheetXml).toContain('fitToWidth="1" fitToHeight="1"');
    expect(sheetXml).not.toContain("<rowBreaks");
  });

  it("combines a nine-row annual summary and its chart on one page", async () => {
    const document = singleChartWorkbook({
      anchor: { from: { col: 0, row: 10 }, to: { col: 4, row: 25 } },
    });
    document.sheets[0]!.columns = Array.from({ length: 5 }, () => ({ width: 16 }));
    document.sheets[0]!.rows = Array.from({ length: 9 }, (_unused, index) => ({
      cells: [{ value: `Revenue ${index + 1}` }, { value: index + 1 }],
    }));
    document.sheets[0]!.pageSetup = {
      fitToHeight: 0,
      fitToWidth: 1,
      orientation: "landscape",
    };

    const buffer = await SpreadsheetEngine.render(document);
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(drawingXml).toContain("<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>10</xdr:row>");
    expect(drawingXml).toContain("<xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>28</xdr:row>");
    expect(sheetXml).toContain('fitToWidth="1" fitToHeight="1"');
    expect(sheetXml).not.toContain("<rowBreaks");
  });

  it("keeps a compact summary table and following chart on one page", async () => {
    const document = singleChartWorkbook({
      anchor: { from: { col: 0, row: 28 }, to: { col: 6, row: 43 } },
    });
    document.sheets[0]!.rows = Array.from({ length: 19 }, (_unused, index) => ({
      cells: [{ value: `Region ${index + 1}` }, { value: index + 1 }],
    }));
    document.sheets[0]!.pageSetup = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
    const buffer = await SpreadsheetEngine.render(document);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<sheetFormatPr defaultRowHeight="15"');
    expect(sheetXml).toContain('fitToWidth="1" fitToHeight="1"');
    expect(sheetXml).not.toContain("<rowBreaks");
  });

  it("places a manual page break before a chart that would otherwise be severed", async () => {
    const doc = singleChartWorkbook({
      anchor: { from: { col: 0, row: 40 }, to: { col: 8, row: 55 } },
    });
    doc.sheets[0]!.rows = Array.from({ length: 70 }, (_unused, index) => ({
      cells: [{ value: index === 0 ? "Header" : `Row ${index + 1}` }],
    }));
    doc.sheets[0]!.pageSetup = {
      printArea: "A1:I70",
      printTitles: { rows: { start: 0, end: 0 } },
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const workbookXml = await readZipEntry(buffer, "xl/workbook.xml");
    const lint = SpreadsheetEngine.lint(doc);

    expect(sheetXml).toContain('<rowBreaks count="1" manualBreakCount="1"><brk id="40" min="0" max="16383" man="1"/></rowBreaks>');
    expect(workbookXml).toContain("$A$1:$I$70");
    expect(workbookXml).toContain("$1:$1");
    expect(lint.issues).toContainEqual(expect.objectContaining({
      code: "XLSX_LINT_CHART_CROSSES_PAGE_BREAK",
      path: "sheets[0].charts[0].anchor",
    }));
    expect((await SpreadsheetEngine.validate(buffer)).verdict).toBe("clean");
  });

  it("composes a moderate table and following chart on one fitted dashboard page", async () => {
    const document = singleChartWorkbook({
      anchor: { from: { col: 0, row: 34 }, to: { col: 8, row: 64 } },
    });
    document.sheets[0]!.rows = Array.from({ length: 33 }, (_unused, index) => ({
      cells: [{ value: `Close task ${index + 1}` }],
    }));
    document.sheets[0]!.pageSetup = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };

    const buffer = await SpreadsheetEngine.render(document);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");

    expect(sheetXml).not.toContain("<rowBreaks");
    expect(sheetXml).toContain('fitToWidth="1" fitToHeight="1"');
    expect(sheetXml).toContain('<pageMargins left="0.35" right="0.35" top="0.3" bottom="0.3" header="0.15" footer="0.15"/>');
    expect(drawingXml).toContain("<xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>52</xdr:row>");
  });

  it("places two following dashboard charts side by side on one fitted page", async () => {
    const document = singleChartWorkbook();
    document.sheets[0]!.columns = Array.from({ length: 7 }, () => ({ width: 10 }));
    document.sheets[0]!.rows = Array.from({ length: 28 }, (_unused, index) => ({
      cells: [{ value: `Metric ${index + 1}` }, { value: index + 1 }],
    }));
    document.sheets[0]!.pageSetup = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
    document.sheets[0]!.charts = [
      makeChart({ anchor: { from: { col: 0, row: 30 }, to: { col: 6, row: 45 } } }),
      makeChart({ type: "pie", anchor: { from: { col: 0, row: 50 }, to: { col: 6, row: 65 } } }),
    ];

    const buffer = await SpreadsheetEngine.render(document);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");

    expect(sheetXml).not.toContain("<rowBreaks");
    expect(sheetXml).toContain('fitToWidth="1" fitToHeight="1"');
    expect(sheetXml).toContain('<col min="1" max="7" width="14" customWidth="1"/>');
    expect(drawingXml).toContain("<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>29</xdr:row>");
    expect(drawingXml).toContain("<xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>29</xdr:row>");
    expect(drawingXml).toContain("<xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>47</xdr:row>");
  });

  it("should generate multiple series", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        charts: [makeChart({
          series: [
            { name: "Sheet1!$B$1", values: "Sheet1!$B$2:$B$5" },
            { name: "Sheet1!$C$1", values: "Sheet1!$C$2:$C$5" },
            { name: "Sheet1!$D$1", values: "Sheet1!$D$2:$D$5" },
          ],
        })],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    const serCount = (chartXml.match(/<c:ser>/g) ?? []).length;
    expect(serCount).toBe(3);

    expect(chartXml).toContain('<c:idx val="0"/>');
    expect(chartXml).toContain('<c:idx val="1"/>');
    expect(chartXml).toContain('<c:idx val="2"/>');

    // Verify accent colors cycle
    expect(chartXml).toContain('<a:schemeClr val="accent1"/>');
    expect(chartXml).toContain('<a:schemeClr val="accent2"/>');
    expect(chartXml).toContain('<a:schemeClr val="accent3"/>');
  });

  it("should place chart and images on same sheet in a single drawing", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        images: [{
          data: PIXEL_PNG,
          type: "png",
          anchor: { from: { col: 0, row: 0 }, to: { col: 3, row: 3 } },
        }],
        charts: [makeChart()],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const zip = await openZip(buffer);

    // One drawing file for the sheet
    expect(zip.file("xl/drawings/drawing1.xml")).not.toBeNull();
    // No separate drawing2.xml
    expect(zip.file("xl/drawings/drawing2.xml")).toBeNull();

    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");
    // Contains both pic (image) and graphicFrame (chart)
    expect(drawingXml).toContain("<xdr:pic>");
    expect(drawingXml).toContain("<xdr:graphicFrame>");

    // Drawing rels contain both image and chart relationships
    const relsXml = await readZipEntry(buffer, "xl/drawings/_rels/drawing1.xml.rels");
    expect(relsXml).toContain("relationships/image");
    expect(relsXml).toContain("relationships/chart");
  });

  it("should support charts in multiple sheets", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Sheet1",
          rows: [{ cells: [{ value: "A" }] }],
          charts: [makeChart({ title: "Chart A" })],
        },
        {
          name: "Sheet2",
          rows: [{ cells: [{ value: "B" }] }],
          charts: [makeChart({ title: "Chart B" })],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const zip = await openZip(buffer);

    expect(zip.file("xl/charts/chart1.xml")).not.toBeNull();
    expect(zip.file("xl/charts/chart2.xml")).not.toBeNull();
    expect(zip.file("xl/drawings/drawing1.xml")).not.toBeNull();
    expect(zip.file("xl/drawings/drawing2.xml")).not.toBeNull();

    const chart1Xml = await readZipEntry(buffer, "xl/charts/chart1.xml");
    expect(chart1Xml).toContain("Chart A");
    const chart2Xml = await readZipEntry(buffer, "xl/charts/chart2.xml");
    expect(chart2Xml).toContain("Chart B");
  });

  it("should include chart override in content types", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook());
    const contentTypes = await readZipEntry(buffer, "[Content_Types].xml");

    expect(contentTypes).toContain('PartName="/xl/charts/chart1.xml"');
    expect(contentTypes).toContain("drawingml.chart+xml");
  });

  it("should include chart relationship type in drawing rels", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook());
    const relsXml = await readZipEntry(buffer, "xl/drawings/_rels/drawing1.xml.rels");

    expect(relsXml).toContain("relationships/chart");
    expect(relsXml).toContain("../charts/chart1.xml");
  });

  it("should accept charts in validation and reject empty series", () => {
    // Valid chart
    const validDoc: SpreadsheetDocument = singleChartWorkbook();
    expect(() => SpreadsheetEngine.validateDocument(validDoc)).not.toThrow();

    // Empty series array should be rejected
    const invalidDoc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        charts: [{
          type: "col",
          series: [],
          anchor: { from: { col: 0, row: 0 } },
        } as any],
      }],
    };
    expect(() => SpreadsheetEngine.validateDocument(invalidDoc)).toThrow();
  });

  it("rejects chart dimensions that exceed drawing bounds", () => {
    expect(() => SpreadsheetEngine.validateDocument(singleChartWorkbook({
      width: 5_000,
      height: 4_200,
    }))).toThrow(/Drawing dimensions/);
  });

  it("should produce deterministic output", async () => {
    const doc = singleChartWorkbook();
    const buffer1 = await SpreadsheetEngine.render(doc, { deterministic: true });
    const buffer2 = await SpreadsheetEngine.render(doc, { deterministic: true });
    const zip1 = await openZip(buffer1);
    const zip2 = await openZip(buffer2);
    for (const name of Object.keys(zip1.files)) {
      if (zip1.files[name].dir) continue;
      const content1 = await zip1.files[name].async("string");
      const content2 = await zip2.files[name]?.async("string");
      expect(content1).toBe(content2);
    }
  });

  it("should omit title element when title is undefined", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook({ title: undefined }));
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain('<c:autoTitleDeleted val="1"/>');
    expect(chartXml).not.toContain("<c:title>");
  });

  it("should omit legend when showLegend is false", async () => {
    const buffer = await SpreadsheetEngine.render(
      singleChartWorkbook({ style: { showLegend: false } }),
    );
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).not.toContain("<c:legend>");
  });

  it("should include value-only data labels when showDataLabels is true", async () => {
    const buffer = await SpreadsheetEngine.render(
      singleChartWorkbook({ style: { showDataLabels: true } }),
    );
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain(
      '<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>',
    );
  });

  it("should omit data labels when showDataLabels is false", async () => {
    const buffer = await SpreadsheetEngine.render(
      singleChartWorkbook({ style: { showDataLabels: false } }),
    );
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).not.toContain("<c:dLbls>");
  });

  it("rejects a deliberately ambiguous data-label serialization", () => {
    expect(() => assertExplicitDataLabelVector(
      '<c:dLbls><c:showVal val="1"/></c:dLbls>',
      true,
    )).toThrow(/explicit value-only label vector/);
  });

  it("should use fallback series name when name is not provided", async () => {
    const buffer = await SpreadsheetEngine.render(
      singleChartWorkbook({
        series: [{ values: "Sheet1!$B$2:$B$5" }],
      }),
    );
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    expect(chartXml).toContain("<c:v>Series 1</c:v>");
  });

  it("should use correct axis positions for horizontal bar chart", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook({ type: "bar" }));
    const chartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");

    // For horizontal bar: catAx at "l" (left), valAx at "b" (bottom)
    expect(chartXml).toContain('<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>');
    expect(chartXml).toContain('<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>');
  });

  it("should include graphicFrame with chart reference in drawing XML", async () => {
    const buffer = await SpreadsheetEngine.render(singleChartWorkbook());
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");

    expect(drawingXml).toContain("<xdr:graphicFrame>");
    expect(drawingXml).toContain("http://schemas.openxmlformats.org/drawingml/2006/chart");
    expect(drawingXml).toContain('r:id="rId1"');
  });
});
