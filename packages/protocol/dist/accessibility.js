import { z } from "zod";
export const AccessibilitySeveritySchema = z.enum(["error", "warning", "info"]);
export const AccessibilityIssueCodeSchema = z.enum([
    "document.title_missing",
    "document.language_missing",
    "image.alt_missing",
    "structure.heading_skipped",
    "table.header_missing",
]);
export const AccessibilityFormatSchema = z.enum(["pptx", "docx", "xlsx", "pdf"]);
export const AccessibilityConfigBaseSchema = z.object({
    title: z.string().min(1).optional(),
    language: z.string().min(1).optional(),
});
export const AccessibilityLocationSchema = z.object({
    elementPath: z.string().min(1).optional(),
    pageIndex: z.number().int().min(0).optional(),
    slideIndex: z.number().int().min(0).optional(),
    sheetName: z.string().min(1).optional(),
});
export const AccessibilityIssueSchema = z.object({
    code: AccessibilityIssueCodeSchema,
    severity: AccessibilitySeveritySchema,
    message: z.string().min(1),
    location: AccessibilityLocationSchema.optional(),
    suggestedFix: z.string().min(1).optional(),
});
export const AccessibilitySummarySchema = z.object({
    errors: z.number().int().min(0),
    warnings: z.number().int().min(0),
    infos: z.number().int().min(0),
});
export const AccessibilityReportSchema = z.object({
    valid: z.boolean(),
    summary: AccessibilitySummarySchema,
    issues: z.array(AccessibilityIssueSchema),
    format: AccessibilityFormatSchema,
    standard: z.string().min(1).optional(),
});
export const AccessibilityFixSchema = z.object({
    code: AccessibilityIssueCodeSchema,
    action: z.string().min(1),
    applied: z.boolean(),
    target: z.string().min(1).optional(),
});
export const AccessibilityRemediationResultSchema = z.object({
    reportBefore: AccessibilityReportSchema,
    reportAfter: AccessibilityReportSchema,
    fixesApplied: z.array(AccessibilityFixSchema),
});
export function summarizeAccessibilityIssues(issues) {
    let errors = 0;
    let warnings = 0;
    let infos = 0;
    for (const issue of issues) {
        if (issue.severity === "error") {
            errors++;
        }
        else if (issue.severity === "warning") {
            warnings++;
        }
        else {
            infos++;
        }
    }
    return { errors, warnings, infos };
}
export function createAccessibilityReport(options) {
    const issues = [...options.issues];
    return {
        valid: !issues.some((issue) => issue.severity === "error"),
        summary: summarizeAccessibilityIssues(issues),
        issues,
        format: options.format,
        standard: options.standard,
    };
}
//# sourceMappingURL=accessibility.js.map