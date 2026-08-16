import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/spreadsheet-engine.js";
import { buildSharedSpreadsheetQualityReport } from "../src/quality/shared-quality.js";
import { validateAndRepairSpreadsheetBuffer } from "../src/quality/workbook-quality.js";
import { emptyWorkbook } from "./fixtures/phase1/index.js";

describe("SpreadsheetEngine.renderWithQuality", () => {
  it("returns workbook output and a shared quality report", async () => {
    const result = await SpreadsheetEngine.renderWithQuality(emptyWorkbook);

    expect(result.output).toBeInstanceOf(Buffer);
    expect(result.output.length).toBeGreaterThan(0);
    expect(result.quality.verdict).toMatch(/native_editable|editable_with_constraints|visual_fallback|rejected/);
    expect(Array.isArray(result.quality.findings)).toBe(true);
  });

  it("detects and repairs invalid worksheet names", async () => {
    const cleanBuffer = await SpreadsheetEngine.render({
      sheets: [
        { name: "Alpha", rows: [{ cells: [{ value: "broken" }] }] },
        { name: "Beta", rows: [{ cells: [{ value: "duplicate" }] }] },
      ],
    } as any);
    const zip = await JSZip.loadAsync(cleanBuffer);
    const workbookXml = await zip.file("xl/workbook.xml")!.async("string");
    zip.file(
      "xl/workbook.xml",
      workbookXml
        .replace('name="Alpha"', 'name="This sheet name is intentionally longer than thirty one characters"')
        .replace('name="Beta"', 'name="this sheet name is intentionally longer than thirty one characters"'),
    );

    const repaired = await validateAndRepairSpreadsheetBuffer(await zip.generateAsync({ type: "nodebuffer" }));
    const result = buildSharedSpreadsheetQualityReport(repaired, 7);
    const codes = result.findings.map((finding) => finding.code);
    expect(codes).toContain("XLSX_SHEET_NAME_INVALID");
    expect(codes).toContain("XLSX_DUPLICATE_SHEET_NAME");
    expect(result.autoFixesApplied).toBeGreaterThan(0);
    expect(result.repairLog.some((entry) => entry.finding === "XLSX_SHEET_NAME_INVALID")).toBe(true);
    expect(result.repairLog.some((entry) => entry.finding === "XLSX_DUPLICATE_SHEET_NAME")).toBe(true);
  });
});
