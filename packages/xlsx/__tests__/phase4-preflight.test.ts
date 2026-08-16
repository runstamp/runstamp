import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import { getPhase1Fixture } from "../src/fixtures/phase1.js";
import { openZip, readZipEntry } from "./helpers.js";

describe("Phase 4 preflight and string strategy", () => {
  it("reports stream pressure and inline-string preference for large unique-string workloads", () => {
    const report = SpreadsheetEngine.preflight({
      sheets: [
        {
          name: "Large",
          rows: Array.from({ length: 50_001 }, (_unused, rowIndex) => ({
            cells: [
              { value: `row-${rowIndex}-alpha` },
              { value: `row-${rowIndex}-beta` },
              { value: rowIndex },
            ],
          })),
        },
      ],
    });

    expect(report.verdict).toBe("warnings");
    expect(report.renderModeRecommendation).toBe("stream");
    expect(report.recommendedRenderMode).toBe("stream");
    expect(report.recommendedStringStrategy).toBe("inlineStrings");
    expect(report.estimatedWorkbookSizeBytes).toBe(report.estimates.projectedZipBytes);
    expect(report.estimatedUniqueStrings).toBe(report.estimates.uniqueStringCount);
    expect(report.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "STREAM_MODE_RECOMMENDED",
      "HIGH_UNIQUE_STRING_COUNT",
    ]));
    expect(report.estimates.maxSheetRows).toBe(50_001);
    expect(report.estimates.uniqueStringCount).toBeGreaterThanOrEqual(100_000);
    expect(report.reasons.join(" ")).toContain("50,000 rows");
  });

  it("surfaces compatibility warnings for veryHidden sheets and dynamic formulas", () => {
    const report = SpreadsheetEngine.preflight({
      sheets: [
        {
          name: "Visible",
          rows: [
            {
              cells: [{ value: "anchor" }],
            },
          ],
        },
        {
          name: "HiddenModel",
          state: "veryHidden",
          rows: [
            {
              cells: [
                {
                  formula: {
                    expression: "SEQUENCE(3)",
                    dynamic: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(report.verdict).toBe("warnings");
    expect(report.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "GOOGLE_SHEETS_IMPORT_RISK",
    ]));
    expect(report.findings.some((finding) => finding.message.includes("veryHidden"))).toBe(true);
    expect(report.findings.some((finding) => finding.message.includes("dynamic-array"))).toBe(true);
  });

  it("keeps the large-10k ZIP estimate within the benchmark tolerance band", async () => {
    const document = getPhase1Fixture("large-10k").document;
    const report = SpreadsheetEngine.preflight(document);
    const rendered = await SpreadsheetEngine.renderWithMetrics(document);
    const deltaRatio = report.estimates.projectedZipBytes === 0
      ? 0
      : Math.abs(rendered.metrics.outputSizeBytes - report.estimates.projectedZipBytes) / report.estimates.projectedZipBytes;

    expect(deltaRatio).toBeLessThanOrEqual(0.35);
  });

  it("builds a deterministic render plan with staged parts and bounded row chunks", () => {
    const plan = SpreadsheetEngine.plan({
      sheets: [
        {
          name: "Plan",
          autoFilter: true,
          freezePane: { row: 1, col: 1 },
          rows: Array.from({ length: 250 }, (_unused, rowIndex) => ({
            cells: [
              { value: `row-${rowIndex}` },
              { value: rowIndex, formula: rowIndex === 0 ? undefined : `A${rowIndex + 1}` },
              { value: "https://runstamp.com", hyperlink: "https://runstamp.com" },
            ],
          })),
        },
      ],
    }, {
      rowChunkSize: 50,
      stringStrategy: "inlineStrings",
    });

    expect(plan.recommendedRenderMode).toBe("buffer");
    expect(plan.rowChunkSize).toBe(100);
    expect(plan.resolvedStringStrategy).toBe("inlineStrings");
    expect(plan.includeSharedStrings).toBe(false);
    expect(plan.sheetPlans).toHaveLength(1);
    expect(plan.sheetPlans[0]).toMatchObject({
      name: "Plan",
      rowCount: 250,
      cellCount: 750,
      chunkSize: 100,
      chunkCount: 3,
      features: {
        autoFilter: true,
        freezePane: true,
        formulas: true,
        hyperlinks: true,
      },
    });
    expect(plan.partManifest).toEqual([
      { path: "[Content_Types].xml", stage: "smallPart" },
      { path: "_rels/.rels", stage: "smallPart" },
      { path: "docProps/core.xml", stage: "smallPart" },
      { path: "docProps/app.xml", stage: "smallPart" },
      { path: "xl/workbook.xml", stage: "smallPart" },
      { path: "xl/_rels/workbook.xml.rels", stage: "smallPart" },
      { path: "xl/styles.xml", stage: "smallPart" },
      { path: "xl/theme/theme1.xml", stage: "smallPart" },
      { path: "xl/worksheets/sheet1.xml", stage: "worksheet" },
      { path: "xl/worksheets/_rels/sheet1.xml.rels", stage: "worksheetRelationship" },
    ]);
  });

  it("renders inline-string workbooks without sharedStrings.xml when requested", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Inline",
          rows: [
            { cells: [{ value: "  padded  " }, { value: "alpha" }] },
            { cells: [{ value: "beta" }, { value: "gamma" }] },
          ],
        },
      ],
    }, {
      stringStrategy: "inlineStrings",
    });

    const zip = await openZip(buffer);
    expect(zip.file("xl/sharedStrings.xml")).toBeNull();

    const contentTypes = await readZipEntry(buffer, "[Content_Types].xml");
    const workbookRels = await readZipEntry(buffer, "xl/_rels/workbook.xml.rels");
    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(contentTypes).not.toContain("/xl/sharedStrings.xml");
    expect(workbookRels).not.toContain("sharedStrings.xml");
    expect(sheet).toContain("<c r=\"A1\" t=\"inlineStr\"><is><t xml:space=\"preserve\">  padded  </t></is></c>");
    expect(sheet).toContain("<c r=\"B1\" t=\"inlineStr\"><is><t>alpha</t></is></c>");
  });

  it("auto-selects inline strings for high-uniqueness workloads", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "AutoInline",
          rows: Array.from({ length: 50_001 }, (_unused, rowIndex) => ({
            cells: [
              { value: `customer-${rowIndex}-alpha` },
              { value: `customer-${rowIndex}-beta` },
              { value: rowIndex },
            ],
          })),
        },
      ],
    });

    const zip = await openZip(buffer);
    expect(zip.file("xl/sharedStrings.xml")).toBeNull();

    const workbookRels = await readZipEntry(buffer, "xl/_rels/workbook.xml.rels");
    const sheet = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(workbookRels).not.toContain("sharedStrings.xml");
    expect(sheet).toContain("t=\"inlineStr\"");
    expect(sheet).not.toContain(" t=\"s\"");
  });
});
