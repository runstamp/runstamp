import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { validateAndRepairPdfBuffer } from "../src/phase10-repair.js";
import { buildSharedPdfQualityReport } from "../src/shared-quality.js";

describe("PdfEngine.renderWithQuality", () => {
  it("returns PDF output and a shared quality report", async () => {
    const result = await PdfEngine.renderWithQuality({
      pages: [{ text: { value: "Hello quality" } }],
    });

    expect(result.output).toBeInstanceOf(Buffer);
    expect(result.output.length).toBeGreaterThan(0);
    expect(result.quality.verdict).toMatch(/native_editable|editable_with_constraints|visual_fallback|rejected/);
    expect(Array.isArray(result.quality.findings)).toBe(true);
  });

  it("maps missing EOF markers into the shared quality model and repair log", async () => {
    const pdf = await PdfEngine.render({
      pages: [{ text: { value: "Missing EOF" } }],
    });
    const truncated = Buffer.from(pdf.toString("latin1").replace(/%%EOF\s*$/, ""), "latin1");
    const repaired = await validateAndRepairPdfBuffer(truncated);
    const report = buildSharedPdfQualityReport(repaired, 4);

    expect(report.findings.some((finding) => finding.code === "PDF_EOF_MARKER_MISSING")).toBe(true);
    expect(report.autoFixesApplied).toBeGreaterThan(0);
    expect(report.repairLog.some((entry) => entry.finding === "PDF_EOF_MARKER_MISSING")).toBe(true);
    expect(report.findings.every((finding) => finding.pageIndex === undefined)).toBe(true);
  });
});
