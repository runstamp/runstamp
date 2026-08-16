import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";

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

function makeRowsWorkbook(rowCount: number): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Data",
        rows: Array.from({ length: rowCount }, (_unused, i) => ({
          cells: [
            { value: `label-${i}` },
            { value: i },
            { value: i % 2 === 0 },
          ],
        })),
      },
    ],
  };
}

async function compareZipEntries(
  standardBuffer: Buffer,
  streamingBuffer: Buffer,
  expectedPaths?: string[],
) {
  const [standardZip, streamingZip] = await Promise.all([
    JSZip.loadAsync(standardBuffer),
    JSZip.loadAsync(streamingBuffer),
  ]);
  const standardPaths = Object.keys(standardZip.files).filter((path) => !standardZip.files[path].dir).sort();
  const streamingPaths = Object.keys(streamingZip.files).filter((path) => !streamingZip.files[path].dir).sort();

  expect(streamingPaths).toEqual(standardPaths);

  const pathsToCompare = expectedPaths ?? standardPaths;
  for (const path of pathsToCompare) {
    const standardEntry = standardZip.file(path);
    const streamingEntry = streamingZip.file(path);
    expect(standardEntry, `Missing standard ZIP entry: ${path}`).toBeTruthy();
    expect(streamingEntry, `Missing streaming ZIP entry: ${path}`).toBeTruthy();
    const [standardContent, streamingContent] = await Promise.all([
      standardEntry!.async("nodebuffer"),
      streamingEntry!.async("nodebuffer"),
    ]);
    expect(
      streamingContent.equals(standardContent),
      `Mismatched ZIP entry: ${path}`,
    ).toBe(true);
  }
}

async function renderBoth(
  document: SpreadsheetDocument,
  options: { deterministic?: boolean } = { deterministic: true },
) {
  const [standardBuffer, stream] = await Promise.all([
    SpreadsheetEngine.render(document, options),
    SpreadsheetEngine.renderStream(document, options),
  ]);
  const streamingBuffer = await streamToBuffer(stream);
  return { standardBuffer, streamingBuffer };
}

function makeDateWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Dates",
        rows: [
          { cells: [{ value: "Boundary" }, { value: "Date" }] },
          { cells: [{ value: "Epoch start" }, { value: new Date(Date.UTC(1899, 11, 31)) }] },
          { cells: [{ value: "Day one" }, { value: new Date(Date.UTC(1900, 0, 1)) }] },
          { cells: [{ value: "Leap bug edge" }, { value: new Date(Date.UTC(1900, 1, 28)) }] },
          { cells: [{ value: "Post-bug" }, { value: new Date(Date.UTC(1900, 2, 1)) }] },
        ],
      },
    ],
  };
}

function makeRichTextWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "RichText",
        rows: [
          {
            cells: [
              {
                value: [
                  { text: "Paper", font: { bold: true, color: "FF4472C4" } },
                  { text: "JSX", font: { italic: true, color: "FFED7D31" } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeTableWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Revenue",
        rows: [
          { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Status" }] },
          { cells: [{ value: "APAC" }, { value: 120 }, { value: "Open" }] },
          { cells: [{ value: "EMEA" }, { value: 240 }, { value: "Closed" }] },
          { cells: [{ value: "AMER" }, { value: 180 }, { value: "Open" }] },
          { cells: [{ value: "Merged summary" }, { value: null }, { value: "Outside table" }] },
        ],
        mergedCells: ["A5:B5"],
        tables: [
          {
            name: "RevenueTable",
            ref: "A1:C4",
            style: {
              name: "TableStyleMedium9",
              showFirstColumn: true,
            },
          },
        ],
      },
    ],
  };
}

function makeConditionalFormattingWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Receivables",
        rows: [
          { cells: [{ value: "Account" }, { value: "Balance" }] },
          { cells: [{ value: "A-100" }, { value: 45 }] },
          { cells: [{ value: "A-101" }, { value: 125 }] },
          { cells: [{ value: "A-102" }, { value: 215 }] },
          { cells: [{ value: "A-103" }, { value: 60 }] },
        ],
        conditionalFormatting: [
          {
            ref: "B2:B5",
            rules: [
              {
                type: "cellIs",
                operator: "greaterThan",
                formula: "100",
                style: {
                  font: { bold: true, color: "#9C0006" },
                  fill: { color: "#FFC7CE" },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeChartWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Dashboard",
        rows: [
          { cells: [{ value: "Week" }, { value: "Revenue" }] },
          { cells: [{ value: "W1" }, { value: 120 }] },
          { cells: [{ value: "W2" }, { value: 180 }] },
          { cells: [{ value: "W3" }, { value: 150 }] },
        ],
        charts: [
          {
            type: "bar",
            title: "Weekly revenue",
            series: [
              {
                name: "Dashboard!$B$1",
                categories: "Dashboard!$A$2:$A$4",
                values: "Dashboard!$B$2:$B$4",
              },
            ],
            anchor: { from: { col: 4, row: 0 }, to: { col: 12, row: 14 } },
          },
        ],
      },
    ],
  };
}

describe("Streaming architecture", () => {
  it("produces content-identical output to non-streaming render in deterministic mode with 1000 rows", async () => {
    const doc = makeRowsWorkbook(1000);
    const [rendered, stream] = await Promise.all([
      SpreadsheetEngine.render(doc),
      SpreadsheetEngine.renderStream(doc),
    ]);
    const streamed = await streamToBuffer(stream);

    // JSZip generateAsync vs generateNodeStream(streamFiles:true) produce
    // structurally different ZIP files, so byte-identity is not achievable.
    // Instead verify all ZIP entries have identical XML content.
    const renderedZip = await JSZip.loadAsync(rendered);
    const streamedZip = await JSZip.loadAsync(streamed);

    const renderedPaths = Object.keys(renderedZip.files).filter((p) => !renderedZip.files[p].dir).sort();
    const streamedPaths = Object.keys(streamedZip.files).filter((p) => !streamedZip.files[p].dir).sort();
    expect(streamedPaths).toEqual(renderedPaths);

    for (const path of renderedPaths) {
      const renderedContent = await renderedZip.file(path)!.async("string");
      const streamedContent = await streamedZip.file(path)!.async("string");
      expect(streamedContent).toBe(renderedContent);
    }
  });

  it("produces a valid XLSX with 5000 rows via streaming", async () => {
    const doc = makeRowsWorkbook(5000);
    const stream = await SpreadsheetEngine.renderStream(doc);
    const buffer = await streamToBuffer(stream);

    expect(buffer.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buffer);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir).sort();

    expect(paths).toContain("[Content_Types].xml");
    expect(paths).toContain("xl/workbook.xml");
    expect(paths).toContain("xl/worksheets/sheet1.xml");

    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheetXml).toContain("<sheetData>");
    expect(sheetXml).toContain("</sheetData>");
    expect(sheetXml).toContain('r="5000"');
  });

  it("returns a ReadableStream that can be fully consumed into a Buffer", async () => {
    const doc = makeRowsWorkbook(100);
    const stream = await SpreadsheetEngine.renderStream(doc);

    expect(stream).toBeDefined();
    expect(typeof stream.on).toBe("function");

    const buffer = await streamToBuffer(stream);
    expect(buffer.length).toBeGreaterThan(0);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("streams a workbook with multiple sheets", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "First",
          rows: Array.from({ length: 200 }, (_unused, i) => ({
            cells: [{ value: `first-${i}` }, { value: i }],
          })),
        },
        {
          name: "Second",
          rows: Array.from({ length: 300 }, (_unused, i) => ({
            cells: [{ value: `second-${i}` }, { value: i * 2 }],
          })),
        },
        {
          name: "Third",
          rows: Array.from({ length: 50 }, (_unused, i) => ({
            cells: [{ value: `third-${i}` }],
          })),
        },
      ],
    };

    const stream = await SpreadsheetEngine.renderStream(doc);
    const buffer = await streamToBuffer(stream);

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/sheet2.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/sheet3.xml")).not.toBeNull();

    const sheet1 = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    const sheet2 = await zip.file("xl/worksheets/sheet2.xml")!.async("string");
    const sheet3 = await zip.file("xl/worksheets/sheet3.xml")!.async("string");

    expect(sheet1).toContain('r="200"');
    expect(sheet2).toContain('r="300"');
    expect(sheet3).toContain('r="50"');

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("keeps date cells content-identical between standard and streaming renders", async () => {
    const { standardBuffer, streamingBuffer } = await renderBoth(makeDateWorkbook());

    await compareZipEntries(standardBuffer, streamingBuffer, [
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
      "xl/workbook.xml",
    ]);
  });

  it("keeps rich text cell XML identical between standard and streaming renders", async () => {
    const { standardBuffer, streamingBuffer } = await renderBoth(makeRichTextWorkbook());

    await compareZipEntries(standardBuffer, streamingBuffer, [
      "xl/sharedStrings.xml",
      "xl/worksheets/sheet1.xml",
      "xl/styles.xml",
    ]);
  });

  it("keeps named table and merged-cell workbook parts identical between standard and streaming renders", async () => {
    const { standardBuffer, streamingBuffer } = await renderBoth(makeTableWorkbook());

    await compareZipEntries(standardBuffer, streamingBuffer, [
      "[Content_Types].xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/_rels/sheet1.xml.rels",
      "xl/tables/table1.xml",
    ]);
  });

  it("keeps conditional formatting XML identical between standard and streaming renders", async () => {
    const { standardBuffer, streamingBuffer } = await renderBoth(makeConditionalFormattingWorkbook());

    await compareZipEntries(standardBuffer, streamingBuffer, [
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("keeps chart drawing parts identical between standard and streaming renders", async () => {
    const { standardBuffer, streamingBuffer } = await renderBoth(makeChartWorkbook());

    await compareZipEntries(standardBuffer, streamingBuffer, [
      "[Content_Types].xml",
      "xl/worksheets/sheet1.xml",
      "xl/drawings/drawing1.xml",
      "xl/drawings/_rels/drawing1.xml.rels",
      "xl/charts/chart1.xml",
    ]);
  });

  it("keeps a 100,000-row workbook structurally identical on key entries in streaming mode", async () => {
    const { standardBuffer, streamingBuffer } = await renderBoth(makeRowsWorkbook(100_000));

    await compareZipEntries(standardBuffer, streamingBuffer, [
      "xl/workbook.xml",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);

    const [standardSummary, streamingSummary] = await Promise.all([
      SpreadsheetEngine.validate(standardBuffer),
      SpreadsheetEngine.validate(streamingBuffer),
    ]);
    expect(standardSummary.verdict).toBe("clean");
    expect(streamingSummary.verdict).toBe("clean");
  }, 150_000);
});
