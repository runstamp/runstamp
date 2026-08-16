import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// 1x1 transparent PNG for image tests
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
    "Nl7BcQAAAABJRU5ErkJggg==",
  "base64",
);

function buildKitchenSinkDocument(): SpreadsheetDocument {
  return {
    meta: {
      title: "Kitchen Sink Integration Test",
      creator: "Integration Suite",
      company: "Plainworks",
      created: new Date(Date.UTC(2025, 0, 15)),
      modified: new Date(Date.UTC(2025, 5, 1)),
      description: "All features combined",
      category: "Test",
      keywords: ["integration", "test"],
    },
    theme: {
      name: "Custom Theme",
      colorScheme: {
        accent1: "FF4472C4",
        accent2: "FFED7D31",
      },
      fontScheme: {
        majorLatin: "Calibri Light",
        minorLatin: "Calibri",
      },
    },
    defaults: {
      font: { family: "Calibri", size: 11 },
      columnWidth: 10,
      rowHeight: 15,
    },
    namedRanges: [
      { name: "LookupRange", ref: "Features!$A$2:$C$6" },
      { name: "DateCell", ref: "Features!$D$2" },
    ],
    sheets: [
      // Sheet 1: Features — comments, images, formulas, rich text, hyperlinks, merged cells
      {
        name: "Features",
        tabColor: "FF0000FF",
        columns: [
          { width: 20 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 20 },
        ],
        freezePane: { row: 1, col: 1 },
        pageSetup: {
          orientation: "landscape",
          paperSize: 1,
          scale: 90,
          margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75 },
          options: { gridLines: true, headings: true },
          printTitles: { rows: { start: 0, end: 0 } },
        },
        protection: {
          sheet: true,
          password: "test",
          formatCells: true,
          insertRows: true,
          deleteRows: true,
          selectLockedCells: false,
          selectUnlockedCells: false,
        },
        images: [
          {
            data: TINY_PNG,
            type: "png",
            anchor: { from: { col: 4, row: 0 } },
            name: "TestImage",
            description: "A test image",
            width: 100,
            height: 50,
          },
        ],
        dataValidations: [
          {
            ref: "B2:B6",
            type: "whole",
            operator: "between",
            formula1: "1",
            formula2: "1000",
            showErrorMessage: true,
            errorTitle: "Invalid",
            error: "Enter a number between 1 and 1000",
            errorStyle: "stop",
          },
          {
            ref: "E2:E6",
            type: "list",
            formula1: '"High,Medium,Low"',
            showDropDown: true,
            allowBlank: true,
          },
        ],
        conditionalFormatting: [
          {
            ref: "B2:B6",
            rules: [
              {
                type: "cellIs",
                operator: "greaterThan",
                formula: "500",
                style: { font: { bold: true, color: "FF0000" } },
              },
            ],
          },
          {
            ref: "C2:C6",
            rules: [
              {
                type: "colorScale",
                scale: {
                  min: { type: "min", color: "FFF8696B" },
                  mid: { type: "percentile", value: 50, color: "FFFFFFEB" },
                  max: { type: "max", color: "FF63BE7B" },
                },
              },
            ],
          },
          {
            ref: "B2:B6",
            rules: [
              {
                type: "dataBar",
                color: "FF638EC6",
                min: { type: "min" },
                max: { type: "max" },
              },
            ],
          },
          {
            ref: "B2:B6",
            rules: [
              {
                type: "top10",
                rank: 3,
                style: { fill: { color: "FFFF00" } },
              },
            ],
          },
          {
            ref: "A2:A6",
            rules: [
              {
                type: "duplicateValues",
                style: { fill: { color: "FFCCCCCC" } },
              },
            ],
          },
        ],
        tables: [
          {
            name: "MainTable",
            ref: "A1:E6",
            totalsRow: true,
            columns: [
              { name: "Name" },
              { name: "Value", totalsRowFunction: "sum" },
              { name: "Score", totalsRowFunction: "average" },
              { name: "Date" },
              { name: "Priority" },
            ],
            style: {
              name: "TableStyleMedium9",
              showRowStripes: true,
            },
          },
        ],
        rows: [
          // Header row
          {
            height: 20,
            cells: [
              { value: "Name" },
              { value: "Value" },
              { value: "Score" },
              { value: "Date" },
              { value: "Priority" },
            ],
          },
          // Data rows with comments, formulas, hyperlinks, rich text
          {
            cells: [
              {
                value: "Alpha",
                comment: { author: "Tester", text: "First entry" },
                hyperlink: { target: "https://example.com", tooltip: "Visit" },
              },
              { value: 100 },
              { value: 85.5 },
              { value: new Date(Date.UTC(2025, 0, 15)), style: { numberFormat: "yyyy-mm-dd" } },
              { value: "High" },
            ],
          },
          {
            cells: [
              { value: "Beta" },
              { value: 250 },
              { value: 92.0 },
              { value: new Date(Date.UTC(2025, 1, 20)), style: { numberFormat: "yyyy-mm-dd" } },
              { value: "Medium" },
            ],
          },
          {
            cells: [
              {
                value: [
                  { text: "Gamma", font: { bold: true, color: "FF0000" } },
                  { text: " Corp", font: { italic: true } },
                ],
              },
              { value: 750 },
              { value: 45.2 },
              { value: new Date(Date.UTC(2025, 2, 10)), style: { numberFormat: "yyyy-mm-dd" } },
              { value: "Low" },
            ],
          },
          {
            cells: [
              { value: "Delta" },
              { value: 500 },
              { value: 78.9 },
              { value: new Date(Date.UTC(2025, 3, 5)), style: { numberFormat: "yyyy-mm-dd" } },
              { value: "High" },
            ],
          },
          {
            cells: [
              { value: "Alpha" },
              { value: 300 },
              { value: 60.1 },
              { value: new Date(Date.UTC(2025, 4, 25)), style: { numberFormat: "yyyy-mm-dd" } },
              { value: "Medium" },
            ],
          },
          // Totals row placeholder
          { cells: [] },
          // Row with merged cell and formula
          {
            cells: [
              { value: "VLOOKUP Result:" },
              {
                formula: {
                  expression: 'VLOOKUP("Beta",A2:C6,3,FALSE)',
                  cachedValue: 92,
                },
              },
              {
                formula: {
                  expression: "DATE(2025,6,15)",
                },
              },
              {
                // merged D8:E8
                value: "Merged area with summary",
                colSpan: 2,
                style: {
                  font: { bold: true },
                  alignment: { horizontal: "center" },
                  fill: { color: "FFE0E0E0" },
                },
              },
            ],
          },
          // Additional formula rows
          {
            cells: [
              { value: "TEXT Result:" },
              {
                formula: {
                  expression: 'TEXT(45757,"yyyy-mm-dd")',
                },
              },
              {
                formula: {
                  expression: 'CONCATENATE("Hello"," ","World")',
                },
              },
              {
                formula: {
                  expression: 'TRIM("  spaced   out  ")',
                },
              },
            ],
          },
          // Cross-sheet formula
          {
            cells: [
              { value: "Cross-sheet ref:" },
              {
                formula: {
                  expression: "SUM(Summary!A1:A3)",
                },
              },
            ],
          },
        ],
      },
      // Sheet 2: Summary — simpler sheet with cross-sheet references
      {
        name: "Summary",
        tabColor: "FF00FF00",
        rows: [
          { cells: [{ value: 10 }] },
          { cells: [{ value: 20 }] },
          { cells: [{ value: 30 }] },
          {
            cells: [
              {
                formula: {
                  expression: "SUM(A1:A3)",
                  cachedValue: 60,
                },
              },
            ],
          },
        ],
      },
      // Sheet 3: Hidden sheet
      {
        name: "Config",
        state: "hidden",
        rows: [
          { cells: [{ value: "secret_key" }, { value: "abc123" }] },
        ],
      },
    ],
  };
}

describe("Integration: Kitchen sink workbook", () => {
  it("renders a workbook using every feature without errors", async () => {
    const doc = buildKitchenSinkDocument();
    const buffer = await SpreadsheetEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it("ZIP contains all expected parts (comments, VML, drawings, media, tables, styles, shared strings)", async () => {
    const doc = buildKitchenSinkDocument();
    const buffer = await SpreadsheetEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

    // Core parts
    expect(paths).toContain("[Content_Types].xml");
    expect(paths).toContain("xl/workbook.xml");
    expect(paths).toContain("xl/styles.xml");
    expect(paths).toContain("xl/worksheets/sheet1.xml");
    expect(paths).toContain("xl/worksheets/sheet2.xml");
    expect(paths).toContain("xl/worksheets/sheet3.xml");

    // Comments and VML
    const hasComments = paths.some((p) => p.includes("comments"));
    expect(hasComments).toBe(true);
    const hasVml = paths.some((p) => p.includes("vmlDrawing"));
    expect(hasVml).toBe(true);

    // Drawings (images)
    const hasDrawing = paths.some((p) => p.includes("drawing"));
    expect(hasDrawing).toBe(true);

    // Media (image files)
    const hasMedia = paths.some((p) => p.startsWith("xl/media/"));
    expect(hasMedia).toBe(true);

    // Tables
    const hasTables = paths.some((p) => p.includes("table"));
    expect(hasTables).toBe(true);

    // SharedStrings (kitchen sink has many text values)
    const hasSharedStrings = paths.some((p) => p.includes("sharedStrings"));
    expect(hasSharedStrings).toBe(true);

    // Theme
    expect(paths).toContain("xl/theme/theme1.xml");
  });

  it("streaming output matches buffer render entry-for-entry in deterministic mode", async () => {
    const doc = buildKitchenSinkDocument();
    const [rendered, stream] = await Promise.all([
      SpreadsheetEngine.render(doc, { deterministic: true }),
      SpreadsheetEngine.renderStream(doc, { deterministic: true }),
    ]);
    const streamed = await streamToBuffer(stream);

    const renderedZip = await JSZip.loadAsync(rendered);
    const streamedZip = await JSZip.loadAsync(streamed);

    const renderedPaths = Object.keys(renderedZip.files).sort();
    const streamedPaths = Object.keys(streamedZip.files).sort();
    expect(streamedPaths).toEqual(renderedPaths);

    for (const path of renderedPaths.filter((entry) => !renderedZip.files[entry]?.dir)) {
      const renderedContent = await renderedZip.file(path)!.async("string");
      const streamedContent = await streamedZip.file(path)!.async("string");
      expect(streamedContent).toBe(renderedContent);
    }
  });

  it("date cells have correct serial values (post Lotus bug fix)", async () => {
    const doc = buildKitchenSinkDocument();
    const buffer = await SpreadsheetEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    const parsed = xmlParser.parse(sheetXml);

    // Find data rows — row 2 has date 2025-01-15 which should be serial 45672
    // (days since 1899-12-30, Excel epoch with Lotus bug)
    // Jan 15, 2025 = serial 45672
    const rows = parsed.worksheet.sheetData.row;
    const row2 = Array.isArray(rows)
      ? rows.find((r: any) => r["@_r"] === "2")
      : undefined;
    expect(row2).toBeDefined();

    const cells = Array.isArray(row2.c) ? row2.c : [row2.c];
    // Cell D2 should contain the date serial for 2025-01-15
    const d2 = cells.find((c: any) => c["@_r"] === "D2");
    expect(d2).toBeDefined();
    const serialValue = Number(d2.v);
    // 2025-01-15 is serial 45672
    expect(serialValue).toBe(45672);
  });

  it("formula cached values are present in the XML for expanded evaluator functions", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Formulas",
          rows: [
            // Lookup table
            { cells: [{ value: "Name" }, { value: "Score" }] },
            { cells: [{ value: "Alice" }, { value: 95 }] },
            { cells: [{ value: "Bob" }, { value: 80 }] },
            { cells: [{ value: "Charlie" }, { value: 70 }] },
            // Formula cells
            {
              cells: [
                {
                  formula: {
                    expression: 'VLOOKUP("Bob",A1:B4,2,FALSE)',
                  },
                },
                {
                  formula: {
                    expression: "DATE(2025,3,15)",
                  },
                },
                {
                  formula: {
                    expression: 'CONCATENATE("Hello"," ","World")',
                  },
                },
                {
                  formula: {
                    expression: 'TRIM("  hello   world  ")',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");

    // VLOOKUP("Bob",...) should cache 80
    expect(sheetXml).toContain(">80<");
    // CONCATENATE should cache "Hello World"
    expect(sheetXml).toContain("Hello World");
    // TRIM should cache "hello world"
    expect(sheetXml).toContain("hello world");
    // DATE(2025,3,15) should produce a serial number
    // March 15, 2025 = serial 45731
    expect(sheetXml).toContain("45731");
  });

  it("template round-trip: render → parse → inspect → verify features", async () => {
    const doc = buildKitchenSinkDocument();
    const buffer = await SpreadsheetEngine.render(doc);

    const index = await SpreadsheetEngine.parseTemplate(buffer);
    const report = SpreadsheetEngine.inspectTemplate(index);

    // Should have 3 sheets
    expect(report.sheetInventory.length).toBe(3);
    expect(report.sheetInventory.map((s) => s.name)).toEqual(["Features", "Summary", "Config"]);
  });

  it("large workbook: 10K rows, 20 columns with comments and images renders without timeout", async () => {
    const rowCount = 10_000;
    const colCount = 20;

    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "LargeData",
          images: [
            {
              data: TINY_PNG,
              type: "png",
              anchor: { from: { col: 0, row: 0 } },
              width: 50,
              height: 50,
            },
          ],
          rows: Array.from({ length: rowCount }, (_unused, rowIdx) => ({
            cells: Array.from({ length: colCount }, (_unused2, colIdx) => {
              const cell: any = { value: `R${rowIdx}C${colIdx}` };
              // Add comment every 2000 rows on first cell
              if (colIdx === 0 && rowIdx % 2000 === 0) {
                cell.comment = { author: "Bot", text: `Comment at row ${rowIdx}` };
              }
              return cell;
            }),
          })),
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buffer);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheetXml).toContain(`dimension ref="A1:T${rowCount}"`);
  }, 30_000);

  it("multi-sheet with different feature subsets and cross-sheet formulas", async () => {
    const doc: SpreadsheetDocument = {
      namedRanges: [
        { name: "TotalSales", ref: "Sales!$B$4" },
      ],
      sheets: [
        // Sheet 1: Data with tables and conditional formatting
        {
          name: "Sales",
          tables: [
            {
              name: "SalesTable",
              ref: "A1:B4",
              columns: [{ name: "Product" }, { name: "Revenue" }],
              style: { showRowStripes: true },
            },
          ],
          conditionalFormatting: [
            {
              ref: "B2:B4",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "200",
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
          rows: [
            { cells: [{ value: "Product" }, { value: "Revenue" }] },
            { cells: [{ value: "Widget" }, { value: 150 }] },
            { cells: [{ value: "Gadget" }, { value: 300 }] },
            {
              cells: [
                { value: "Total" },
                { formula: { expression: "SUM(B2:B3)", cachedValue: 450 } },
              ],
            },
          ],
        },
        // Sheet 2: Charts data with images and data validation
        {
          name: "Analysis",
          images: [
            {
              data: TINY_PNG,
              type: "png",
              anchor: { from: { col: 3, row: 0 } },
              width: 200,
              height: 150,
            },
          ],
          dataValidations: [
            {
              ref: "C2:C5",
              type: "list",
              formula1: '"Q1,Q2,Q3,Q4"',
              allowBlank: true,
            },
          ],
          rows: [
            { cells: [{ value: "Metric" }, { value: "Value" }, { value: "Quarter" }] },
            {
              cells: [
                { value: "Sales Total" },
                { formula: { expression: "Sales!B4" } },
                { value: "Q1" },
              ],
            },
            {
              cells: [
                { value: "Cross-sheet SUM" },
                { formula: { expression: "SUM(Sales!B2:B3)" } },
                { value: "Q2" },
              ],
            },
          ],
        },
        // Sheet 3: Comments and protection
        {
          name: "Notes",
          protection: { sheet: true, formatCells: true },
          freezePane: { row: 1, col: 0 },
          rows: [
            {
              cells: [
                {
                  value: "Important note",
                  comment: { author: "Admin", text: "Review this quarterly" },
                  style: { font: { bold: true }, fill: { color: "FFFFFF00" } },
                },
              ],
            },
            {
              cells: [
                {
                  value: [
                    { text: "Rich ", font: { bold: true } },
                    { text: "text ", font: { italic: true, color: "FF0000FF" } },
                    { text: "here" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buffer);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

    // Verify all 3 sheets
    expect(paths).toContain("xl/worksheets/sheet1.xml");
    expect(paths).toContain("xl/worksheets/sheet2.xml");
    expect(paths).toContain("xl/worksheets/sheet3.xml");

    // Verify tables
    const hasTables = paths.some((p) => p.includes("table"));
    expect(hasTables).toBe(true);

    // Verify images/drawings
    const hasDrawing = paths.some((p) => p.includes("drawing"));
    expect(hasDrawing).toBe(true);

    // Verify comments
    const hasComments = paths.some((p) => p.includes("comments"));
    expect(hasComments).toBe(true);

    // Verify cross-sheet formula in Analysis sheet
    const sheet2Xml = await zip.file("xl/worksheets/sheet2.xml")!.async("string");
    expect(sheet2Xml).toContain("Sales!B4");
    expect(sheet2Xml).toContain("SUM(Sales!B2:B3)");
  });
});
