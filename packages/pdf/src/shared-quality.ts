import type {
  FindingCode,
  QualityFinding,
  QualityReport,
  QualityVerdict,
  RepairEntry,
} from "./public-quality-types.js";
import type { PdfQualityFinding, PdfRepairValidationResult } from "./phase10-types.js";

function mapFindingCode(code: PdfQualityFinding["code"]): FindingCode {
  switch (code) {
    case "SIGNATURE_INVALID":
      return "PDF_SIGNATURE_INVALID";
    case "SIGNATURE_MISSING":
      return "PDF_SIGNATURE_MISSING";
    case "TIMESTAMP_MISSING":
      return "PDF_TIMESTAMP_MISSING";
    case "TIMESTAMP_INVALID":
      return "PDF_TIMESTAMP_INVALID";
    case "XREF_OFFSET_MISMATCH":
      return "PDF_XREF_OFFSET_INCORRECT";
    case "XREF_ENTRY_ZERO_OFFSET":
      return "PDF_XREF_ENTRY_ZERO_OFFSET";
    case "XREF_MISSING":
      return "PDF_XREF_TABLE_MISSING";
    case "STREAM_LENGTH_MISMATCH":
      return "PDF_STREAM_LENGTH_INCORRECT";
    case "EOF_MARKER_MISSING":
      return "PDF_EOF_MARKER_MISSING";
    case "ROOT_OBJECT_INVALID":
      return "PDF_ROOT_OBJECT_INVALID";
    case "FONT_SUBSET_INCOMPLETE":
      return "PDF_FONT_SUBSET_INCOMPLETE";
    case "OBJECT_NUMBER_REUSE":
      return "PDF_OBJECT_NUMBER_REUSE";
    case "FONT_REFERENCE_MISSING":
      return "PDF_FONT_OBJECT_MISSING";
    case "FONT_NOT_EMBEDDED":
      return "PDF_FONT_NOT_EMBEDDED";
    case "IMAGE_REFERENCE_MISSING":
      return "PDF_IMAGE_REFERENCE_MISSING";
    case "PAGE_TREE_COUNT_MISMATCH":
      return "PDF_PAGE_TREE_COUNT_MISMATCH";
    case "MCID_GAP":
      return "PDF_TAG_MCID_GAP";
    case "SELF_REFERENCE":
      return "PDF_SELF_REFERENCE";
    case "INFO_XMP_MISMATCH":
      return "PDF_METADATA_INFO_XMP_MISMATCH";
  }
}

function getFindingKey(finding: PdfQualityFinding): string {
  return [
    finding.code,
    String(finding.objectNumber ?? ""),
    finding.message,
  ].join("|");
}

function getActionCandidates(code: string): PdfQualityFinding["code"][] {
  switch (code) {
    case "XREF_OFFSET_MISMATCH":
      return ["EOF_MARKER_MISSING", "XREF_MISSING", "XREF_OFFSET_MISMATCH"];
    case "STREAM_LENGTH_MISMATCH":
      return ["STREAM_LENGTH_MISMATCH"];
    case "PAGE_TREE_COUNT_MISMATCH":
      return ["PAGE_TREE_COUNT_MISMATCH"];
    case "INFO_XMP_MISMATCH":
      return ["INFO_XMP_MISMATCH"];
    default:
      return [];
  }
}

function mapRepairActionCodes(
  action: { code: string; objectNumber?: number },
  result: PdfRepairValidationResult,
): FindingCode[] {
  const candidates = getActionCandidates(action.code);
  if (candidates.length === 0) {
    return [];
  }

  const matchingFindings = result.original.findings.filter((finding) => {
    if (!candidates.includes(finding.code)) {
      return false;
    }
    if (action.objectNumber === undefined) {
      return true;
    }
    return finding.objectNumber === action.objectNumber;
  });

  return [...new Set(matchingFindings.map((finding) => mapFindingCode(finding.code)))];
}

function getVerdict(result: PdfRepairValidationResult): QualityVerdict {
  if (result.repaired.verdict === "clean") {
    return result.original.verdict === "errors" ? "editable_with_constraints" : "native_editable";
  }
  if (result.repaired.verdict === "warnings") {
    return result.original.verdict === "errors" ? "editable_with_constraints" : "visual_fallback";
  }
  return "rejected";
}

export function buildSharedPdfQualityReport(
  result: PdfRepairValidationResult,
  renderTimeMs: number,
): QualityReport {
  const remainingKeys = new Set(result.repaired.findings.map(getFindingKey));
  const findings: QualityFinding[] = result.original.findings.map((finding) => ({
    code: mapFindingCode(finding.code),
    severity: finding.severity,
    pageIndex: undefined,
    nodeId: finding.objectNumber !== undefined ? `object:${finding.objectNumber}` : undefined,
    message: finding.message,
    autoFixed: !remainingKeys.has(getFindingKey(finding)),
    repairDescription: !remainingKeys.has(getFindingKey(finding))
      ? `Auto-repaired ${finding.code.toLowerCase()}`
      : undefined,
  }));

  const repairLog: RepairEntry[] = result.repair.actions.flatMap((action) => {
    const findingsForAction = mapRepairActionCodes(action, result);
    return findingsForAction.map((finding) => ({
      strategy: action.code,
      finding,
      description: action.description,
      success: true,
    }));
  });

  return {
    verdict: getVerdict(result),
    repairRisk: result.original.verdict === "errors" ? "high" : result.original.verdict === "warnings" ? "medium" : "low",
    findings,
    pageCount: result.repaired.pageCount,
    imageCount: result.repaired.imageCount,
    fontCount: result.repaired.fontCount,
    renderTimeMs,
    autoFixesApplied: findings.filter((finding) => finding.autoFixed).length,
    repairLog,
  };
}
