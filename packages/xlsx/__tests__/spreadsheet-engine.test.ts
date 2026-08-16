import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, SpreadsheetValidationError, validateSpreadsheetDocument } from "../src/index.js";
import { determinismSeedWorkbook, emptyWorkbook, mixedTypesWorkbook, xmlHostileWorkbook } from "./fixtures/phase1/index.js";
import { openZip, parseZipXml, readZipEntry } from "./helpers.js";
import { dateToSerialString } from "../src/utils/date.js";

function dateToSerial(value: Date): string {
  return dateToSerialString(value);
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

describe("SpreadsheetEngine", () => {
  it("emits exactly one XML declaration per worksheet part", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        { name: "Empty", rows: [] },
        { name: "SingleCell", rows: [{ cells: [{ value: "Hello world" }] }] },
        { name: "Notes", rows: [{ cells: [{ value: "Reviewed by finance" }] }] },
      ],
    });

    const sheet1 = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const sheet2 = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    const sheet3 = await readZipEntry(buffer, "xl/worksheets/sheet3.xml");

    for (const sheetXml of [sheet1, sheet2, sheet3]) {
      expect(sheetXml.match(/<\?xml/g)).toHaveLength(1);
      expect(sheetXml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8" standalone="yes"\?><worksheet /);
    }
  });

  it("renders a structurally complete workbook package", async () => {
    const buffer = await SpreadsheetEngine.render(emptyWorkbook);
    const zip = await openZip(buffer);
    const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir).sort();

    expect(paths).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "docProps/app.xml",
      "docProps/core.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/sharedStrings.xml",
      "xl/styles.xml",
      "xl/theme/theme1.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);

    const contentTypes = await readZipEntry(buffer, "[Content_Types].xml");
    expect(contentTypes).toContain('/xl/workbook.xml');
    expect(contentTypes).toContain('/xl/worksheets/sheet1.xml');
    expect(contentTypes).toContain('/docProps/core.xml');
    expect(contentTypes).toContain('/docProps/app.xml');

    const workbook = await readZipEntry(buffer, "xl/workbook.xml");
    expect(workbook).toContain('<sheet name="Empty" sheetId="1" r:id="rId1"/>');

    const workbookRels = await readZipEntry(buffer, "xl/_rels/workbook.xml.rels");
    expect(workbookRels).toContain('Target="worksheets/sheet1.xml"');
    expect(workbookRels).toContain('Target="styles.xml"');
    expect(workbookRels).toContain('Target="sharedStrings.xml"');
    expect(workbookRels).toContain('Target="theme/theme1.xml"');
  });

  it("serializes mixed cell types, layout metadata, and shared strings correctly", async () => {
    const buffer = await SpreadsheetEngine.render(mixedTypesWorkbook);
    const sheet1 = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const sheet2 = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    const sharedStrings = await readZipEntry(buffer, "xl/sharedStrings.xml");
    const sharedStringsTree = await parseZipXml(buffer, "xl/sharedStrings.xml");

    expect(sheet1).toContain('<sheetView workbookViewId="0" tabSelected="1"/>');
    expect(sheet1).toContain('<sheetFormatPr defaultRowHeight="41.25" defaultColWidth="8.43"/>');
    expect(sheet1).toContain('<col min="1" max="1" width="12.5" customWidth="1"/>');
    expect(sheet1).toContain('min="3" max="3"');
    expect(sheet1).toContain('hidden="1"');
    expect(sheet1).toContain('<c r="A2" t="s"><v>5</v></c>');
    expect(sheet1).toContain('<c r="B2"><v>420000</v></c>');
    expect(sheet1).toContain('<c r="C2" t="b"><v>1</v></c>');
    expect(sheet1).toContain(`r="D2"`);
    expect(sheet1).toContain(`<v>${dateToSerial(new Date("2026-03-27T00:00:00.000Z"))}</v>`);
    expect(sheet1).not.toContain('r="E2"');

    expect(sheet2).toContain('<sheetView workbookViewId="0" rightToLeft="1"/>');
    expect(sheet2).toContain('<row r="1" ht="15" customHeight="1" hidden="1"></row>');
    expect(sheet2).toContain('<row r="2" ht="60.5" customHeight="1">');
    expect(sheet2).toContain('<c r="B2" t="b"><v>0</v></c>');

    expect(sharedStrings).toContain("مرحبا");
    expect(sharedStringsTree.sst["@_count"]).toBe("7");
    expect(sharedStringsTree.sst["@_uniqueCount"]).toBe("7");
  });

  it("sanitizes hostile string content without breaking XML", async () => {
    const buffer = await SpreadsheetEngine.render(xmlHostileWorkbook);
    const sst = await readZipEntry(buffer, "xl/sharedStrings.xml");

    expect(sst).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(sst).toContain("&amp;amp;");
    expect(sst).toContain("&quot;quotes&quot;");
    expect(sst).toContain("&apos;apos&apos;");
    expect(sst).toContain('<t xml:space="preserve">  padded  </t>');
    expect(sst).toContain("<t>badtext</t>");
  });

  it("produces byte-identical output in deterministic mode", async () => {
    const [first, second] = await Promise.all([
      SpreadsheetEngine.render(determinismSeedWorkbook),
      SpreadsheetEngine.render(determinismSeedWorkbook),
    ]);

    expect(Buffer.compare(first, second)).toBe(0);

    const coreProps = await readZipEntry(first, "docProps/core.xml");
    expect(coreProps).toContain("<dcterms:created xsi:type=\"dcterms:W3CDTF\">2026-01-01T00:00:00Z</dcterms:created>");
    expect(coreProps).toContain("<dcterms:modified xsi:type=\"dcterms:W3CDTF\">2026-01-01T00:00:00Z</dcterms:modified>");
  });

  it("streams workbook output without materializing the final ZIP buffer first", async () => {
    const stream = await SpreadsheetEngine.renderStream(emptyWorkbook);
    const buffer = await streamToBuffer(stream);
    const summary = await SpreadsheetEngine.validate(buffer);

    expect(buffer.length).toBeGreaterThan(0);
    expect(summary.verdict).toBe("clean");
  });

  it("returns structured validation errors for invalid and deferred fields", async () => {
    expect(() => validateSpreadsheetDocument({
      sheets: [
        {
          name: "Revenue [Q4]",
          rows: [],
        },
      ],
    })).toThrowError(SpreadsheetValidationError);

    try {
      validateSpreadsheetDocument({
        sheets: [
          {
            name: "Data",
            rows: [
              {
                cells: [
                  { value: Number.NaN },
                ],
              },
            ],
          },
        ],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SpreadsheetValidationError);
      const validationError = error as SpreadsheetValidationError;
      expect(validationError.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: "sheets[0].rows[0].cells[0].value",
          code: "CELL_VALUE_NAN",
        }),
      ]));
    }

    try {
      validateSpreadsheetDocument({
        sheets: [
          {
            name: "Data",
            rows: [],
          },
          {
            name: "data",
            rows: [],
          },
        ],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SpreadsheetValidationError);
      const validationError = error as SpreadsheetValidationError;
      expect(validationError.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: "sheets",
          code: "SHEET_NAME_DUPLICATE",
        }),
      ]));
      return;
    }

    throw new Error("Expected validation to fail");
  });

  it("supports non-deterministic metadata timestamps when requested", async () => {
    const buffer = await SpreadsheetEngine.render(emptyWorkbook, { deterministic: false });
    const coreProps = await readZipEntry(buffer, "docProps/core.xml");
    expect(coreProps).not.toContain("2026-01-01T00:00:00Z");
  });

  it("bridges accessible title and language into workbook core properties", async () => {
    const buffer = await SpreadsheetEngine.render({
      accessible: {
        level: "AA",
        language: "en-US",
        title: "Accessible workbook",
      },
      sheets: [
        {
          name: "Sheet1",
          rows: [{ cells: [{ value: "Hello" }] }],
        },
      ],
    });
    const coreProps = await readZipEntry(buffer, "docProps/core.xml");

    expect(coreProps).toContain("<dc:title>Accessible workbook</dc:title>");
    expect(coreProps).toContain("<dc:language>en-US</dc:language>");
  });

  it("returns render metrics and chunk instrumentation for Phase 4 planning", async () => {
    const rendered = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "Metrics",
          rows: Array.from({ length: 250 }, (_unused, rowIndex) => ({
            cells: [
              { value: `row-${rowIndex}` },
              { value: `memo-${rowIndex}` },
              { value: rowIndex },
            ],
          })),
        },
      ],
    }, {
      rowChunkSize: 100,
      stringStrategy: "inlineStrings",
    });

    expect(rendered.buffer.length).toBeGreaterThan(0);
    expect(rendered.plan.rowChunkSize).toBe(100);
    expect(rendered.plan.sheetPlans[0]?.chunkCount).toBe(3);
    expect(rendered.metrics).toMatchObject({
      stringStrategy: "inlineStrings",
      totalRowsWritten: 250,
      totalSerializedRows: 250,
      totalCellsWritten: 750,
      outputSizeBytes: rendered.buffer.length,
    });
    expect(rendered.metrics.outputSizeDeltaBytes).toBe(rendered.buffer.length - rendered.metrics.estimatedZipSizeBytes);
    expect(rendered.metrics.sheetMetrics).toHaveLength(1);
    expect(rendered.metrics.sheetMetrics[0]?.chunkMetrics.map((chunk) => chunk.sourceRowCount)).toEqual([100, 100, 50]);
    expect(rendered.metrics.partMetrics.map((part) => part.path)).toEqual(rendered.plan.partManifest.map((part) => part.path));
    expect(rendered.metrics.partMetrics.find((part) => part.path === "xl/worksheets/sheet1.xml")?.byteLength).toBeGreaterThan(0);
    expect(rendered.metrics.partMetrics.find((part) => part.path === "[Content_Types].xml")?.stage).toBe("smallPart");
    expect(rendered.metrics.zipFinalizationTimeMs).toBeGreaterThanOrEqual(0);
    expect(rendered.metrics.keyPartBytes.sheet1XmlCompressedBytes).toBeGreaterThan(0);
    expect(rendered.metrics.keyPartBytes.stylesXmlCompressedBytes).toBeGreaterThan(0);
    expect(rendered.metrics.keyPartBytes.sharedStringsXmlCompressedBytes).toBe(0);
    expect(rendered.metrics.keyPartBytes.sheet1XmlZipContributionBytes).toBeGreaterThan(0);
    expect(rendered.metrics.keyPartBytes.stylesXmlZipContributionBytes).toBeGreaterThan(0);
    expect(rendered.metrics.keyPartBytes.otherZipContributionBytes).toBeGreaterThan(0);
    expect(
      (rendered.metrics.keyPartBytes.sheet1XmlZipContributionBytes ?? 0)
      + (rendered.metrics.keyPartBytes.stylesXmlZipContributionBytes ?? 0)
      + (rendered.metrics.keyPartBytes.sharedStringsXmlZipContributionBytes ?? 0)
      + (rendered.metrics.keyPartBytes.otherZipContributionBytes ?? 0),
    ).toBe(rendered.metrics.outputSizeBytes);
  });

  it("reports compressed part attribution for styled workbooks", async () => {
    const rendered = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "StyledMetrics",
          rows: Array.from({ length: 120 }, (_unused, rowIndex) => ({
            cells: Array.from({ length: 6 }, (_cellUnused, colIndex) => {
              const styleIndex = (rowIndex * 6 + colIndex) % 12;
              const style = {
                font: {
                  bold: styleIndex % 2 === 0,
                  color: `#${(styleIndex * 123457).toString(16).padStart(6, "0").slice(-6)}`,
                },
                fill: {
                  color: `#${(styleIndex * 654321).toString(16).padStart(6, "0").slice(-6)}`,
                },
                numberFormat: colIndex % 3 === 0 ? "currency" : (colIndex % 3 === 1 ? "percentage:2" : "date"),
              } as const;

              if (colIndex % 3 === 0) {
                return { value: `row-${rowIndex}`, style };
              }
              if (colIndex % 3 === 1) {
                return { value: rowIndex * (colIndex + 1), style };
              }
              return { value: new Date(Date.UTC(2026, 0, (rowIndex % 28) + 1)), style };
            }),
          })),
        },
      ],
    });

    const keyPartBytes = rendered.metrics.keyPartBytes;

    expect(keyPartBytes.sharedStringsXmlCompressedBytes).toBeGreaterThan(0);
    expect(keyPartBytes.sheet1XmlZipContributionBytes).toBeGreaterThan(
      keyPartBytes.stylesXmlZipContributionBytes ?? 0,
    );
    expect(keyPartBytes.sheet1XmlZipContributionBytes).toBeGreaterThan(
      keyPartBytes.sharedStringsXmlZipContributionBytes ?? 0,
    );
    expect(
      (keyPartBytes.sheet1XmlZipContributionBytes ?? 0)
      + (keyPartBytes.stylesXmlZipContributionBytes ?? 0)
      + (keyPartBytes.sharedStringsXmlZipContributionBytes ?? 0)
      + (keyPartBytes.otherZipContributionBytes ?? 0),
    ).toBe(rendered.buffer.length);
  });
});
