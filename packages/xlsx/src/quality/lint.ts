/**
 * Static lint pass for `SpreadsheetDocument` — pure walker, no rendering.
 *
 * Catches structural issues that produce a syntactically valid workbook but
 * trip Excel at open time (illegal sheet names, conditional-formatting refs
 * outside sheet bounds, `between` rules with single formulas, etc.) Returns
 * `{ ok, issues }`; integrates with the engine via `SpreadsheetEngine.lint()`.
 *
 * Driven by `docs/0428-claude-test-based-directive2.md`
 * §"@runstamp/xlsx" item "expose `SpreadsheetEngine.lint(doc)` ...".
 */
import type { SpreadsheetDocument } from "../types/spreadsheet-ast.js";
import { isChartSeriesEmpty } from "../charts/chart-data.js";
import { MAX_EXCEL_COLUMN_WIDTH } from "../layout/column-width.js";
import { chartCrossesEstimatedPageBreak, sheetExceedsPrintableWidth } from "../layout/print-layout.js";
import { parseRangeRef } from "../utils/cell-ref.js";

export type SpreadsheetLintIssueCode =
  | "XLSX_LINT_SHEET_NAME_TOO_LONG"
  | "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS"
  | "XLSX_LINT_SHEET_NAME_RESERVED"
  | "XLSX_LINT_SHEET_NAME_DUPLICATE"
  | "XLSX_LINT_AUTOFILTER_OUT_OF_BOUNDS"
  | "XLSX_LINT_AUTOFILTER_INVALID_REF"
  | "XLSX_LINT_CF_REF_OUT_OF_BOUNDS"
  | "XLSX_LINT_CF_REF_INVALID"
  | "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE"
  | "XLSX_LINT_COLUMN_WIDTH_CAPPED"
  | "XLSX_LINT_CHART_EMPTY_SERIES"
  | "XLSX_LINT_WIDE_PRINT_RANGE"
  | "XLSX_LINT_CHART_CROSSES_PAGE_BREAK";

export interface SpreadsheetLintIssue {
  severity: "error" | "warning";
  code: SpreadsheetLintIssueCode;
  message: string;
  path: string;
  suggestion?: string;
}

export interface SpreadsheetLintResult {
  ok: boolean;
  issues: SpreadsheetLintIssue[];
}

const SHEET_NAME_MAX_LEN = 31;
const SHEET_NAME_ILLEGAL = /[\\/?*[\]:]/;
const RESERVED_SHEET_NAMES = new Set(["history"]);

interface SheetBounds {
  rowCount: number;
  colCount: number;
}

function computeSheetBounds(sheet: SpreadsheetDocument["sheets"][number]): SheetBounds {
  const rowCount = sheet.rows.length;
  let colCount = sheet.columns?.length ?? 0;
  for (const row of sheet.rows) {
    if (row.cells.length > colCount) {
      colCount = row.cells.length;
    }
  }
  return { rowCount, colCount };
}

function lintSheetName(
  name: string,
  index: number,
  seen: Map<string, number>,
  issues: SpreadsheetLintIssue[],
): void {
  const path = `sheets[${index}].name`;
  if (name.length > SHEET_NAME_MAX_LEN) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_TOO_LONG",
      message: `Sheet name "${name}" is ${name.length} characters; Excel allows at most ${SHEET_NAME_MAX_LEN}.`,
      path,
      suggestion: `Truncate to ${SHEET_NAME_MAX_LEN} characters.`,
    });
  }
  if (SHEET_NAME_ILLEGAL.test(name)) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS",
      message: `Sheet name "${name}" contains characters Excel rejects (\\ / ? * [ ] :).`,
      path,
    });
  }
  if (name.startsWith("'") || name.endsWith("'")) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS",
      message: `Sheet name "${name}" cannot start or end with an apostrophe.`,
      path,
    });
  }
  const lower = name.toLowerCase();
  if (RESERVED_SHEET_NAMES.has(lower)) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_RESERVED",
      message: `Sheet name "${name}" is reserved by Excel (case-insensitive).`,
      path,
    });
  }
  const prior = seen.get(lower);
  if (prior !== undefined) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_DUPLICATE",
      message: `Sheet name "${name}" duplicates sheets[${prior}] (Excel compares case-insensitively).`,
      path,
    });
  } else {
    seen.set(lower, index);
  }
}

function lintAutoFilter(
  sheet: SpreadsheetDocument["sheets"][number],
  index: number,
  bounds: SheetBounds,
  issues: SpreadsheetLintIssue[],
): void {
  const af = sheet.autoFilter;
  if (!af || af === true) return;
  const path = `sheets[${index}].autoFilter.ref`;
  let parsed;
  try {
    parsed = parseRangeRef(af.ref);
  } catch {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_AUTOFILTER_INVALID_REF",
      message: `autoFilter ref "${af.ref}" is not a valid A1-style range.`,
      path,
    });
    return;
  }
  if (
    parsed.endRow >= bounds.rowCount
    || parsed.endCol >= bounds.colCount
    || parsed.startRow < 0
    || parsed.startCol < 0
  ) {
    issues.push({
      severity: "warning",
      code: "XLSX_LINT_AUTOFILTER_OUT_OF_BOUNDS",
      message:
        `autoFilter ref "${af.ref}" extends past sheet bounds `
        + `(rows=${bounds.rowCount}, cols=${bounds.colCount}). Excel may discard or truncate the filter.`,
      path,
    });
  }
}

function lintConditionalFormatting(
  sheet: SpreadsheetDocument["sheets"][number],
  index: number,
  bounds: SheetBounds,
  issues: SpreadsheetLintIssue[],
): void {
  const cfList = sheet.conditionalFormatting;
  if (!cfList || cfList.length === 0) return;
  cfList.forEach((cf, cfIndex) => {
    const refs = cf.ref.split(/\s+/).filter(Boolean);
    refs.forEach((ref, refIndex) => {
      const path = `sheets[${index}].conditionalFormatting[${cfIndex}].ref[${refIndex}]`;
      let parsed;
      try {
        parsed = parseRangeRef(ref);
      } catch {
        issues.push({
          severity: "error",
          code: "XLSX_LINT_CF_REF_INVALID",
          message: `Conditional-formatting ref "${ref}" is not a valid A1-style range.`,
          path,
        });
        return;
      }
      if (
        parsed.endRow >= bounds.rowCount
        || parsed.endCol >= bounds.colCount
        || parsed.startRow < 0
        || parsed.startCol < 0
      ) {
        issues.push({
          severity: "warning",
          code: "XLSX_LINT_CF_REF_OUT_OF_BOUNDS",
          message:
            `Conditional-formatting ref "${ref}" extends past sheet bounds `
            + `(rows=${bounds.rowCount}, cols=${bounds.colCount}).`,
          path,
        });
      }
    });
    cf.rules.forEach((rule, ruleIndex) => {
      if (rule.type !== "cellIs") return;
      const isRange = rule.operator === "between" || rule.operator === "notBetween";
      const isTuple = Array.isArray(rule.formula);
      if (isRange && !isTuple) {
        issues.push({
          severity: "error",
          code: "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE",
          message:
            `cellIs rule with operator "${rule.operator}" requires a [lower, upper] tuple formula; got a string.`,
          path: `sheets[${index}].conditionalFormatting[${cfIndex}].rules[${ruleIndex}].formula`,
          suggestion: "Pass formula as `[lowerExpr, upperExpr]`.",
        });
      } else if (!isRange && isTuple) {
        issues.push({
          severity: "error",
          code: "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE",
          message:
            `cellIs rule with operator "${rule.operator}" requires a single formula string; got a tuple.`,
          path: `sheets[${index}].conditionalFormatting[${cfIndex}].rules[${ruleIndex}].formula`,
        });
      }
    });
  });
}

function lintColumnWidths(
  document: SpreadsheetDocument,
  issues: SpreadsheetLintIssue[],
): void {
  const defaultColumnWidth = document.defaults?.columnWidth;
  if (defaultColumnWidth !== undefined && defaultColumnWidth > MAX_EXCEL_COLUMN_WIDTH) {
    issues.push({
      severity: "warning",
      code: "XLSX_LINT_COLUMN_WIDTH_CAPPED",
      message:
        `Default column width ${defaultColumnWidth} exceeds Excel's maximum `
        + `of ${MAX_EXCEL_COLUMN_WIDTH}; output is capped at ${MAX_EXCEL_COLUMN_WIDTH}.`,
      path: "defaults.columnWidth",
      suggestion: `Use a column width no greater than ${MAX_EXCEL_COLUMN_WIDTH}.`,
    });
  }

  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.columns?.forEach((column, columnIndex) => {
      if ((column.width ?? 0) <= MAX_EXCEL_COLUMN_WIDTH) {
        return;
      }
      issues.push({
        severity: "warning",
        code: "XLSX_LINT_COLUMN_WIDTH_CAPPED",
        message:
          `Column width ${column.width} exceeds Excel's maximum of ${MAX_EXCEL_COLUMN_WIDTH}; `
          + `output is capped at ${MAX_EXCEL_COLUMN_WIDTH}.`,
        path: `sheets[${sheetIndex}].columns[${columnIndex}].width`,
        suggestion: `Use a column width no greater than ${MAX_EXCEL_COLUMN_WIDTH}.`,
      });
    });
  });
}

function lintCharts(
  document: SpreadsheetDocument,
  issues: SpreadsheetLintIssue[],
): void {
  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.charts?.forEach((chart, chartIndex) => {
      if (chartCrossesEstimatedPageBreak(sheet, chart, document.defaults)) {
        issues.push({
          severity: "warning",
          code: "XLSX_LINT_CHART_CROSSES_PAGE_BREAK",
          message: "Chart anchor crosses an estimated vertical print-page break and may be split when printed.",
          path: `sheets[${sheetIndex}].charts[${chartIndex}].anchor`,
          suggestion: "Move the chart below the break, reduce its height, or use fitToHeight=1.",
        });
      }
      chart.series.forEach((series, seriesIndex) => {
        if (!isChartSeriesEmpty(document, sheet.name, series.values)) {
          return;
        }
        issues.push({
          severity: "warning",
          code: "XLSX_LINT_CHART_EMPTY_SERIES",
          message: series.values.trim() === ""
            ? "Chart series has no value range; output contains an explicit empty placeholder."
            : `Chart series value range "${series.values}" contains only empty cells; output contains an explicit empty cache placeholder.`,
          path: `sheets[${sheetIndex}].charts[${chartIndex}].series[${seriesIndex}].values`,
          suggestion: "Populate the referenced cells or remove the empty series.",
        });
      });
    });
  });
}

export function lintSpreadsheetDocument(document: SpreadsheetDocument): SpreadsheetLintResult {
  const issues: SpreadsheetLintIssue[] = [];
  const seenNames = new Map<string, number>();
  lintColumnWidths(document, issues);
  document.sheets.forEach((sheet, index) => {
    lintSheetName(sheet.name, index, seenNames, issues);
    const bounds = computeSheetBounds(sheet);
    lintAutoFilter(sheet, index, bounds, issues);
    lintConditionalFormatting(sheet, index, bounds, issues);
    if (sheetExceedsPrintableWidth(sheet, document.defaults)) {
      issues.push({
        severity: "warning",
        code: "XLSX_LINT_WIDE_PRINT_RANGE",
        message: "The used columns exceed the printable page width and may be clipped or split into orphaned column groups.",
        path: `sheets[${index}].pageSetup`,
        suggestion: "Set pageSetup.fitToWidth=1 or use landscape orientation.",
      });
    }
  });
  lintCharts(document, issues);
  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
