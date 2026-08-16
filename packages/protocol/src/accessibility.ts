import { z } from "zod";

export const AccessibilitySeveritySchema = z.enum(["error", "warning", "info"]);
export type AccessibilitySeverity = z.infer<typeof AccessibilitySeveritySchema>;

export const AccessibilityIssueCodeSchema = z.enum([
  "document.title_missing",
  "document.language_missing",
  "image.alt_missing",
  "structure.heading_skipped",
  "table.header_missing",
]);
export type AccessibilityIssueCode = z.infer<typeof AccessibilityIssueCodeSchema>;

export const AccessibilityFormatSchema = z.enum(["pptx", "docx", "xlsx", "pdf"]);
export type AccessibilityFormat = z.infer<typeof AccessibilityFormatSchema>;

export const AccessibilityConfigBaseSchema = z.object({
  title: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
});
export type AccessibilityConfigBase = z.infer<typeof AccessibilityConfigBaseSchema>;

export const AccessibilityLocationSchema = z.object({
  elementPath: z.string().min(1).optional(),
  pageIndex: z.number().int().min(0).optional(),
  slideIndex: z.number().int().min(0).optional(),
  sheetName: z.string().min(1).optional(),
});
export type AccessibilityLocation = z.infer<typeof AccessibilityLocationSchema>;

export const AccessibilityIssueSchema = z.object({
  code: AccessibilityIssueCodeSchema,
  severity: AccessibilitySeveritySchema,
  message: z.string().min(1),
  location: AccessibilityLocationSchema.optional(),
  suggestedFix: z.string().min(1).optional(),
});
export type AccessibilityIssue = z.infer<typeof AccessibilityIssueSchema>;

export const AccessibilitySummarySchema = z.object({
  errors: z.number().int().min(0),
  warnings: z.number().int().min(0),
  infos: z.number().int().min(0),
});
export type AccessibilitySummary = z.infer<typeof AccessibilitySummarySchema>;

export const AccessibilityReportSchema = z.object({
  valid: z.boolean(),
  summary: AccessibilitySummarySchema,
  issues: z.array(AccessibilityIssueSchema),
  format: AccessibilityFormatSchema,
  standard: z.string().min(1).optional(),
});
export type AccessibilityReport = z.infer<typeof AccessibilityReportSchema>;

export const AccessibilityFixSchema = z.object({
  code: AccessibilityIssueCodeSchema,
  action: z.string().min(1),
  applied: z.boolean(),
  target: z.string().min(1).optional(),
});
export type AccessibilityFix = z.infer<typeof AccessibilityFixSchema>;

export const AccessibilityRemediationResultSchema = z.object({
  reportBefore: AccessibilityReportSchema,
  reportAfter: AccessibilityReportSchema,
  fixesApplied: z.array(AccessibilityFixSchema),
});
export type AccessibilityRemediationResult = z.infer<typeof AccessibilityRemediationResultSchema>;

export function summarizeAccessibilityIssues(issues: readonly AccessibilityIssue[]): AccessibilitySummary {
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  for (const issue of issues) {
    if (issue.severity === "error") {
      errors++;
    } else if (issue.severity === "warning") {
      warnings++;
    } else {
      infos++;
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
