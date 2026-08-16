export type AccessibilitySeverity = "error" | "warning" | "info";

export type AccessibilityIssueCode =
  | "document.title_missing"
  | "document.language_missing"
  | "image.alt_missing"
  | "structure.heading_skipped"
  | "table.header_missing";

export interface AccessibilityIssue {
  code: AccessibilityIssueCode;
  severity: AccessibilitySeverity;
  message: string;
  location?: {
    elementPath?: string;
    pageIndex?: number;
    slideIndex?: number;
    sheetName?: string;
  };
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
  format: "pptx" | "docx" | "xlsx" | "pdf";
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
