import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { SpreadsheetEngine } from "../src/spreadsheet-engine.js";
import { lintSpreadsheetDocument } from "../src/quality/lint.js";
import { validateSpreadsheetDocument } from "../src/validation/spreadsheet-schema.js";
import type { SpreadsheetDocument } from "../src/types/spreadsheet-ast.js";

function baseSheet(name = "Sheet1") {
  return {
    name,
    rows: [
      { cells: [{ value: 10 }, { value: 20 }, { value: 30 }] },
      { cells: [{ value: 40 }, { value: 50 }, { value: 60 }] },
      { cells: [{ value: 70 }, { value: 80 }, { value: 90 }] },
    ],
  };
}

describe("WP4.1 — cellIs tuple formula", () => {
  it("accepts a [lower, upper] tuple for between", () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          ...baseSheet(),
          conditionalFormatting: [
            {
              ref: "A1:A3",
              rules: [
                {
                  type: "cellIs",
                  operator: "between",
                  formula: ["10", "50"],
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => validateSpreadsheetDocument(doc)).not.toThrow();
  });

  it("rejects a single string formula for between", () => {
    const doc = {
      sheets: [
        {
          ...baseSheet(),
          conditionalFormatting: [
            {
              ref: "A1:A3",
              rules: [
                {
                  type: "cellIs",
                  operator: "between",
                  formula: "10",
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => validateSpreadsheetDocument(doc as never)).toThrow();
  });

  it("rejects a tuple formula for greaterThan (single-formula operator)", () => {
    const doc = {
      sheets: [
        {
          ...baseSheet(),
          conditionalFormatting: [
            {
              ref: "A1:A3",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: ["10", "50"],
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => validateSpreadsheetDocument(doc as never)).toThrow();
  });

  it("emits two <formula> children for a between rule", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          ...baseSheet(),
          conditionalFormatting: [
            {
              ref: "A1:A3",
              rules: [
                {
                  type: "cellIs",
                  operator: "between",
                  formula: ["10", "50"],
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
        },
      ],
    };
    const buffer = await SpreadsheetEngine.render(doc, { deterministic: true });
    const zip = await JSZip.loadAsync(buffer);
    const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheet).toContain('operator="between"');
    expect(sheet).toMatch(/<formula>10<\/formula><formula>50<\/formula>/);
  });
});

describe("WP4.3 — SpreadsheetEngine.lint", () => {
  it("flags sheet name longer than 31 characters", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{ ...baseSheet("a".repeat(40)) }],
    };
    const result = SpreadsheetEngine.lint(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "XLSX_LINT_SHEET_NAME_TOO_LONG")).toBe(true);
  });

  it("flags illegal characters in sheet name", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{ ...baseSheet("Bad/Name") }],
    };
    const result = lintSpreadsheetDocument(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS")).toBe(true);
  });

  it("flags reserved sheet name 'History' case-insensitively", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{ ...baseSheet("history") }],
    };
    const result = lintSpreadsheetDocument(doc);
    expect(result.issues.some((i) => i.code === "XLSX_LINT_SHEET_NAME_RESERVED")).toBe(true);
  });

  it("flags duplicate sheet names case-insensitively", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{ ...baseSheet("Data") }, { ...baseSheet("DATA") }],
    };
    const result = lintSpreadsheetDocument(doc);
    expect(result.issues.some((i) => i.code === "XLSX_LINT_SHEET_NAME_DUPLICATE")).toBe(true);
  });

  it("flags autoFilter ref that extends past sheet bounds", () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          ...baseSheet(),
          autoFilter: { ref: "A1:Z9999" },
        },
      ],
    };
    const result = lintSpreadsheetDocument(doc);
    expect(result.issues.some((i) => i.code === "XLSX_LINT_AUTOFILTER_OUT_OF_BOUNDS")).toBe(true);
  });

  it("flags conditional-formatting ref that extends past sheet bounds", () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          ...baseSheet(),
          conditionalFormatting: [
            {
              ref: "A1:Z9999",
              rules: [
                {
                  type: "cellIs",
                  operator: "equal",
                  formula: "1",
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
        },
      ],
    };
    const result = lintSpreadsheetDocument(doc);
    expect(result.issues.some((i) => i.code === "XLSX_LINT_CF_REF_OUT_OF_BOUNDS")).toBe(true);
  });

  it("returns ok=true on a clean document", () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          ...baseSheet("Sales"),
          autoFilter: { ref: "A1:C3" },
          conditionalFormatting: [
            {
              ref: "A1:C3",
              rules: [
                {
                  type: "cellIs",
                  operator: "between",
                  formula: ["10", "100"],
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
        },
      ],
    };
    const result = lintSpreadsheetDocument(doc);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
