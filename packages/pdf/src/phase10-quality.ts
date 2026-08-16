import type { PdfQualityReport } from "./phase10-types.js";
import { validatePdfBuffer } from "./phase10-validate.js";

export async function buildPdfQualityReport(buffer: Buffer): Promise<PdfQualityReport> {
  const validation = await validatePdfBuffer(buffer);
  const errorCount = validation.findings.filter((finding) => finding.severity === "error").length;
  const warningCount = validation.findings.filter((finding) => finding.severity === "warning").length;

  return {
    complianceLevel: validation.complianceLevel,
    findings: validation.findings,
    fontCount: validation.fontCount,
    imageCount: validation.imageCount,
    pageCount: validation.pageCount,
    projectedFileSizeBytes: buffer.length,
    signatureCount: validation.signatureCount,
    validation,
    verdict: errorCount > 0 ? "FAIL" : warningCount > 0 ? "WARN" : "PASS",
  };
}
