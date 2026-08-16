import { describe, expect, it } from "vitest";
import {
  SpreadsheetEngine,
  remediateSpreadsheetAccessibility,
  validateSpreadsheetAccessibility,
  type SpreadsheetDocument,
} from "../src/index.js";

function makeWorkbook(overrides: Partial<SpreadsheetDocument> = {}): SpreadsheetDocument {
  return {
    accessible: {
      level: "AA",
      title: "Accessibility sample workbook",
      language: "en-US",
      autoAltText: true,
      enforceTableHeaders: true,
    },
    sheets: [
      {
        name: "Summary",
        rows: [
          { cells: [{ value: "Name" }, { value: "Value" }] },
          { cells: [{ value: "Ada" }, { value: 42 }] },
        ],
        tables: [
          {
            name: "SummaryTable",
            ref: "A1:B2",
          },
        ],
        images: [
          {
            data: Buffer.from([1, 2, 3]),
            type: "png",
            anchor: { from: { col: 0, row: 4 } },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("xlsx accessibility", () => {
  it("flags workbook metadata, table headers, and image alt text with canonical issue codes", () => {
    const report = validateSpreadsheetAccessibility({
      sheets: [
        {
          name: "Raw",
          rows: [{ cells: [{ value: "Name" }, { value: "Value" }] }],
          tables: [{ name: "T1", ref: "A1:B1" }],
          images: [{ data: Buffer.from([1]), type: "png", anchor: { from: { col: 0, row: 0 } } }],
        },
      ],
    } as SpreadsheetDocument);

    expect(report.format).toBe("xlsx");
    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "document.title_missing",
        "document.language_missing",
        "table.header_missing",
        "image.alt_missing",
      ]),
    );
    expect(report.summary.warnings).toBeGreaterThanOrEqual(4);
  });

  it("remediates metadata, headers, and alt text conservatively and idempotently", () => {
    const initial = makeWorkbook({
      meta: {},
      accessible: {
        level: "AA",
        title: "Accessibility sample workbook",
        language: "en-US",
        autoAltText: true,
        enforceTableHeaders: true,
      },
    });

    const firstPass = SpreadsheetEngine.remediateAccessibility(initial);

    expect(firstPass.reportBefore.valid).toBe(false);
    expect(firstPass.reportAfter.valid).toBe(true);
    expect(firstPass.document.meta?.title).toBe("Accessibility sample workbook");
    expect(firstPass.document.meta?.language).toBe("en-US");
    expect(firstPass.document.sheets[0].tables?.[0].columns?.map((column) => column.name)).toEqual([
      "Name",
      "Value",
    ]);
    expect(firstPass.document.sheets[0].images?.[0].description).toBe("Image");

    const secondPass = remediateSpreadsheetAccessibility(firstPass.document);
    expect(secondPass.fixesApplied).toHaveLength(0);
    expect(secondPass.reportAfter.valid).toBe(true);
    expect(secondPass.document).toEqual(firstPass.document);
  });

  it("exposes the same behavior through the SpreadsheetEngine facade", () => {
    const report = SpreadsheetEngine.validateAccessibility(makeWorkbook());
    expect(report.valid).toBe(false);

    const result = SpreadsheetEngine.remediateAccessibility(makeWorkbook());
    expect(result.reportAfter.valid).toBe(true);
  });
});
