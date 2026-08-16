import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Conditional formatting edge cases", () => {
  it("serializes all 6 rule types in a single sheet", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "AllRules",
          rows: Array.from({ length: 10 }, (_unused, i) => ({
            cells: [{ value: i + 1 }, { value: (i + 1) * 10 }],
          })),
          conditionalFormatting: [
            {
              ref: "A1:A10",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "5",
                  style: { font: { bold: true } },
                },
              ],
            },
            {
              ref: "B1:B10",
              rules: [
                {
                  type: "colorScale",
                  scale: {
                    min: { type: "min", color: "FF0000" },
                    max: { type: "max", color: "00FF00" },
                  },
                },
              ],
            },
            {
              ref: "A1:A10",
              rules: [
                {
                  type: "dataBar",
                  color: "0088FF",
                  min: { type: "min" },
                  max: { type: "max" },
                },
              ],
            },
            {
              ref: "B1:B10",
              rules: [
                {
                  type: "top10",
                  rank: 3,
                  style: { fill: { color: "FFFF00" } },
                },
              ],
            },
            {
              ref: "A1:A10",
              rules: [
                {
                  type: "duplicateValues",
                  style: { font: { color: "FF0000" } },
                },
              ],
            },
            {
              ref: "B1:B10",
              rules: [
                {
                  type: "uniqueValues",
                  style: { font: { italic: true } },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain("conditionalFormatting");
    expect(sheetXml).toContain("cellIs");
    expect(sheetXml).toContain("colorScale");
    expect(sheetXml).toContain("dataBar");
    expect(sheetXml).toContain("top10");
    expect(sheetXml).toContain("duplicateValues");
    expect(sheetXml).toContain("uniqueValues");

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("supports multiple rules on the same range", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "MultiRule",
          rows: [
            { cells: [{ value: 10 }] },
            { cells: [{ value: 20 }] },
            { cells: [{ value: 30 }] },
          ],
          conditionalFormatting: [
            {
              ref: "A1:A3",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "15",
                  style: { font: { bold: true } },
                },
                {
                  type: "cellIs",
                  operator: "lessThan",
                  formula: "25",
                  style: { font: { italic: true } },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    // Both rules should be under the same conditionalFormatting block
    expect(sheetXml).toContain('sqref="A1:A3"');
    // Both cfRule elements should exist
    const ruleMatches = sheetXml.match(/<cfRule/g);
    expect(ruleMatches?.length).toBeGreaterThanOrEqual(2);

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("combines conditional formatting with data validation on the same sheet", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Combined",
          rows: [
            { cells: [{ value: 5 }] },
            { cells: [{ value: 15 }] },
          ],
          dataValidations: [
            {
              ref: "A1:A2",
              type: "whole",
              operator: "between",
              formula1: "1",
              formula2: "100",
            },
          ],
          conditionalFormatting: [
            {
              ref: "A1:A2",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "10",
                  style: { fill: { color: "00FF00" } },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain("dataValidation");
    expect(sheetXml).toContain("conditionalFormatting");

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("handles overlapping conditional formatting ranges", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Overlap",
          rows: Array.from({ length: 5 }, (_unused, i) => ({
            cells: [{ value: (i + 1) * 10 }],
          })),
          conditionalFormatting: [
            {
              ref: "A1:A3",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "20",
                  style: { font: { bold: true } },
                },
              ],
            },
            {
              ref: "A2:A5",
              rules: [
                {
                  type: "colorScale",
                  scale: {
                    min: { type: "min", color: "FFFFFF" },
                    max: { type: "max", color: "0000FF" },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    // Both ranges should be present
    expect(sheetXml).toContain('sqref="A1:A3"');
    expect(sheetXml).toContain('sqref="A2:A5"');

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("applies conditional formatting style with font, fill, and border", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "FullStyle",
          rows: [{ cells: [{ value: 100 }] }],
          conditionalFormatting: [
            {
              ref: "A1",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "50",
                  style: {
                    font: { bold: true, color: "FF0000", size: 14 },
                    fill: { color: "FFFF00" },
                    border: {
                      top: { style: "thin", color: "000000" },
                      bottom: { style: "thick", color: "0000FF" },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    // The conditional formatting rule should reference a dxf style
    expect(sheetXml).toContain("cfRule");

    // The styles should contain a dxf entry for the conditional format
    const stylesXml = await readZipEntry(buffer, "xl/styles.xml");
    expect(stylesXml).toContain("<dxf>");
    expect(stylesXml).toContain("<b/>");

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });
});
