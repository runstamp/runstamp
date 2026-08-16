/**
 * Root-entry capability surface for @runstamp/xlsx.
 *
 * This file used to assert the free/pro split: that repair and template helpers
 * were absent from the root entry and reachable only from `index-pro`. The split
 * is gone, so the assertion is inverted — every capability must be reachable from
 * the single published entry point.
 *
 * The FormulaEvaluator-null cases below are kept because that path is still real:
 * a document with no formulas skips the evaluator entirely.
 */
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { SpreadsheetEngine } from "../src/spreadsheet-engine.js";
import { serializeSheetChunks } from "../src/serializers/sheet-serializer.js";
import { SharedStringTable } from "../src/serializers/shared-strings.js";
import { StyleRegistry } from "../src/serializers/style-registry.js";
import { validateSpreadsheetDocument } from "../src/validation/spreadsheet-schema.js";
import type { SpreadsheetDocument } from "../src/types/spreadsheet-ast.js";

const BASIC_DOC: SpreadsheetDocument = {
  sheets: [{
    name: "Sheet1",
    rows: [
      { cells: [{ value: "Name" }, { value: "Amount" }] },
      { cells: [{ value: "Alice" }, { value: 100 }] },
      { cells: [{ value: "Bob" }, { value: 200 }] },
    ],
  }],
};

const FORMULA_DOC: SpreadsheetDocument = {
  sheets: [{
    name: "Sheet1",
    rows: [
      { cells: [{ value: 10 }, { value: 20 }] },
      { cells: [{ value: 30 }, { formula: "SUM(A1:A1)" }] },
    ],
  }],
};

describe("Free tier XLSX rendering", () => {
  it("renders a basic spreadsheet without FormulaEvaluator", async () => {
    const validated = validateSpreadsheetDocument(BASIC_DOC);
    const buffer = await SpreadsheetEngine.render(validated);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify it's a valid zip (XLSX is a zip)
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("xl/worksheets/sheet1.xml")).toBeTruthy();
    expect(zip.file("[Content_Types].xml")).toBeTruthy();

    // Verify content — strings are in shared string table
    const sharedStringsXml = await zip.file("xl/sharedStrings.xml")!.async("text");
    expect(sharedStringsXml).toContain("Alice");
    expect(sharedStringsXml).toContain("Bob");

    // Verify sheet has rows with cell references
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("text");
    expect(sheetXml).toContain('<row r="1">');
    expect(sheetXml).toContain('<row r="2">');
  });

  it("stores formulas without evaluating when FormulaEvaluator is null", () => {
    const validated = validateSpreadsheetDocument(FORMULA_DOC);
    const styleRegistry = new StyleRegistry(undefined);
    const sharedStrings = new SharedStringTable();

    const result = serializeSheetChunks(validated.sheets[0], {
      defaults: undefined,
      formulaEvaluator: null,
      rowChunkSize: 1000,
      sharedStrings,
      styleRegistry,
      selected: true,
      sheetIndex: 0,
      stringStrategy: "shared",
      tableBindings: [],
    });

    // Formula should be stored in XML
    const fullXml = result.prefix + result.rowChunks.map(c => c.xml).join("") + result.suffix;
    expect(fullXml).toContain("<f>SUM(A1:A1)</f>");

    // No cached value since evaluator is null — formula stored only
    expect(result.rowChunks.length).toBeGreaterThan(0);
  });



  it("keeps repair and template workflows on the stable SpreadsheetEngine surface", async () => {
    const root = await import("../src/index.ts");

    const stableMethods = new Map([
      ["repairSpreadsheetBuffer", "repair"],
      ["validateAndRepairSpreadsheetBuffer", "validateAndRepair"],
      ["parseTemplate", "parseTemplate"],
      ["inspectTemplate", "inspectTemplate"],
      ["assembleFromTemplate", "assembleFromTemplate"],
      ["assembleFromTemplateStream", "assembleFromTemplateStream"],
    ] as const);
    for (const [name, method] of stableMethods) {
      expect(name in root, `${name} leaked from the root entry`).toBe(false);
      expect(
        method in root.SpreadsheetEngine,
        `SpreadsheetEngine.${method} is missing`,
      ).toBe(true);
    }
    expect("validateSpreadsheetBuffer" in root).toBe(true);
  });
});
