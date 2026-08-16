import { describe, expect, it } from "vitest";

import { SpreadsheetEngine, validateXlsxStructure } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

function makeConcurrentWorkbook(sheetCount: number): SpreadsheetDocument {
  return {
    meta: {
      title: `Concurrent workbook ${sheetCount}`,
      creator: "Concurrency Suite",
    },
    sheets: Array.from({ length: sheetCount }, (_unused, index) => ({
      name: `Sheet${index + 1}`,
      rows: [
        { cells: [{ value: "Sheet" }, { value: "Value" }, { value: "Double" }] },
        { cells: [{ value: index + 1 }, { value: (index + 1) * 10 }, { formula: `B2*2` }] },
        { cells: [{ value: `note-${index + 1}` }, { value: true }, { value: new Date(Date.UTC(2026, 0, (index % 28) + 1)) }] },
      ],
    })),
  };
}

describe("Concurrent rendering", () => {
  it("renders 10 simultaneous 100-sheet workbooks without structural drift or state leakage", async () => {
    const document = makeConcurrentWorkbook(100);

    const outputs = await Promise.all(
      Array.from({ length: 10 }, () => SpreadsheetEngine.render(document, { deterministic: true })),
    );

    const structuralResults = await Promise.all(outputs.map((buffer) => validateXlsxStructure(buffer)));
    for (const result of structuralResults) {
      expect(result.passed).toBe(true);
    }

    const validationResults = await Promise.all(outputs.map((buffer) => SpreadsheetEngine.validate(buffer)));
    for (const result of validationResults) {
      expect(result.verdict).toBe("clean");
    }

    const baselineWorkbookXml = await readZipEntry(outputs[0]!, "xl/workbook.xml");
    const baselineLastSheetXml = await readZipEntry(outputs[0]!, "xl/worksheets/sheet100.xml");
    expect(baselineWorkbookXml).toContain('sheet name="Sheet100"');
    expect(baselineLastSheetXml).toContain('r="3"');

    for (const buffer of outputs.slice(1)) {
      const [workbookXml, lastSheetXml] = await Promise.all([
        readZipEntry(buffer, "xl/workbook.xml"),
        readZipEntry(buffer, "xl/worksheets/sheet100.xml"),
      ]);
      expect(workbookXml).toBe(baselineWorkbookXml);
      expect(lastSheetXml).toBe(baselineLastSheetXml);
    }
  }, 90_000);
});
