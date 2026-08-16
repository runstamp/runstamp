import { z } from "zod";
export declare const AccessibilitySeveritySchema: z.ZodEnum<{
    error: "error";
    warning: "warning";
    info: "info";
}>;
export type AccessibilitySeverity = z.infer<typeof AccessibilitySeveritySchema>;
export declare const AccessibilityIssueCodeSchema: z.ZodEnum<{
    "document.title_missing": "document.title_missing";
    "document.language_missing": "document.language_missing";
    "image.alt_missing": "image.alt_missing";
    "structure.heading_skipped": "structure.heading_skipped";
    "table.header_missing": "table.header_missing";
}>;
export type AccessibilityIssueCode = z.infer<typeof AccessibilityIssueCodeSchema>;
export declare const AccessibilityFormatSchema: z.ZodEnum<{
    pptx: "pptx";
    docx: "docx";
    xlsx: "xlsx";
    pdf: "pdf";
}>;
export type AccessibilityFormat = z.infer<typeof AccessibilityFormatSchema>;
export declare const AccessibilityConfigBaseSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AccessibilityConfigBase = z.infer<typeof AccessibilityConfigBaseSchema>;
export declare const AccessibilityLocationSchema: z.ZodObject<{
    elementPath: z.ZodOptional<z.ZodString>;
    pageIndex: z.ZodOptional<z.ZodNumber>;
    slideIndex: z.ZodOptional<z.ZodNumber>;
    sheetName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AccessibilityLocation = z.infer<typeof AccessibilityLocationSchema>;
export declare const AccessibilityIssueSchema: z.ZodObject<{
    code: z.ZodEnum<{
        "document.title_missing": "document.title_missing";
        "document.language_missing": "document.language_missing";
        "image.alt_missing": "image.alt_missing";
        "structure.heading_skipped": "structure.heading_skipped";
        "table.header_missing": "table.header_missing";
    }>;
    severity: z.ZodEnum<{
        error: "error";
        warning: "warning";
        info: "info";
    }>;
    message: z.ZodString;
    location: z.ZodOptional<z.ZodObject<{
        elementPath: z.ZodOptional<z.ZodString>;
        pageIndex: z.ZodOptional<z.ZodNumber>;
        slideIndex: z.ZodOptional<z.ZodNumber>;
        sheetName: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    suggestedFix: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AccessibilityIssue = z.infer<typeof AccessibilityIssueSchema>;
export declare const AccessibilitySummarySchema: z.ZodObject<{
    errors: z.ZodNumber;
    warnings: z.ZodNumber;
    infos: z.ZodNumber;
}, z.core.$strip>;
export type AccessibilitySummary = z.infer<typeof AccessibilitySummarySchema>;
export declare const AccessibilityReportSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    summary: z.ZodObject<{
        errors: z.ZodNumber;
        warnings: z.ZodNumber;
        infos: z.ZodNumber;
    }, z.core.$strip>;
    issues: z.ZodArray<z.ZodObject<{
        code: z.ZodEnum<{
            "document.title_missing": "document.title_missing";
            "document.language_missing": "document.language_missing";
            "image.alt_missing": "image.alt_missing";
            "structure.heading_skipped": "structure.heading_skipped";
            "table.header_missing": "table.header_missing";
        }>;
        severity: z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>;
        message: z.ZodString;
        location: z.ZodOptional<z.ZodObject<{
            elementPath: z.ZodOptional<z.ZodString>;
            pageIndex: z.ZodOptional<z.ZodNumber>;
            slideIndex: z.ZodOptional<z.ZodNumber>;
            sheetName: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        suggestedFix: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    format: z.ZodEnum<{
        pptx: "pptx";
        docx: "docx";
        xlsx: "xlsx";
        pdf: "pdf";
    }>;
    standard: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AccessibilityReport = z.infer<typeof AccessibilityReportSchema>;
export declare const AccessibilityFixSchema: z.ZodObject<{
    code: z.ZodEnum<{
        "document.title_missing": "document.title_missing";
        "document.language_missing": "document.language_missing";
        "image.alt_missing": "image.alt_missing";
        "structure.heading_skipped": "structure.heading_skipped";
        "table.header_missing": "table.header_missing";
    }>;
    action: z.ZodString;
    applied: z.ZodBoolean;
    target: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AccessibilityFix = z.infer<typeof AccessibilityFixSchema>;
export declare const AccessibilityRemediationResultSchema: z.ZodObject<{
    reportBefore: z.ZodObject<{
        valid: z.ZodBoolean;
        summary: z.ZodObject<{
            errors: z.ZodNumber;
            warnings: z.ZodNumber;
            infos: z.ZodNumber;
        }, z.core.$strip>;
        issues: z.ZodArray<z.ZodObject<{
            code: z.ZodEnum<{
                "document.title_missing": "document.title_missing";
                "document.language_missing": "document.language_missing";
                "image.alt_missing": "image.alt_missing";
                "structure.heading_skipped": "structure.heading_skipped";
                "table.header_missing": "table.header_missing";
            }>;
            severity: z.ZodEnum<{
                error: "error";
                warning: "warning";
                info: "info";
            }>;
            message: z.ZodString;
            location: z.ZodOptional<z.ZodObject<{
                elementPath: z.ZodOptional<z.ZodString>;
                pageIndex: z.ZodOptional<z.ZodNumber>;
                slideIndex: z.ZodOptional<z.ZodNumber>;
                sheetName: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            suggestedFix: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        format: z.ZodEnum<{
            pptx: "pptx";
            docx: "docx";
            xlsx: "xlsx";
            pdf: "pdf";
        }>;
        standard: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    reportAfter: z.ZodObject<{
        valid: z.ZodBoolean;
        summary: z.ZodObject<{
            errors: z.ZodNumber;
            warnings: z.ZodNumber;
            infos: z.ZodNumber;
        }, z.core.$strip>;
        issues: z.ZodArray<z.ZodObject<{
            code: z.ZodEnum<{
                "document.title_missing": "document.title_missing";
                "document.language_missing": "document.language_missing";
                "image.alt_missing": "image.alt_missing";
                "structure.heading_skipped": "structure.heading_skipped";
                "table.header_missing": "table.header_missing";
            }>;
            severity: z.ZodEnum<{
                error: "error";
                warning: "warning";
                info: "info";
            }>;
            message: z.ZodString;
            location: z.ZodOptional<z.ZodObject<{
                elementPath: z.ZodOptional<z.ZodString>;
                pageIndex: z.ZodOptional<z.ZodNumber>;
                slideIndex: z.ZodOptional<z.ZodNumber>;
                sheetName: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            suggestedFix: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        format: z.ZodEnum<{
            pptx: "pptx";
            docx: "docx";
            xlsx: "xlsx";
            pdf: "pdf";
        }>;
        standard: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    fixesApplied: z.ZodArray<z.ZodObject<{
        code: z.ZodEnum<{
            "document.title_missing": "document.title_missing";
            "document.language_missing": "document.language_missing";
            "image.alt_missing": "image.alt_missing";
            "structure.heading_skipped": "structure.heading_skipped";
            "table.header_missing": "table.header_missing";
        }>;
        action: z.ZodString;
        applied: z.ZodBoolean;
        target: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AccessibilityRemediationResult = z.infer<typeof AccessibilityRemediationResultSchema>;
export declare function summarizeAccessibilityIssues(issues: readonly AccessibilityIssue[]): AccessibilitySummary;
export declare function createAccessibilityReport(options: {
    format: AccessibilityFormat;
    issues: readonly AccessibilityIssue[];
    standard?: string;
}): AccessibilityReport;
//# sourceMappingURL=accessibility.d.ts.map