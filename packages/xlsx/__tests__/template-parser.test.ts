import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, SpreadsheetTemplateAssemblyError, SpreadsheetTemplateParseError } from "../src/index.js";
import { emptyWorkbook } from "./fixtures/phase1/index.js";
import { readZipEntry } from "./helpers.js";

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

describe("Template parser", () => {
  it("indexes generated workbooks and produces an inspection report", async () => {
    const buffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "KPIValue", ref: "Summary!$B$2" },
        { name: "DetailRow", ref: "Detail!$A$2:$C$2" },
      ],
      sheets: [
        {
          name: "Summary",
          mergedCells: ["A1:B1"],
          pageSetup: {
            printArea: "A1:B5",
            options: {
              gridLines: true,
            },
          },
          rows: [
            { cells: [{ value: "Revenue" }] },
            { cells: [{ value: "Total" }, { formula: "SUM(Detail!B2:B3)" }] },
          ],
        },
        {
          name: "Detail",
          dataValidations: [
            {
              ref: "B2:B10",
              type: "whole",
              operator: "greaterThan",
              formula1: "0",
            },
          ],
          conditionalFormatting: [
            {
              ref: "B2:B10",
              rules: [
                {
                  type: "top10",
                  rank: 1,
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
          rows: [
            { cells: [{ value: "Name" }, { value: "Amount" }, { value: "Link" }] },
            { cells: [{ value: "Alpha" }, { value: 100 }, { value: "Runstamp", hyperlink: "https://runstamp.com" }] },
            { cells: [{ value: "Beta" }, { value: 200 }, { value: "Docs" }] },
          ],
        },
      ],
    });

    const index = await SpreadsheetEngine.parseTemplate(buffer);
    const report = SpreadsheetEngine.inspectTemplate(index);

    expect(index.sheets).toHaveLength(2);
    expect(index.sheets[0]).toMatchObject({
      name: "Summary",
      path: "xl/worksheets/sheet1.xml",
      mergedRanges: ["A1:B1"],
      hasPrintSettings: true,
    });
    expect(index.sheets[1]).toMatchObject({
      name: "Detail",
      path: "xl/worksheets/sheet2.xml",
      dataValidationRefs: ["B2:B10"],
      conditionalFormattingRefs: ["B2:B10"],
    });
    expect(index.sheets[0]?.formulaCells).toEqual(["B2"]);
    expect(index.namedRanges.map((range) => range.name)).toEqual(expect.arrayContaining(["KPIValue", "DetailRow"]));
    expect(index.relationships.some((relationship) => relationship.source === "xl/worksheets/sheet2.xml" && relationship.external)).toBe(true);
    expect(index.styles.cellXfCount).toBeGreaterThanOrEqual(1);
    expect(index.preservedOpaqueParts).toEqual([]);
    expect(index.sanitization.actions).toEqual([]);

    expect(report.recommendedInjectionAnchors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: "KPIValue",
        kind: "namedRange",
      }),
      expect.objectContaining({
        label: "DetailRow",
        kind: "rowExpansion",
        sheetName: "Detail",
      }),
    ]));
    expect(report.rowTemplateDetectionHints).toEqual([
      expect.objectContaining({
        sheetName: "Detail",
        rowNumber: 2,
      }),
    ]);
  });

  it("strips unsafe template parts and preserves safe opaque parts in the inspection index", async () => {
    const baseBuffer = await SpreadsheetEngine.render(emptyWorkbook);
    const zip = await JSZip.loadAsync(baseBuffer);
    zip.file("xl/vbaProject.bin", Buffer.from("macro"));
    zip.file("xl/embeddings/oleObject1.bin", Buffer.from("embedding"));
    zip.file("docProps/custom.xml", "<Properties/>");

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const index = await SpreadsheetEngine.parseTemplate(buffer);

    expect(index.sanitization.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        disposition: "stripped",
        path: "xl/vbaProject.bin",
        category: "macro",
      }),
      expect.objectContaining({
        disposition: "stripped",
        path: "xl/embeddings/oleObject1.bin",
        category: "embedding",
      }),
      expect.objectContaining({
        disposition: "preserved",
        path: "docProps/custom.xml",
        category: "opaquePart",
      }),
    ]));
    expect(index.preservedOpaqueParts).toEqual([
      expect.objectContaining({
        path: "docProps/custom.xml",
      }),
    ]);
  });

  it("rejects encrypted templates before indexing", async () => {
    const baseBuffer = await SpreadsheetEngine.render(emptyWorkbook);
    const zip = await JSZip.loadAsync(baseBuffer);
    zip.file("EncryptedPackage", Buffer.from("encrypted"));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(SpreadsheetEngine.parseTemplate(buffer)).rejects.toBeInstanceOf(SpreadsheetTemplateParseError);

    try {
      await SpreadsheetEngine.parseTemplate(buffer);
    } catch (error) {
      const parseError = error as SpreadsheetTemplateParseError;
      expect(parseError.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "TEMPLATE_ENCRYPTED",
        }),
      ]));
      return;
    }

    throw new Error("Expected encrypted template parse to fail");
  });

  it("assembles clean templates with named-range and explicit cell injection", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "KPIValue", ref: "Summary!$B$2" },
        { name: "DetailBand", ref: "Detail!$A$2:$C$3" },
      ],
      sheets: [
        {
          name: "Summary",
          rows: [
            { cells: [{ value: "Metric" }, { value: "Value" }] },
            { cells: [{ value: "Revenue" }, { value: "placeholder", style: { font: { bold: true } } }] },
          ],
        },
        {
          name: "Detail",
          rows: [
            { cells: [{ value: "Name" }, { value: "Amount" }, { value: "Status" }] },
            { cells: [{ value: "old-a" }, { value: 1 }, { value: "old" }] },
            { cells: [{ value: "old-b" }, { value: 2 }, { value: "old" }] },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const assembled = await SpreadsheetEngine.assembleFromTemplate(template, {
      namedRanges: {
        KPIValue: 420000,
        DetailBand: {
          values: [
            ["Alpha", 100, "Open"],
            ["Beta", 250, "Closed"],
          ],
        },
      },
      cells: {
        Detail: {
          C2: "Updated",
        },
      },
    });

    const summary = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");
    const detail = await readZipEntry(assembled, "xl/worksheets/sheet2.xml");

    expect(summary).toContain('<c r="B2" s="1"><v>420000</v></c>');
    expect(detail).toContain('<c r="A2" t="inlineStr"><is><t>Alpha</t></is></c>');
    expect(detail).toContain('<c r="B2"><v>100</v></c>');
    expect(detail).toContain('<c r="C2" t="inlineStr"><is><t>Updated</t></is></c>');
    expect(detail).toContain('<c r="A3" t="inlineStr"><is><t>Beta</t></is></c>');
    expect(detail).toContain('<c r="C3" t="inlineStr"><is><t>Closed</t></is></c>');
  });

  it("assembles office-marker spreadsheet templates with single-row loops and conditionals", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Invoice",
          rows: [
            { cells: [{ value: "Invoice" }, { value: "{d.invoiceNumber}" }] },
            { cells: [{ value: "{d.items:start}{d.name}{d.items:end}" }, { value: "{d.items:start}{d.amount:format(0.00)}{d.items:end}" }] },
            { cells: [{ value: "{d.showNote:if}Note{d.showNote:endif}" }, { value: "{d.showNote:if}{d.note}{d.showNote:endif}" }] },
            { cells: [{ value: "Footer" }, { value: "Thanks" }] },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const assembled = await SpreadsheetEngine.assembleFromTemplate(
      template,
      {
        officeData: {
          invoiceNumber: "INV-204",
          items: [
            { amount: 12.5, name: "Paper" },
            { amount: 7, name: "Ink" },
          ],
          note: "rush",
          showNote: false,
        },
      },
      { syntax: "office" },
    );

    const sheetXml = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('<c r="B1" t="inlineStr"><is><t>INV-204</t></is></c>');
    expect(sheetXml).toContain('<c r="A2" t="inlineStr"><is><t>Paper</t></is></c>');
    expect(sheetXml).toContain('<c r="B2" t="inlineStr"><is><t>12.50</t></is></c>');
    expect(sheetXml).toContain('<c r="A3" t="inlineStr"><is><t>Ink</t></is></c>');
    expect(sheetXml).toContain('<c r="B3" t="inlineStr"><is><t>7.00</t></is></c>');
    expect(sheetXml).not.toContain("rush");
    expect(sheetXml).toContain('<row r="4"><c r="A4"');
    expect(sheetXml).toContain('<c r="B4"');
  });

  it("streams assembled templates as valid workbook output", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "KPIValue", ref: "Summary!$B$2" },
      ],
      sheets: [
        {
          name: "Summary",
          rows: [
            { cells: [{ value: "Metric" }, { value: "Value" }] },
            { cells: [{ value: "Revenue" }, { value: "placeholder" }] },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const stream = await SpreadsheetEngine.assembleFromTemplateStream(template, {
      namedRanges: {
        KPIValue: 420000,
      },
    });
    const assembled = await streamToBuffer(stream);
    const summary = await SpreadsheetEngine.validate(assembled);

    expect(summary.verdict).toBe("clean");
  });

  it("rejects assembly for templates that required stripping unsafe parts", async () => {
    const baseBuffer = await SpreadsheetEngine.render(emptyWorkbook);
    const zip = await JSZip.loadAsync(baseBuffer);
    zip.file("xl/vbaProject.bin", Buffer.from("macro"));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const template = await SpreadsheetEngine.parseTemplate(buffer);

    await expect(SpreadsheetEngine.assembleFromTemplate(template, {
      cells: {
        Empty: {
          A1: "safe",
        },
      },
    })).rejects.toBeInstanceOf(SpreadsheetTemplateAssemblyError);
  });

  it("expands single-row template anchors and shifts dependent worksheet/workbook refs", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "DetailRow", ref: "Detail!$A$2:$A$2" },
      ],
      sheets: [
        {
          name: "Detail",
          dataValidations: [
            {
              ref: "A2:A2",
              type: "whole",
              operator: "greaterThan",
              formula1: "0",
            },
          ],
          conditionalFormatting: [
            {
              ref: "A2:A2",
              rules: [
                {
                  type: "top10",
                  rank: 1,
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
          pageSetup: {
            printArea: "A1:C4",
          },
          rows: [
            { cells: [{ value: "Name" }, { value: "Amount" }, { value: "Status" }] },
            { cells: [{ value: "template" }, { value: "merged", colSpan: 2 }] },
            { cells: [{ value: "Footer" }, { formula: "=A4" }, { value: "Tail" }] },
            { cells: [{ value: "Moved" }, { value: 99 }, { value: "Static" }] },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const assembled = await SpreadsheetEngine.assembleFromTemplate(template, {
      rowExpansions: {
        DetailRow: {
          rows: [
            ["Alpha"],
            ["Beta"],
            ["Gamma"],
          ],
        },
      },
    });

    const detail = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");
    const workbook = await readZipEntry(assembled, "xl/workbook.xml");

    expect(detail).toContain('<dimension ref="A1:C6"></dimension>');
    expect(detail).toContain('<row r="2"><c r="A2" t="inlineStr"><is><t>Alpha</t></is></c>');
    expect(detail).toContain('<row r="4"><c r="A4" t="inlineStr"><is><t>Gamma</t></is></c>');
    expect(detail).toContain('<row r="5">');
    expect(detail).toContain('<c r="B5"><f>A6</f></c>');
    expect(detail).toContain('<mergeCells count="3"><mergeCell ref="B2:C2"></mergeCell><mergeCell ref="B3:C3"></mergeCell><mergeCell ref="B4:C4"></mergeCell></mergeCells>');
    expect(detail).toContain('dataValidation sqref="A2:A4"');
    expect(detail).toContain('conditionalFormatting sqref="A2:A4"');
    expect(workbook).toContain('Detail!A2:A4');
    expect(workbook).toContain('Detail!$A$1:$C$6');
  });

  it("copies formula-bearing template rows with row-relative offsets and cleared cached values", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "DetailRow", ref: "Detail!$A$2:$A$2" },
      ],
      sheets: [
        {
          name: "Detail",
          rows: [
            { cells: [{ value: "Name" }, { value: "Echo" }, { value: "Pinned" }] },
            { cells: [{ value: "template" }, { formula: "=A2" }, { formula: "=$A$2" }] },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const assembled = await SpreadsheetEngine.assembleFromTemplate(template, {
      rowExpansions: {
        DetailRow: {
          rows: [
            ["Alpha"],
            ["Beta"],
            ["Gamma"],
          ],
        },
      },
    });

    const detail = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");

    expect(detail).toContain('<c r="A2" t="inlineStr"><is><t>Alpha</t></is></c>');
    expect(detail).toContain('<c r="B2"><f>A2</f></c>');
    expect(detail).toContain('<c r="C2"><f>$A$2</f></c>');
    expect(detail).toContain('<c r="A3" t="inlineStr"><is><t>Beta</t></is></c>');
    expect(detail).toContain('<c r="B3"><f>A3</f></c>');
    expect(detail).toContain('<c r="C3"><f>$A$2</f></c>');
    expect(detail).toContain('<c r="A4" t="inlineStr"><is><t>Gamma</t></is></c>');
    expect(detail).toContain('<c r="B4"><f>A4</f></c>');
    expect(detail).not.toContain("<v>template</v>");
  });

  it("supports multiple row-expansion anchors on the same sheet in bottom-up order", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "TopRow", ref: "Detail!$A$2:$A$2" },
        { name: "BottomRow", ref: "Detail!$A$4:$A$4" },
      ],
      sheets: [
        {
          name: "Detail",
          rows: [
            { cells: [{ value: "Name" }] },
            { cells: [{ value: "top-template" }] },
            { cells: [{ value: "Spacer" }] },
            { cells: [{ value: "bottom-template" }] },
            { cells: [{ value: "Footer" }] },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const assembled = await SpreadsheetEngine.assembleFromTemplate(template, {
      rowExpansions: {
        TopRow: {
          rows: [
            ["Alpha"],
            ["Beta"],
          ],
        },
        BottomRow: {
          rows: [
            ["One"],
            ["Two"],
            ["Three"],
          ],
        },
      },
    });

    const detail = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");
    const workbook = await readZipEntry(assembled, "xl/workbook.xml");

    expect(detail).toContain('<dimension ref="A1:A8"></dimension>');
    expect(detail).toContain('<row r="2"><c r="A2" t="inlineStr"><is><t>Alpha</t></is></c></row>');
    expect(detail).toContain('<row r="3"><c r="A3" t="inlineStr"><is><t>Beta</t></is></c></row>');
    expect(detail).toContain('<row r="4"><c r="A4" t="s"><v>2</v></c></row>');
    expect(detail).toContain('<row r="5"><c r="A5" t="inlineStr"><is><t>One</t></is></c></row>');
    expect(detail).toContain('<row r="7"><c r="A7" t="inlineStr"><is><t>Three</t></is></c></row>');
    expect(detail).toContain('<row r="8"><c r="A8" t="s"><v>4</v></c></row>');
    expect(workbook).toContain('TopRow">Detail!A2:A3<');
    expect(workbook).toContain('BottomRow">Detail!A5:A7<');
  });

  it("shifts existing template table ranges during row expansion", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "DetailRow", ref: "Detail!$A$2:$B$2" },
      ],
      sheets: [
        {
          name: "Detail",
          rows: [
            { cells: [{ value: "Name" }, { value: "Amount" }] },
            { cells: [{ value: "template" }, { value: 10 }] },
            { cells: [{ value: "tail" }, { value: 20 }] },
            { cells: [{ value: null }, { value: null }] },
          ],
          tables: [
            {
              name: "DetailTable",
              ref: "A1:B4",
              totalsRow: true,
              columns: [
                { totalsRowLabel: "Total" },
                { totalsRowFunction: "sum" },
              ],
            },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const assembled = await SpreadsheetEngine.assembleFromTemplate(template, {
      rowExpansions: {
        DetailRow: {
          rows: [
            ["Alpha", 100],
            ["Beta", 200],
            ["Gamma", 300],
          ],
        },
      },
    });

    const tableXml = await readZipEntry(assembled, "xl/tables/table1.xml");
    const sheetXml = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");

    expect(tableXml).toContain('ref="A1:B6"');
    expect(tableXml).toContain('<autoFilter ref="A1:B5"></autoFilter>');
    expect(sheetXml).toContain('<dimension ref="A1:B6"></dimension>');
  });

  it("preserves template formulas inside the expansion anchor and expands downstream totals", async () => {
    const templateBuffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "LineItems", ref: "Invoice!$A$4:$D$4" },
      ],
      sheets: [
        {
          name: "Invoice",
          rows: [
            { cells: [{ value: "Customer" }, { value: "Acme Co" }] },
            { cells: [{ value: "Prepared" }, { value: new Date(Date.UTC(2026, 2, 28)) }] },
            { cells: [{ value: "Item" }, { value: "Qty" }, { value: "Price" }, { value: "Total" }] },
            { cells: [{ value: "Starter" }, { value: 1 }, { value: 10 }, { formula: "B4*C4" }] },
            { cells: [{ value: "Grand Total" }, { value: null }, { value: null }, { formula: "SUM(D4:D4)" }] },
          ],
          tables: [
            {
              name: "InvoiceTable",
              ref: "A3:D4",
              columns: [{}, {}, {}, {}],
            },
          ],
        },
      ],
    });

    const template = await SpreadsheetEngine.parseTemplate(templateBuffer);
    const assembled = await SpreadsheetEngine.assembleFromTemplate(template, {
      rowExpansions: {
        LineItems: {
          rows: [
            ["Starter", 1, 10, undefined],
            ["Growth", 2, 25, undefined],
            ["Enterprise", 1, 80, undefined],
          ],
        },
      },
    });

    const sheetXml = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");
    const tableXml = await readZipEntry(assembled, "xl/tables/table1.xml");
    const validation = await SpreadsheetEngine.validate(assembled);

    expect(sheetXml).toContain('<c r="D4"><f>B4*C4</f></c>');
    expect(sheetXml).toContain('<c r="D5"><f>B5*C5</f></c>');
    expect(sheetXml).toContain('<c r="D6"><f>B6*C6</f></c>');
    expect(sheetXml).toContain('<c r="D7"><f>SUM(D4:D6)</f></c>');
    expect(tableXml).toContain('ref="A3:D6"');
    expect(validation.verdict).toBe("warnings");
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
          location: expect.objectContaining({ cellRef: "D4" }),
        }),
        expect.objectContaining({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
          location: expect.objectContaining({ cellRef: "D7" }),
        }),
      ]),
    );
  });
});
