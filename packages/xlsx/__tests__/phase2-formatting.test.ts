import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import { parseZipXml, readZipEntry } from "./helpers.js";

describe("Phase 2 formatting", () => {
  it("serializes styled cells, auto-formats dates, and preserves empty styled cells", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Styled",
          rows: [
            {
              cells: [
                { value: "Revenue", style: "header" },
                { value: "As Of", style: "header" },
              ],
            },
            {
              cells: [
                { value: 1234.5, style: "currency" },
                { value: new Date("2026-03-27T00:00:00.000Z") },
              ],
            },
            {
              cells: [
                { value: null, style: { fill: { color: "#FFC7CE" } } },
                { value: "wrapped text wrapped text wrapped text", style: { alignment: { wrapText: true } } },
              ],
            },
          ],
        },
      ],
    });

    const styles = await readZipEntry(buffer, "xl/styles.xml");
    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(styles).toContain("<numFmts");
    expect(styles).toContain('formatCode="yyyy-mm-dd"');
    expect(styles).toContain('formatCode="$#,##0.00"');
    expect(styles).toContain("<fills count=\"4\">");
    expect(styles).toContain("<cellXfs count=\"");
    expect(styles).toContain('<xf numFmtId="164" fontId="0" fillId="0" borderId="0"><alignment horizontal="right"/></xf>');
    expect(styles).toContain('<xf numFmtId="0" fontId="0" fillId="3" borderId="0"/>');

    expect(sheet).toContain('<c r="A1" t="s" s="1"><v>0</v></c>');
    expect(sheet).toContain('<c r="A2" s="2"><v>1234.5</v></c>');
    expect(sheet).toContain('r="B2" s="3"');
    expect(sheet).toContain('<c r="A3" s="4"/>');
    expect(sheet).toContain('customHeight="1"');
  });

  it("does not emit custom row height when wrapText content still fits on one line", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Wrap",
          rows: [
            {
              cells: [
                { value: "short", style: { alignment: { wrapText: true } } },
              ],
            },
          ],
        },
      ],
    });

    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(sheet).not.toContain('customHeight="1"');
    expect(sheet).toContain('<row r="1">');
  });

  it("reserves full line boxes for wrapped notes", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [{
        name: "Notes",
        columns: [{ width: 12 }],
        rows: [{ cells: [{
          value: "MES vendor API license unresolved",
          style: { alignment: { wrapText: true } },
        }] }],
      }],
    });

    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const rowHeight = /<row r="1" ht="([\d.]+)" customHeight="1"/u.exec(sheet)?.[1];
    expect(Number(rowHeight)).toBeGreaterThanOrEqual(48);
  });

  it("serializes rich text as inline strings with run-level formatting", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Rich",
          rows: [
            {
              cells: [
                {
                  value: [
                    { text: "Revenue: ", font: { bold: true } },
                    { text: "$420,000", font: { bold: true, color: "#006100" } },
                    { text: " (+21.4%)", font: { italic: true, color: "#666666" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const sharedStrings = await readZipEntry(buffer, "xl/sharedStrings.xml");

    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain("<rPr><b/><sz val=\"11\"/><rFont val=\"Calibri\"/></rPr>");
    expect(sheet).toContain('<color rgb="FF006100"/>');
    expect(sheet).toContain("<i/><sz val=\"11\"/><color rgb=\"FF666666\"/><rFont val=\"Calibri\"/>");
    expect(sharedStrings).not.toContain("Revenue:");
    expect(sharedStrings).not.toContain("$420,000");
  });

  it("serializes conditional formatting rules and differential formats", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "CF",
          conditionalFormatting: [
            {
              ref: "B2:B10",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "100000",
                  style: "success",
                },
                {
                  type: "colorScale",
                  scale: {
                    min: { type: "min", color: "#F8696B" },
                    mid: { type: "percentile", value: 50, color: "#FFEB84" },
                    max: { type: "max", color: "#63BE7B" },
                  },
                },
                {
                  type: "dataBar",
                  color: "#4472C4",
                  min: { type: "min" },
                  max: { type: "max" },
                },
                {
                  type: "top10",
                  rank: 5,
                  style: "warning",
                },
                {
                  type: "duplicateValues",
                  style: "error",
                },
              ],
            },
          ],
          rows: Array.from({ length: 10 }, (_unused, index) => ({
            cells: [
              { value: `Item ${index + 1}` },
              { value: (index + 1) * 25000 },
            ],
          })),
        },
      ],
    });

    const styles = await readZipEntry(buffer, "xl/styles.xml");
    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(styles).toContain("<dxfs count=\"3\">");
    expect(sheet).toContain('<conditionalFormatting sqref="B2:B10">');
    expect(sheet).toContain('type="cellIs" dxfId="0" priority="1" operator="greaterThan"');
    expect(sheet).toContain('type="colorScale" priority="2"');
    expect(sheet).toContain('type="dataBar" priority="3"');
    expect(sheet).toContain('type="top10" dxfId="1" priority="4" rank="5"');
    expect(sheet).toContain('type="duplicateValues" dxfId="2" priority="5"');
  });

  it("collapses contiguous explicit column definitions with the same width", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Cols",
          columns: [
            { width: 10 },
            { width: 10 },
            { width: 10 },
            { width: 20 },
          ],
          rows: [
            {
              cells: [
                { value: "A" },
                { value: "B" },
                { value: "C" },
                { value: "D" },
              ],
            },
          ],
        },
      ],
    });

    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(sheet).toContain('<col min="1" max="3" width="10" customWidth="1"/>');
    expect(sheet).toContain('<col min="4" max="4" width="20" customWidth="1"/>');
  });

  it("accepts preset shorthands and conditional formatting in validation output", async () => {
    const parsed = await SpreadsheetEngine.validate({
      sheets: [
        {
          name: "Validated",
          styling: {
            headerRow: "header",
            alternateRows: {
              even: "neutral",
            },
          },
          conditionalFormatting: [
            {
              ref: "A1:A2",
              rules: [
                {
                  type: "uniqueValues",
                  style: "warning",
                },
              ],
            },
          ],
          rows: [
            {
              cells: [
                { value: [{ text: "hello", font: { bold: true } }], style: "subheader" },
              ],
            },
          ],
        },
      ],
    });

    expect(parsed.sheets[0].styling?.headerRow).toBe("header");
    expect(parsed.sheets[0].conditionalFormatting?.[0]?.rules[0]?.type).toBe("uniqueValues");
  });
});
