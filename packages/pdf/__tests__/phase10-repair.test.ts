import { PdfEngine } from "../src/engine.js";
import {
  corruptXrefTable,
  createPhase10SigningDocument,
  injectQualityDefects,
} from "../scripts/phase10-fixtures.js";

describe("Phase 10 repair and quality", () => {
  it("repairs an intentionally corrupted xref table", async () => {
    const clean = await PdfEngine.render(createPhase10SigningDocument());
    const corrupted = corruptXrefTable(clean);
    const repaired = await PdfEngine.repair(corrupted);
    const validation = await PdfEngine.validate(repaired.buffer);

    expect(repaired.repaired).toBe(true);
    expect(repaired.actions.some((action) => action.code === "XREF_OFFSET_MISMATCH")).toBe(true);
    expect(validation.findings.some((finding) => finding.code === "XREF_OFFSET_MISMATCH")).toBe(false);
  });

  it("reports all injected quality defects", async () => {
    const clean = await PdfEngine.render(createPhase10SigningDocument());
    const defective = injectQualityDefects(clean);
    const quality = await PdfEngine.quality(defective.buffer);

    expect(defective.expectedCodes.every((code) => quality.findings.some((finding) => finding.code === code))).toBe(true);
    expect(quality.verdict).toBe("FAIL");
  });
});
