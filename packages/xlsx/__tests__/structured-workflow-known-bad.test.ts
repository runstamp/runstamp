import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  SpreadsheetEngine,
  importXlsxWorkflow,
  verifyXlsxWorkflow,
} from "../src/index.js";

describe("A02 known-bad fidelity control", () => {
  it("rejects undeclared formula and style loss", async () => {
    const original = await SpreadsheetEngine.render({
      sheets: [{
        name: "Financials",
        rows: [
          { cells: [{ value: "Total" }, { formula: { expression: "SUM(B2:B3)", cachedValue: 30 }, style: { font: { bold: true } } }] },
          { cells: [{ value: "A" }, { value: 10 }] },
          { cells: [{ value: "B" }, { value: 20 }] },
        ],
      }],
    }, { deterministic: true });
    const source = await importXlsxWorkflow(original, { artifactId: "known-bad" });
    const zip = await JSZip.loadAsync(original);
    const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    zip.file("xl/worksheets/sheet1.xml", sheet
      .replace("SUM(B2:B3)", "SUM(B2:B2)")
      .replace(/(<c r="B1") s="\d+"/, "$1"));
    const corrupted = await zip.generateAsync({ type: "nodebuffer" });
    const candidate = await importXlsxWorkflow(corrupted, { artifactId: "known-bad" });

    const verdict = verifyXlsxWorkflow(source, candidate, { allowedCells: [] });
    expect(verdict.status).toBe("FAIL");
    expect(verdict.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "XLSX_FORMULA_CHANGED",
      "XLSX_STYLE_CHANGED",
    ]));
  });
});
