import { describe, expect, it } from "vitest";
import {
  AccessibilityReportSchema,
  createAccessibilityReport,
} from "../accessibility.js";

describe("accessibility contract", () => {
  it("creates canonical reports with computed summary totals", () => {
    const report = createAccessibilityReport({
      format: "docx",
      standard: "WCAG 2.2 AA",
      issues: [
        {
          code: "document.title_missing",
          severity: "warning",
          message: "Document title is missing.",
        },
        {
          code: "image.alt_missing",
          severity: "warning",
          message: "Image alt text is missing.",
          location: { pageIndex: 0, elementPath: "pages[0].elements[1]" },
        },
      ],
    });

    expect(report.valid).toBe(true);
    expect(report.summary).toEqual({ errors: 0, warnings: 2, infos: 0 });
    expect(AccessibilityReportSchema.parse(report)).toEqual(report);
  });
});
