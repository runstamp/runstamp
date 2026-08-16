export type AccessibilitySeverity = "error" | "warning" | "info";

export type AccessibilityIssueCode =
  | "document.title_missing"
  | "document.language_missing"
  | "image.alt_missing"
  | "structure.heading_skipped"
  | "table.header_missing";

export type AccessibilityFormat = "pptx" | "docx" | "xlsx" | "pdf";

export interface AccessibilityConfigBase {
  title?: string;
  language?: string;
}

export interface AccessibilityLocation {
  elementPath?: string;
  pageIndex?: number;
  slideIndex?: number;
  sheetName?: string;
}

export interface AccessibilityIssue {
  code: AccessibilityIssueCode;
  severity: AccessibilitySeverity;
  message: string;
  location?: AccessibilityLocation;
  suggestedFix?: string;
}

export interface AccessibilitySummary {
  errors: number;
  warnings: number;
  infos: number;
}

export interface AccessibilityReport {
  valid: boolean;
  summary: AccessibilitySummary;
  issues: AccessibilityIssue[];
  format: AccessibilityFormat;
  standard?: string;
}

export interface AccessibilityFix {
  code: AccessibilityIssueCode;
  action: string;
  applied: boolean;
  target?: string;
}

export interface AccessibilityRemediationResult {
  reportBefore: AccessibilityReport;
  reportAfter: AccessibilityReport;
  fixesApplied: AccessibilityFix[];
}

export function summarizeAccessibilityIssues(issues: readonly AccessibilityIssue[]): AccessibilitySummary {
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  for (const issue of issues) {
    if (issue.severity === "error") {
      errors += 1;
    } else if (issue.severity === "warning") {
      warnings += 1;
    } else {
      infos += 1;
    }
  }

  return { errors, warnings, infos };
}

export function createAccessibilityReport(options: {
  format: AccessibilityFormat;
  issues: readonly AccessibilityIssue[];
  standard?: string;
}): AccessibilityReport {
  const issues = [...options.issues];
  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    summary: summarizeAccessibilityIssues(issues),
    issues,
    format: options.format,
    standard: options.standard,
  };
}
