/**
 * Diagnosis Engine — aggregates structural and chart validation reports,
 * prioritizes issues, and suggests fixes.
 */
import type { StructuralReport, StructuralCheckResult } from "./structuralValidator.js";
import type { ChartValidationReport, ChartCheckResult } from "./chartValidator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiagnosisIssue {
  issue: string;
  file: string;
  xpath?: string;
  fix: string;
  autoFixable: boolean;
  category: "structural" | "chart" | "formatting" | "harmless";
}

export interface DiagnosisReport {
  critical: DiagnosisIssue[];
  high: DiagnosisIssue[];
  medium: DiagnosisIssue[];
  info: DiagnosisIssue[];
  verdict: "LAUNCH_READY" | "NEEDS_FIXES" | "BLOCKED";
}

// ---------------------------------------------------------------------------
// Known failure pattern catalog
// ---------------------------------------------------------------------------

interface KnownPattern {
  /** Regex to match against error strings */
  match: RegExp;
  /** Severity bucket */
  severity: "critical" | "high" | "medium" | "info";
  /** Suggested fix description */
  fix: string;
  /** Whether the pptxPatcher can auto-fix this */
  autoFixable: boolean;
  /** Issue category */
  category: DiagnosisIssue["category"];
}

const KNOWN_PATTERNS: KnownPattern[] = [
  // Structural — critical
  {
    match: /duplicate.*content.?type/i,
    severity: "critical",
    fix: "Remove duplicate Default/Override entries from [Content_Types].xml",
    autoFixable: true,
    category: "structural",
  },
  {
    match: /relationship.*target.*not found|target.*does not exist/i,
    severity: "critical",
    fix: "Remove orphaned relationship or add missing target file to archive",
    autoFixable: true,
    category: "structural",
  },
  {
    match: /duplicate.*rId|duplicate.*relationship.*id/i,
    severity: "critical",
    fix: "Reassign duplicate relationship IDs to unique values",
    autoFixable: false,
    category: "structural",
  },
  {
    match: /element.*order|sldMasterIdLst.*before.*sldIdLst|sldIdLst.*before.*sldSz/i,
    severity: "critical",
    fix: "Reorder child elements to match OOXML schema sequence",
    autoFixable: true,
    category: "structural",
  },

  // Structural — high
  {
    match: /slide.*layout.*master.*chain|layout.*not found|master.*not found/i,
    severity: "high",
    fix: "Fix slide→layout→master relationship chain",
    autoFixable: false,
    category: "structural",
  },
  {
    match: /clrScheme.*missing|missing.*color/i,
    severity: "high",
    fix: "Add missing color elements to theme a:clrScheme",
    autoFixable: false,
    category: "structural",
  },
  {
    match: /fontScheme.*missing|majorFont|minorFont/i,
    severity: "high",
    fix: "Add missing font scheme elements to theme",
    autoFixable: false,
    category: "structural",
  },

  // Structural — medium
  {
    match: /typeface.*missing|a:latin.*typeface|a:ea.*typeface|a:cs.*typeface/i,
    severity: "medium",
    fix: "Add missing typeface attribute to font element",
    autoFixable: true,
    category: "formatting",
  },
  {
    match: /namespace.*inconsist/i,
    severity: "medium",
    fix: "Fix chart namespace (c: for standard charts, cx: for ChartEx)",
    autoFixable: false,
    category: "chart",
  },

  // Chart — high
  {
    match: /series.*index.*order|c:idx.*sequential|c:order.*sequential/i,
    severity: "high",
    fix: "Reindex chart series c:idx and c:order attributes sequentially from 0",
    autoFixable: true,
    category: "chart",
  },
  {
    match: /no.*chart.*type.*element/i,
    severity: "high",
    fix: "Ensure chart XML contains a valid chart type element",
    autoFixable: false,
    category: "chart",
  },
  {
    match: /embedded.*excel.*missing|\.xlsx.*not found/i,
    severity: "high",
    fix: "Add embedded Excel workbook for chart editability",
    autoFixable: false,
    category: "chart",
  },

  // Chart — medium
  {
    match: /chart.*position.*bounds|outside.*slide.*bounds/i,
    severity: "medium",
    fix: "Adjust chart graphicFrame position to fit within slide EMU bounds",
    autoFixable: true,
    category: "chart",
  },
  {
    match: /legend.*position|axis.*orientation/i,
    severity: "medium",
    fix: "Set valid legend position or axis orientation",
    autoFixable: false,
    category: "chart",
  },
];

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

/**
 * Diagnose issues from structural and chart validation reports.
 * Returns a prioritized diagnosis with fix suggestions.
 */
export function diagnose(
  structuralReport?: StructuralReport,
  chartReport?: ChartValidationReport,
): DiagnosisReport {
  const issues: DiagnosisIssue[] = [];

  // Process structural check failures
  if (structuralReport) {
    for (const check of structuralReport.checks) {
      if (check.passed) continue;
      for (const error of check.errors) {
        issues.push(classifyIssue(error, check.name));
      }
    }
  }

  // Process chart check failures
  if (chartReport) {
    for (const check of chartReport.charts) {
      if (check.passed) continue;
      for (const error of check.errors) {
        issues.push(classifyIssue(error, check.chartPath));
      }
    }
  }

  // Bucket by severity
  const critical = issues.filter(i => i === issues.find(x => x === i) && isSeverity(i, "critical"));
  const high = issues.filter(i => isSeverity(i, "high"));
  const medium = issues.filter(i => isSeverity(i, "medium"));
  const info = issues.filter(i => isSeverity(i, "info"));

  // Determine verdict
  let verdict: DiagnosisReport["verdict"] = "LAUNCH_READY";
  if (critical.length > 0) {
    verdict = "BLOCKED";
  } else if (high.length > 0) {
    verdict = "NEEDS_FIXES";
  }

  return { critical, high, medium, info, verdict };
}

function classifyIssue(error: string, file: string): DiagnosisIssue {
  for (const pattern of KNOWN_PATTERNS) {
    if (pattern.match.test(error)) {
      return {
        issue: error,
        file,
        fix: pattern.fix,
        autoFixable: pattern.autoFixable,
        category: pattern.category,
      };
    }
  }

  // Unclassified — default to medium structural
  return {
    issue: error,
    file,
    fix: "Manual investigation required",
    autoFixable: false,
    category: "structural",
  };
}

function isSeverity(issue: DiagnosisIssue, severity: string): boolean {
  for (const pattern of KNOWN_PATTERNS) {
    if (pattern.match.test(issue.issue) && pattern.severity === severity) {
      return true;
    }
  }
  // Unclassified issues are medium
  if (severity === "medium") {
    return !KNOWN_PATTERNS.some(p => p.match.test(issue.issue));
  }
  return false;
}

/**
 * Get summary statistics from a diagnosis report.
 */
export function diagnosisSummary(report: DiagnosisReport): string {
  const lines: string[] = [];
  lines.push(`Verdict: ${report.verdict}`);
  lines.push(`  Critical: ${report.critical.length}`);
  lines.push(`  High: ${report.high.length}`);
  lines.push(`  Medium: ${report.medium.length}`);
  lines.push(`  Info: ${report.info.length}`);

  const autoFixable = [
    ...report.critical,
    ...report.high,
    ...report.medium,
  ].filter(i => i.autoFixable).length;

  if (autoFixable > 0) {
    lines.push(`  Auto-fixable: ${autoFixable}`);
  }

  return lines.join("\n");
}
