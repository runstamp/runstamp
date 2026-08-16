import type {
  FindingCode,
  QualityFinding,
  QualityReport,
  QualityVerdict,
  RepairEntry,
} from "../public-quality-types.js";
import type {
  SpreadsheetRepairAction,
  SpreadsheetRepairValidationResult,
  SpreadsheetFinding,
  SpreadsheetFindingCode,
} from "./workbook-quality.js";

function mapFindingCode(code: SpreadsheetFinding["code"]): FindingCode {
  switch (code) {
    case "ORPHAN_RELATIONSHIP":
    case "MISSING_WORKSHEET_PART":
      return "XLSX_RELATIONSHIP_TARGET_MISSING";
    case "DUPLICATE_RELATIONSHIP_ID":
      return "SHARED_RID_NOT_UNIQUE";
    case "STYLE_INDEX_OOB":
      return "XLSX_STYLE_INDEX_OOB";
    case "SHARED_STRING_INDEX_OOB":
      return "XLSX_SHARED_STRING_INDEX_OOB";
    case "SHEET_NAME_INVALID":
      return "XLSX_SHEET_NAME_INVALID";
    case "DUPLICATE_SHEET_NAME":
      return "XLSX_DUPLICATE_SHEET_NAME";
    case "FORMULA_CACHED_VALUE_MISSING":
      return "XLSX_FORMULA_CACHED_VALUE_MISSING";
    case "MERGE_OVERLAP":
      return "XLSX_MERGE_OVERLAP";
    case "DEFINED_NAME_INVALID":
      return "XLSX_NAMED_RANGE_DEAD_REF";
    case "MISSING_CONTENT_TYPE":
      return "SHARED_CONTENT_TYPE_MISSING";
    case "EXTRA_CONTENT_TYPE":
      return "SHARED_CONTENT_TYPE_UNEXPECTED";
    case "BROKEN_TABLE_RELATIONSHIP":
      return "XLSX_TABLE_RELATIONSHIP_BROKEN";
    case "DUPLICATE_TABLE_NAME":
      return "XLSX_TABLE_NAME_DUPLICATE";
    case "INVALID_TABLE_REF":
      return "XLSX_TABLE_REF_INVALID";
    case "DIMENSION_MISMATCH":
      return "XLSX_WORKSHEET_DIMENSION_MISMATCH";
    case "INVALID_RANGE_REF":
      return "XLSX_RANGE_REF_INVALID";
    case "MERGE_RANGE_OUT_OF_BOUNDS":
      return "XLSX_MERGE_RANGE_OUT_OF_BOUNDS";
    case "HYPERLINK_TARGET_INVALID":
      return "XLSX_HYPERLINK_TARGET_INVALID";
    case "MACRO_STRIPPED":
      return "XLSX_MACRO_STRIPPED";
    case "EXTERNAL_CONNECTION_STRIPPED":
      return "XLSX_EXTERNAL_CONNECTION_STRIPPED";
    case "GOOGLE_SHEETS_IMPORT_RISK":
      return "XLSX_GOOGLE_SHEETS_IMPORT_RISK";
    case "NUMBERS_COMPATIBILITY_WARNING":
      return "XLSX_NUMBERS_COMPATIBILITY_WARNING";
    case "LARGE_FILE_WARNING":
      return "XLSX_LARGE_FILE_WARNING";
    case "HIGH_UNIQUE_STRING_COUNT":
      return "XLSX_HIGH_UNIQUE_STRING_COUNT";
    case "EXCESSIVE_STYLE_CARDINALITY":
      return "XLSX_STYLE_CARDINALITY_EXCESSIVE";
    case "STREAM_MODE_RECOMMENDED":
      return "XLSX_STREAM_MODE_RECOMMENDED";
  }
}

function getActionCandidates(code: SpreadsheetRepairAction["code"]): SpreadsheetFindingCode[] {
  switch (code) {
    case "FIX_CONTENT_TYPES":
      return ["MISSING_CONTENT_TYPE", "EXTRA_CONTENT_TYPE"];
    case "REMOVE_INVALID_DEFINED_NAMES":
      return ["DEFINED_NAME_INVALID"];
    case "REMOVE_ORPHAN_RELATIONSHIPS":
      return ["ORPHAN_RELATIONSHIP", "MISSING_WORKSHEET_PART"];
    case "CLAMP_STYLE_INDEX":
      return ["STYLE_INDEX_OOB"];
    case "REPAIR_SHARED_STRING_INDEX":
      return ["SHARED_STRING_INDEX_OOB"];
    case "NORMALIZE_SHEET_NAMES":
      return ["SHEET_NAME_INVALID", "DUPLICATE_SHEET_NAME"];
    case "DEDUPE_RELATIONSHIP_IDS":
      return ["DUPLICATE_RELATIONSHIP_ID"];
    case "ADD_FORMULA_CACHED_VALUES":
      return ["FORMULA_CACHED_VALUE_MISSING"];
    case "NORMALIZE_DUPLICATE_TABLE_NAME":
      return ["DUPLICATE_TABLE_NAME"];
    case "CLIP_TABLE_REF":
      return ["INVALID_TABLE_REF"];
    case "REPAIR_MERGES":
      return ["MERGE_OVERLAP", "MERGE_RANGE_OUT_OF_BOUNDS"];
    case "RECALCULATE_DIMENSION":
      return ["DIMENSION_MISMATCH"];
    case "REMOVE_INVALID_HYPERLINKS":
      return ["HYPERLINK_TARGET_INVALID"];
    case "CLIP_DATA_VALIDATION_RANGES":
      return ["INVALID_RANGE_REF"];
    case "MACRO_STRIPPED":
      return ["MACRO_STRIPPED"];
    case "EXTERNAL_CONNECTION_STRIPPED":
      return ["EXTERNAL_CONNECTION_STRIPPED"];
    default:
      throw new Error(`Unmapped spreadsheet repair action: ${code}`);
  }
}

function mapRepairActionCodes(
  action: SpreadsheetRepairAction,
  result: SpreadsheetRepairValidationResult,
): FindingCode[] {
  const candidates = getActionCandidates(action.code);
  const matchingFindings = result.original.findings.filter((finding) => {
    if (!candidates.includes(finding.code)) {
      return false;
    }
    if (!action.path) {
      return true;
    }
    return finding.location?.path === action.path;
  });
  const repairFindings = matchingFindings.length > 0
    ? matchingFindings
    : result.repair.findings.filter((finding) => {
      if (!candidates.includes(finding.code)) {
        return false;
      }
      if (!action.path) {
        return true;
      }
      return finding.location?.path === action.path;
    });
  return [...new Set(repairFindings.map((finding) => mapFindingCode(finding.code)))];
}

function getSheetIndex(finding: SpreadsheetFinding): number | undefined {
  const sheetName = finding.location?.sheetName;
  if (!sheetName) {
    return undefined;
  }
  const match = sheetName.match(/(\d+)$/);
  return match ? Number(match[1]) - 1 : undefined;
}

function getFindingKey(finding: SpreadsheetFinding): string {
  return [
    finding.code,
    finding.location?.path ?? "",
    finding.location?.sheetName ?? "",
    finding.location?.cellRef ?? "",
    finding.location?.rangeRef ?? "",
    finding.message,
  ].join("|");
}

function getVerdict(result: SpreadsheetRepairValidationResult): QualityVerdict {
  if (result.repaired.verdict === "clean") {
    return result.original.verdict === "errors" ? "editable_with_constraints" : "native_editable";
  }
  if (result.repaired.verdict === "warnings") {
    return result.original.verdict === "errors" ? "editable_with_constraints" : "visual_fallback";
  }
  return "rejected";
}

export function buildSharedSpreadsheetQualityReport(
  result: SpreadsheetRepairValidationResult,
  renderTimeMs: number,
): QualityReport {
  const remainingKeys = new Set(result.repaired.findings.map(getFindingKey));
  const findings: QualityFinding[] = result.original.findings.map((finding) => {
    const autoFixed = !remainingKeys.has(getFindingKey(finding));
    return {
      code: mapFindingCode(finding.code),
      severity: finding.severity,
      sheetIndex: getSheetIndex(finding),
      nodeId: finding.location?.cellRef ?? finding.location?.rangeRef ?? finding.location?.path,
      message: finding.message,
      autoFixed,
      repairDescription: autoFixed ? `Auto-repaired ${finding.code.toLowerCase()}` : undefined,
    };
  });

  for (const finding of result.repair.findings.filter((item) => item.repaired)) {
    if (findings.some((existing) => existing.message === finding.message && existing.code === mapFindingCode(finding.code))) {
      continue;
    }
    findings.push({
      code: mapFindingCode(finding.code),
      severity: finding.severity,
      sheetIndex: getSheetIndex(finding),
      nodeId: finding.location?.cellRef ?? finding.location?.rangeRef ?? finding.location?.path,
      message: finding.message,
      autoFixed: true,
      repairDescription: finding.message,
    });
  }

  const repairLog: RepairEntry[] = result.repair.actions.flatMap((action) => {
    const findingsForAction = mapRepairActionCodes(action, result);
    return findingsForAction.map((finding) => ({
      strategy: action.code,
      finding,
      description: action.description,
      success: true,
    }));
  });

  const autoFixesApplied = findings.filter((finding) => finding.autoFixed).length;

  return {
    verdict: getVerdict(result),
    repairRisk: result.original.verdict === "errors" ? "high" : result.original.verdict === "warnings" ? "medium" : "low",
    findings,
    renderTimeMs,
    autoFixesApplied,
    repairLog,
  };
}
