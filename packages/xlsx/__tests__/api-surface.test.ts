import { describe, expect, it } from "vitest";
import {
  SpreadsheetEngine,
  formula,
  // Type imports — verifying these compile without error proves they are exported
  type AccessibilityConfigBase,
  type AccessibilityIssue,
  type AccessibilityReport,
  type AccessibilityRemediationResult,
  type SpreadsheetDocument,
  type SpreadsheetSheet,
  type SpreadsheetCell,
  type SpreadsheetCellComment,
  type SpreadsheetImage,
  type SpreadsheetImageAnchor,
  type SpreadsheetSheetProtection,
  type SpreadsheetConditionalFormatting,
  type SpreadsheetConditionalFormattingRule,
  type SpreadsheetTable,
  type SpreadsheetDataValidation,
  type SpreadsheetFreezePane,
  type SpreadsheetPageSetup,
  type SpreadsheetNamedRange,
  type SpreadsheetPivotChart,
  type SpreadsheetPivotDimension,
  type SpreadsheetPivotTable,
  type SpreadsheetPivotValueField,
  type SpreadsheetRichTextValue,
  type SpreadsheetHyperlink,
  type SpreadsheetCellFormula,
  type SpreadsheetRenderOptions,
  type SpreadsheetMeta,
  type ThemeConfig,
  type SpreadsheetDefaults,
  type CellValue,
  type SpreadsheetRenderResult,
  type SpreadsheetRenderMetrics,
} from "../src/index.js";

describe("API surface: SpreadsheetEngine static methods", () => {
  it("has all expected static methods", () => {
    // Document validation and preflight
    expect(typeof SpreadsheetEngine.validate).toBe("function");
    expect(typeof SpreadsheetEngine.preflight).toBe("function");
    expect(typeof SpreadsheetEngine.plan).toBe("function");

    // Rendering
    expect(typeof SpreadsheetEngine.render).toBe("function");
    expect(typeof SpreadsheetEngine.renderStream).toBe("function");
    expect(typeof SpreadsheetEngine.renderWithMetrics).toBe("function");
    expect(typeof SpreadsheetEngine.validateAccessibility).toBe("function");
    expect(typeof SpreadsheetEngine.remediateAccessibility).toBe("function");

    // Template operations
    expect(typeof SpreadsheetEngine.parseTemplate).toBe("function");
    expect(typeof SpreadsheetEngine.inspectTemplate).toBe("function");
    expect(typeof SpreadsheetEngine.assembleFromTemplate).toBe("function");
    expect(typeof SpreadsheetEngine.assembleFromTemplateStream).toBe("function");

    // Quality / repair
    expect(typeof SpreadsheetEngine.repair).toBe("function");
    expect(typeof SpreadsheetEngine.validateAndRepair).toBe("function");
  });

  it("SpreadsheetEngine methods have correct arity", () => {
    // render takes (doc, options?)
    expect(SpreadsheetEngine.render.length).toBeGreaterThanOrEqual(1);
    // renderStream takes (doc, options?)
    expect(SpreadsheetEngine.renderStream.length).toBeGreaterThanOrEqual(1);
    // preflight takes (doc, options?)
    expect(SpreadsheetEngine.preflight.length).toBeGreaterThanOrEqual(1);
  });
});

describe("API surface: type exports", () => {
  it("key types are importable and usable at module level", () => {
    // If any of these were not exported, this test file would fail to compile.
    // We verify by constructing minimal objects matching the type shapes.
    const doc: SpreadsheetDocument = {
      sheets: [{ name: "Test", rows: [] }],
    };
    expect(doc.sheets.length).toBe(1);

    const accessibilityBase: AccessibilityConfigBase = {
      title: "Report",
      language: "en-US",
    };
    expect(accessibilityBase.title).toBe("Report");

    const issue: AccessibilityIssue = {
      code: "image.alt_missing",
      severity: "warning",
      message: "Missing alt text",
    };
    expect(issue.code).toBe("image.alt_missing");

    const accessibilityReport: AccessibilityReport = {
      valid: false,
      format: "xlsx",
      standard: "WCAG 2.1 AA",
      summary: {
        errors: 0,
        warnings: 1,
        infos: 0,
        titleSet: false,
        languageSet: false,
        sheets: 1,
        tablesChecked: 0,
        tablesWithHeaders: 0,
        tablesWithoutHeaders: 0,
        imagesChecked: 0,
        imagesWithAlt: 0,
        imagesWithoutAlt: 0,
      },
      issues: [issue],
    };
    expect(accessibilityReport.issues).toHaveLength(1);

    const remediation: AccessibilityRemediationResult = {
      reportBefore: accessibilityReport,
      reportAfter: { ...accessibilityReport, valid: true },
      fixesApplied: [],
      document: doc,
    };
    expect(remediation.reportAfter.valid).toBe(true);

    const comment: SpreadsheetCellComment = { text: "Hello" };
    expect(comment.text).toBe("Hello");

    const image: SpreadsheetImage = {
      data: Buffer.from([]),
      type: "png",
      anchor: { from: { col: 0, row: 0 } },
    };
    expect(image.type).toBe("png");

    const anchor: SpreadsheetImageAnchor = {
      from: { col: 0, row: 0, colOffset: 100, rowOffset: 200 },
      to: { col: 5, row: 10 },
    };
    expect(anchor.from.col).toBe(0);

    const protection: SpreadsheetSheetProtection = {
      sheet: true,
      password: "secret",
      formatCells: true,
    };
    expect(protection.sheet).toBe(true);

    const cf: SpreadsheetConditionalFormatting = {
      ref: "A1:A10",
      rules: [
        {
          type: "cellIs",
          operator: "greaterThan",
          formula: "100",
          style: { font: { bold: true } },
        },
      ],
    };
    expect(cf.rules.length).toBe(1);

    const table: SpreadsheetTable = {
      name: "T1",
      ref: "A1:C5",
    };
    expect(table.name).toBe("T1");

    const pivotDimension: SpreadsheetPivotDimension = {
      name: "Region",
      subtotals: ["sum", "max"],
    };
    expect(pivotDimension.name).toBe("Region");

    const pivotValueField: SpreadsheetPivotValueField = {
      name: "Revenue",
      summarizeBy: "sum",
      title: "Total Revenue",
    };
    expect(pivotValueField.title).toBe("Total Revenue");

    const pivotTable: SpreadsheetPivotTable = {
      name: "RevenuePivot",
      sourceSheet: "Data",
      sourceRef: "A1:D6",
      targetCell: "H2",
      rowFields: [pivotDimension],
      valueFields: [pivotValueField],
    };
    expect(pivotTable.name).toBe("RevenuePivot");

    const pivotChart: SpreadsheetPivotChart = {
      pivotTable: "RevenuePivot",
      type: "col",
      anchor: { from: { col: 8, row: 1 } },
    };
    expect(pivotChart.pivotTable).toBe("RevenuePivot");

    const dv: SpreadsheetDataValidation = {
      ref: "B1:B10",
      type: "whole",
      formula1: "1",
    };
    expect(dv.type).toBe("whole");

    const fp: SpreadsheetFreezePane = { row: 1, col: 2 };
    expect(fp.row).toBe(1);

    const ps: SpreadsheetPageSetup = { orientation: "landscape" };
    expect(ps.orientation).toBe("landscape");

    const nr: SpreadsheetNamedRange = { name: "Range1", ref: "Sheet1!A1:B5" };
    expect(nr.name).toBe("Range1");

    const richText: SpreadsheetRichTextValue = [
      { text: "Bold", font: { bold: true } },
      { text: " normal" },
    ];
    expect(richText.length).toBe(2);

    const hyperlink: SpreadsheetHyperlink = { target: "https://example.com" };
    expect((hyperlink as any).target).toBe("https://example.com");

    const meta: SpreadsheetMeta = { title: "Test", creator: "Bot" };
    expect(meta.title).toBe("Test");

    const theme: ThemeConfig = { name: "Custom" };
    expect(theme.name).toBe("Custom");

    const defaults: SpreadsheetDefaults = { font: { family: "Arial", size: 12 } };
    expect(defaults.font!.family).toBe("Arial");

    const opts: SpreadsheetRenderOptions = { deterministic: true, warmPath: true };
    expect(opts.deterministic).toBe(true);
    expect(opts.warmPath).toBe(true);

    const cellValue: CellValue = "hello";
    expect(cellValue).toBe("hello");
  });
});

describe("API surface: formula builder", () => {
  it("is exported and has expected function groups", () => {
    expect(typeof formula).toBe("object");

    // Text/literal helpers
    expect(typeof formula.text).toBe("function");
    expect(typeof formula.bool).toBe("function");
    expect(typeof formula.num).toBe("function");
    expect(typeof formula.date).toBe("function");

    // Cell reference helpers
    expect(typeof formula.cell).toBe("function");
    expect(typeof formula.absCell).toBe("function");
    expect(typeof formula.range).toBe("function");
    expect(typeof formula.absRange).toBe("function");
    expect(typeof formula.ref).toBe("function");

    // Arithmetic operators
    expect(typeof formula.add).toBe("function");
    expect(typeof formula.subtract).toBe("function");
    expect(typeof formula.multiply).toBe("function");
    expect(typeof formula.divide).toBe("function");

    // Aggregation functions
    expect(typeof formula.sum).toBe("function");
    expect(typeof formula.average).toBe("function");
    expect(typeof formula.count).toBe("function");
    expect(typeof formula.min).toBe("function");
    expect(typeof formula.max).toBe("function");

    // Logical
    expect(typeof formula.if).toBe("function");
    expect(typeof formula.and).toBe("function");
    expect(typeof formula.or).toBe("function");
    expect(typeof formula.not).toBe("function");
    expect(typeof formula.iferror).toBe("function");

    // Lookup
    expect(typeof formula.vlookup).toBe("function");
    expect(typeof formula.hlookup).toBe("function");
    expect(typeof formula.index).toBe("function");
    expect(typeof formula.match).toBe("function");

    // String
    expect(typeof formula.trim).toBe("function");
    expect(typeof formula.upper).toBe("function");
    expect(typeof formula.lower).toBe("function");
    expect(typeof formula.concat).toBe("function");
    expect(typeof formula.len).toBe("function");
    expect(typeof formula.left).toBe("function");
    expect(typeof formula.right).toBe("function");
    expect(typeof formula.mid).toBe("function");
    expect(typeof formula.substitute).toBe("function");

    // Date
    expect(typeof formula.today).toBe("function");
    expect(typeof formula.now).toBe("function");
    expect(typeof formula.year).toBe("function");
    expect(typeof formula.month).toBe("function");
    expect(typeof formula.day).toBe("function");
  });

  it("produces correct formula strings", () => {
    expect(formula.sum("A1:A10")).toBe("SUM(A1:A10)");
    expect(formula.vlookup("A1", "B1:D10", "3", "FALSE")).toBe("VLOOKUP(A1,B1:D10,3,FALSE)");
    expect(formula.if("A1>0", formula.text("positive"), formula.text("non-positive")))
      .toBe('IF(A1>0,"positive","non-positive")');
    expect(formula.cell(0, 0)).toBe("A1");
    expect(formula.range(0, 0, 9, 2)).toBe("A1:C10");
    expect(formula.add("A1", "B1")).toBe("A1+B1");
    expect(formula.trim("A1")).toBe("TRIM(A1)");
  });
});

describe("API surface: no internal module leaks", () => {
  it("does not expose internal serializer functions directly", async () => {
    // Attempt to import from the package entry — internal serializers should NOT be reachable
    const exports = await import("../src/index.js");
    const exportedNames = Object.keys(exports);

    // These internal functions should NOT appear in the public API
    const internalPatterns = [
      "serializeComments",
      "serializeCommentsVml",
      "serializeDrawing",
      "serializeDrawingRelationships",
      "serializeCoreProps",
      "serializeAppProps",
      "serializeContentTypes",
      "serializePackageRels",
      "serializeSheetChunks",
      "serializeTableParts",
      "serializeTheme",
      "serializeWorkbook",
      "serializeWorkbookRels",
      "buildWorksheetTableBindings",
    ];

    for (const internal of internalPatterns) {
      expect(exportedNames).not.toContain(internal);
    }
  });
});
