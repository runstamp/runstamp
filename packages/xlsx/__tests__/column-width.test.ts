import { describe, expect, it } from "vitest";
import {
  estimateCharacterWidth,
  estimateHeuristicColumnWidth,
} from "../src/layout/column-width.js";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";
import { parseZipXml } from "./helpers.js";

describe("estimateCharacterWidth", () => {
  it("ASCII character returns base width 1.0", () => {
    expect(estimateCharacterWidth("A", false)).toBe(1.0);
    expect(estimateCharacterWidth("z", false)).toBe(1.0);
    expect(estimateCharacterWidth("5", false)).toBe(1.0);
  });

  it("CJK character returns ~1.8x width", () => {
    // U+4E2D (中) is in U+4E00-U+9FFF range
    expect(estimateCharacterWidth("中", false)).toBe(1.8);
    // U+6587 (文) is in the CJK range
    expect(estimateCharacterWidth("文", false)).toBe(1.8);
  });

  it("bold text applies 1.05x multiplier", () => {
    expect(estimateCharacterWidth("A", true)).toBeCloseTo(1.05, 5);
    expect(estimateCharacterWidth("中", true)).toBeCloseTo(1.8 * 1.05, 5);
  });
});

describe("estimateHeuristicColumnWidth", () => {
  it("ASCII string produces a reasonable width", () => {
    const width = estimateHeuristicColumnWidth("Hello World", undefined);
    expect(width).toBeDefined();
    // 11 chars * 1.15 coefficient + 2 padding ≈ 14.65
    expect(width!).toBeGreaterThan(10);
    expect(width!).toBeLessThan(20);
  });

  it("CJK characters produce wider columns than equivalent-length ASCII", () => {
    const asciiWidth = estimateHeuristicColumnWidth("ABCDE", undefined);
    const cjkWidth = estimateHeuristicColumnWidth("中文字体五", undefined);
    expect(asciiWidth).toBeDefined();
    expect(cjkWidth).toBeDefined();
    // Same character count but CJK should be wider
    expect(cjkWidth!).toBeGreaterThan(asciiWidth!);
  });

  it("mixed ASCII/CJK string accounts for both widths", () => {
    const pureAscii = estimateHeuristicColumnWidth("Hello", undefined);
    const mixed = estimateHeuristicColumnWidth("Hi中文!", undefined);
    expect(pureAscii).toBeDefined();
    expect(mixed).toBeDefined();
    // "Hi中文!" = 2 ASCII + 2 CJK + 1 ASCII = 2+3.6+1 = 6.6 char widths
    // "Hello" = 5 ASCII = 5 char widths
    // mixed should be wider despite same or fewer total characters
    expect(mixed!).toBeGreaterThan(pureAscii!);
  });

  it("bold text produces slightly wider width", () => {
    const normal = estimateHeuristicColumnWidth("Test String", undefined);
    const bold = estimateHeuristicColumnWidth("Test String", { font: { bold: true } });
    expect(normal).toBeDefined();
    expect(bold).toBeDefined();
    expect(bold!).toBeGreaterThan(normal!);
  });

  it("very long string is capped at 255", () => {
    const longString = "A".repeat(500);
    const width = estimateHeuristicColumnWidth(longString, undefined);
    expect(width).toBeDefined();
    expect(width!).toBe(255);
  });

  it("explicit column width overrides heuristic", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Sheet1",
          columns: [{ width: 42 }],
          rows: [
            {
              cells: [
                { value: "A very long string that would normally produce a wide auto-width" },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await parseZipXml(buffer, "xl/worksheets/sheet1.xml");
    const cols = sheetXml?.worksheet?.cols?.col;
    const col = Array.isArray(cols) ? cols[0] : cols;
    expect(Number(col?.["@_width"])).toBe(42);
  });

  it("shrinks an overflowing numeric display instead of emitting hashes in Excel", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Forecast",
        columns: [{ width: 8.5 }],
        rows: [{ cells: [{
          value: 12_345_678,
          style: { numberFormat: "$#,##0" },
        }] }],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await parseZipXml(buffer, "xl/worksheets/sheet1.xml");
    const stylesXml = await parseZipXml(buffer, "xl/styles.xml");
    const cell = sheetXml?.worksheet?.sheetData?.row?.c;
    const styleIndex = Number(cell?.["@_s"]);
    const xfs = stylesXml?.styleSheet?.cellXfs?.xf;
    const xf = Array.isArray(xfs) ? xfs[styleIndex] : xfs;
    expect(xf?.alignment?.["@_shrinkToFit"]).toBe("1");
  });

  it("wraps materially overflowing text in explicit-width table columns", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Escalations",
        columns: [{ width: 18 }, { width: 14 }],
        pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
        rows: Array.from({ length: 10 }, () => ({ cells: [
          { value: "Invoice PDF renders blank for consolidated billing accounts" },
          { value: "Pending engineering" },
        ] })),
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await parseZipXml(buffer, "xl/worksheets/sheet1.xml");
    const stylesXml = await parseZipXml(buffer, "xl/styles.xml");
    const rows = sheetXml?.worksheet?.sheetData?.row;
    const firstRow = Array.isArray(rows) ? rows[0] : rows;
    const cells = firstRow?.c;
    const firstCell = Array.isArray(cells) ? cells[0] : cells;
    const styleIndex = Number(firstCell?.["@_s"]);
    const xfs = stylesXml?.styleSheet?.cellXfs?.xf;
    const xf = Array.isArray(xfs) ? xfs[styleIndex] : xfs;
    expect(xf?.alignment?.["@_wrapText"]).toBe("1");
    expect(Number(firstRow?.["@_ht"])).toBeGreaterThan(15);
    expect(sheetXml?.worksheet?.pageSetup?.["@_fitToHeight"]).toBe("1");
    const cols = sheetXml?.worksheet?.cols?.col;
    const firstColumn = Array.isArray(cols) ? cols[0] : cols;
    expect(Number(firstColumn?.["@_width"])).toBeCloseTo(27.9);
  });

  it("does not emit implicit auto-width columns unless bestFit is requested", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Sheet1",
          rows: [
            {
              cells: [
                { value: "A very long string that used to trigger implicit auto-width output" },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await parseZipXml(buffer, "xl/worksheets/sheet1.xml");
    expect(sheetXml?.worksheet?.cols).toBeUndefined();
  });

  it("emits auto-width columns when bestFit is explicitly requested", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Sheet1",
          columns: [{ bestFit: true }],
          rows: [
            {
              cells: [
                { value: "A very long string that should drive bestFit width output" },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await parseZipXml(buffer, "xl/worksheets/sheet1.xml");
    const cols = sheetXml?.worksheet?.cols?.col;
    const col = Array.isArray(cols) ? cols[0] : cols;
    expect(Number(col?.["@_width"])).toBeGreaterThan(8.43);
    expect(col?.["@_bestFit"]).toBe("1");
  });
});
