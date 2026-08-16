import JSZip from "jszip";
import type { QualityReport } from "./types.js";
import { collectContentIssues, summarizeCounts } from "./content.js";
import { applyDocxRepairs } from "./repair.js";
import { collectStructuralIssues } from "./structural.js";

function deriveVerdict(errorCount: number, warningCount: number, remainingErrors: number, fixesApplied: number) {
  if (remainingErrors > 0) {
    return fixesApplied > 0 ? "visual_fallback" : "rejected";
  }
  if (errorCount > 0 || warningCount > 0 || fixesApplied > 0) {
    return "editable_with_constraints";
  }
  return "native_editable";
}

export async function checkDocxQuality(
  buffer: Buffer,
  renderTimeMs: number,
): Promise<{ output: Buffer; quality: QualityReport }> {
  const zip = await JSZip.loadAsync(buffer);
  const initialStructuralIssues = await collectStructuralIssues(zip);
  const initialContentIssues = await collectContentIssues(zip);
  const initialIssues = [...initialStructuralIssues, ...initialContentIssues];
  const repairLog = await applyDocxRepairs(zip, initialIssues);
  const output = repairLog.length > 0
    ? await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
    : buffer;
  const repairedZip = repairLog.length > 0 ? await JSZip.loadAsync(output) : zip;
  const finalIssues = [
    ...(await collectStructuralIssues(repairedZip)),
    ...(await collectContentIssues(repairedZip)),
  ];
  const counts = summarizeCounts(finalIssues);
  const initialErrorCount = initialIssues.filter((issue) => issue.severity === "error").length;
  const initialWarningCount = initialIssues.filter((issue) => issue.severity === "warning").length;
  const finalErrorCount = finalIssues.filter((issue) => issue.severity === "error").length;
  const remainingKeys = new Set(finalIssues.map((issue) => `${issue.code}|${issue.message}|${issue.paragraphIndex ?? ""}`));
  const findings = initialIssues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    paragraphIndex: issue.paragraphIndex,
    nodeId: issue.nodeId,
    message: issue.message,
    autoFixed: !remainingKeys.has(`${issue.code}|${issue.message}|${issue.paragraphIndex ?? ""}`),
    repairDescription: !remainingKeys.has(`${issue.code}|${issue.message}|${issue.paragraphIndex ?? ""}`)
      ? repairLog.find((entry) => entry.finding === issue.code)?.description
      : undefined,
  }));

  return {
    output,
    quality: {
      verdict: deriveVerdict(initialErrorCount, initialWarningCount, finalErrorCount, repairLog.length),
      repairRisk: finalErrorCount > 0 ? "high" : findings.some((finding) => finding.severity === "warning") ? "medium" : "low",
      findings,
      tableCount: counts.tableCount,
      imageCount: counts.imageCount,
      renderTimeMs,
      autoFixesApplied: findings.filter((finding) => finding.autoFixed).length,
      repairLog,
    },
  };
}
