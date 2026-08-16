import { describe, expect, it } from "vitest";
import { diffSpreadsheetDocuments } from "../src/diff/document-diff.js";
import type { SpreadsheetDocument } from "../src/types/spreadsheet-ast.js";

describe("diffSpreadsheetDocuments", () => {
  it("returns no changes for identical workbooks", () => {
    const workbook: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Hello" }] }],
      }],
    };

    const result = diffSpreadsheetDocuments(workbook, workbook);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBe("No changes");
  });

  it("reports cell value changes with cell references", () => {
    const before: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [
          { cells: [{ value: "Header" }] },
          { cells: [{ value: 10 }] },
        ],
      }],
    };
    const after: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [
          { cells: [{ value: "Header" }] },
          { cells: [{ value: 20 }] },
        ],
      }],
    };

    const result = diffSpreadsheetDocuments(before, after);

    expect(result.changes[0]?.description).toBe('Cell A2 changed in "Sheet1"');
    expect(result.summary).toContain("1 cell modified");
  });

  it("reports row additions semantically", () => {
    const before: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [
          { cells: [{ value: "Header" }] },
          { cells: [{ value: "A" }] },
        ],
      }],
    };
    const after: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [
          { cells: [{ value: "Header" }] },
          { cells: [{ value: "A" }] },
          { cells: [{ value: "B" }] },
        ],
      }],
    };

    const result = diffSpreadsheetDocuments(before, after);

    expect(result.changes[0]?.description).toBe('Row 3 added in "Sheet1"');
    expect(result.summary).toContain("1 row added");
  });

  it("reports merged range changes once", () => {
    const before: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Merged" }] }],
      }],
    };
    const after: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Merged" }] }],
        mergedCells: ["A1:B1"],
      }],
    };

    const result = diffSpreadsheetDocuments(before, after);

    expect(result.changes[0]?.description).toBe('Merged range A1:B1 added in "Sheet1"');
    expect(result.summary).toContain("1 merged range added");
  });
});
