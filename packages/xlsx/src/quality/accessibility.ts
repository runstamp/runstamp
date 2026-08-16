import type {
  AccessibilityFix as ProtocolAccessibilityFix,
  AccessibilityIssue as ProtocolAccessibilityIssue,
  AccessibilityRemediationResult as ProtocolAccessibilityRemediationResult,
  AccessibilityReport as ProtocolAccessibilityReport,
  AccessibilitySeverity as ProtocolAccessibilitySeverity,
  AccessibilitySummary as ProtocolAccessibilitySummary,
} from "./accessibility-contract.js";
import { parseRangeRef } from "../utils/cell-ref.js";
import type {
  AccessibilityConfig,
  AccessibilityConfigBase,
  SpreadsheetCell,
  SpreadsheetDocument,
  SpreadsheetImage,
  SpreadsheetSheet,
  SpreadsheetTable,
} from "../types/spreadsheet-ast.js";

export type AccessibilityIssueCode = ProtocolAccessibilityIssue["code"];
export type AccessibilitySeverity = ProtocolAccessibilitySeverity;

export interface AccessibilityIssue extends ProtocolAccessibilityIssue {
  path?: string;
}

export interface AccessibilitySummary extends ProtocolAccessibilitySummary {
  titleSet: boolean;
  languageSet: boolean;
  sheets: number;
  tablesChecked: number;
  tablesWithHeaders: number;
  tablesWithoutHeaders: number;
  imagesChecked: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
}

export interface AccessibilityReport extends ProtocolAccessibilityReport {
  summary: AccessibilitySummary;
  issues: AccessibilityIssue[];
}

export type AccessibilityFix = ProtocolAccessibilityFix;

export interface AccessibilityRemediationResult extends ProtocolAccessibilityRemediationResult {
  reportBefore: AccessibilityReport;
  reportAfter: AccessibilityReport;
  document: SpreadsheetDocument;
}

export type SpreadsheetAccessibilityConfig = AccessibilityConfig;
export type SpreadsheetAccessibilityConfigBase = AccessibilityConfigBase;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cloneValue<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (Buffer.isBuffer(value)) {
    return Buffer.from(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }
  if (value && typeof value === "object") {
    const cloned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      cloned[key] = cloneValue(entry);
    }
    return cloned as T;
  }
  return value;
}

function getAccessibilityConfig(document: SpreadsheetDocument): AccessibilityConfig | undefined {
  if (!document.accessible || document.accessible === true) {
    return undefined;
  }
  return document.accessible;
}

function getEffectiveTitle(document: SpreadsheetDocument, config?: AccessibilityConfig): string | undefined {
  return config?.title ?? document.meta?.title;
}

function getEffectiveLanguage(document: SpreadsheetDocument, config?: AccessibilityConfig): string | undefined {
  return config?.language ?? document.meta?.language;
}

function collectSummary(document: SpreadsheetDocument): AccessibilitySummary {
  return {
    errors: 0,
    warnings: 0,
    infos: 0,
    titleSet: false,
    languageSet: false,
    sheets: document.sheets.length,
    tablesChecked: 0,
    tablesWithHeaders: 0,
    tablesWithoutHeaders: 0,
    imagesChecked: 0,
    imagesWithAlt: 0,
    imagesWithoutAlt: 0,
  };
}

function resolveCellText(cell: SpreadsheetCell | undefined): string | undefined {
  if (!cell) {
    return undefined;
  }
  const value = cell.formula && typeof cell.formula === "object"
    ? cell.formula.cachedValue
    : cell.value;
  if (isNonEmptyString(value)) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    const text = value.map((run) => run.text).join("").trim();
    return text.length > 0 ? text : undefined;
  }
  if (value && typeof value === "object" && "error" in value) {
    return value.error;
  }
  return undefined;
}

function hasHeaderMetadata(table: SpreadsheetTable): boolean {
  return Boolean(table.columns?.length && table.columns.every((column) => isNonEmptyString(column.name)));
}

function getHeaderNamesFromFirstRow(sheet: SpreadsheetSheet, table: SpreadsheetTable): string[] | undefined {
  const range = parseRangeRef(table.ref);
  const row = sheet.rows[range.startRow];
  const names: string[] = [];
  for (let column = range.startCol; column <= range.endCol; column += 1) {
    const text = resolveCellText(row?.cells[column]);
    if (!text) {
      return undefined;
    }
    names.push(text);
  }
  return names;
}

function summarizeIssue(summary: AccessibilitySummary, severity: AccessibilitySeverity): void {
  if (severity === "error") {
    summary.errors += 1;
  } else if (severity === "warning") {
    summary.warnings += 1;
  } else {
    summary.infos += 1;
  }
}

export function validateSpreadsheetAccessibility(document: SpreadsheetDocument): AccessibilityReport {
  const config = getAccessibilityConfig(document);
  const summary = collectSummary(document);
  const issues: AccessibilityIssue[] = [];

  const title = getEffectiveTitle(document, config);
  if (isNonEmptyString(title)) {
    summary.titleSet = true;
  } else {
    summarizeIssue(summary, "warning");
    issues.push({
      code: "document.title_missing",
      severity: "warning",
      message: "Workbook title is missing.",
      suggestedFix: "Set meta.title or accessible.title to a descriptive workbook title.",
      path: "meta.title",
    });
  }

  const language = getEffectiveLanguage(document, config);
  if (isNonEmptyString(language)) {
    summary.languageSet = true;
  } else {
    summarizeIssue(summary, "warning");
    issues.push({
      code: "document.language_missing",
      severity: "warning",
      message: "Workbook language is missing.",
      suggestedFix: "Set meta.language or accessible.language to a BCP 47 language tag.",
      path: "meta.language",
    });
  }

  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.tables?.forEach((table, tableIndex) => {
      summary.tablesChecked += 1;
      if (hasHeaderMetadata(table)) {
        summary.tablesWithHeaders += 1;
        return;
      }
      summary.tablesWithoutHeaders += 1;
      summarizeIssue(summary, "warning");
      issues.push({
        code: "table.header_missing",
        severity: "warning",
        message: `Table ${table.name} is missing header metadata.`,
        path: `sheets[${sheetIndex}].tables[${tableIndex}]`,
        suggestedFix: "Populate table.columns with the first row headers or provide named columns.",
      });
    });

    sheet.images?.forEach((image: SpreadsheetImage, imageIndex) => {
      summary.imagesChecked += 1;
      if (isNonEmptyString(image.description)) {
        summary.imagesWithAlt += 1;
        return;
      }
      summary.imagesWithoutAlt += 1;
      summarizeIssue(summary, "warning");
      issues.push({
        code: "image.alt_missing",
        severity: "warning",
        message: `Image ${image.name ?? imageIndex + 1} is missing alternative text.`,
        path: `sheets[${sheetIndex}].images[${imageIndex}]`,
        suggestedFix: "Set image.description to a concise alt text description.",
      });
    });
  });

  return {
    valid: issues.length === 0,
    format: "xlsx",
    standard: "WCAG 2.1 AA",
    summary,
    issues,
  };
}

export function remediateSpreadsheetAccessibility(document: SpreadsheetDocument): AccessibilityRemediationResult {
  const before = validateSpreadsheetAccessibility(document);
  const clone = cloneValue(document);
  const config = getAccessibilityConfig(clone);
  const fixesApplied: AccessibilityFix[] = [];

  clone.meta ??= {};

  if (!isNonEmptyString(clone.meta.title)) {
    const title = getEffectiveTitle(document, config);
    if (isNonEmptyString(title)) {
      clone.meta.title = title;
      fixesApplied.push({
        code: "document.title_missing",
        action: "propagate workbook title into meta.title",
        applied: true,
        target: "meta.title",
      });
    }
  }

  if (!isNonEmptyString(clone.meta.language)) {
    const language = getEffectiveLanguage(document, config);
    if (isNonEmptyString(language)) {
      clone.meta.language = language;
      fixesApplied.push({
        code: "document.language_missing",
        action: "propagate workbook language into meta.language",
        applied: true,
        target: "meta.language",
      });
    }
  }

  clone.sheets.forEach((sheet, sheetIndex) => {
    sheet.tables?.forEach((table, tableIndex) => {
      if (hasHeaderMetadata(table)) {
        return;
      }
      const names = getHeaderNamesFromFirstRow(sheet, table);
      if (!names) {
        return;
      }
      table.columns = names.map((name, index) => ({
        ...table.columns?.[index],
        name,
      }));
      fixesApplied.push({
        code: "table.header_missing",
        action: "copy the existing first row into table.columns metadata",
        applied: true,
        target: `sheets[${sheetIndex}].tables[${tableIndex}]`,
      });
    });

    sheet.images?.forEach((image, imageIndex) => {
      if (isNonEmptyString(image.description)) {
        return;
      }
      image.description = "Image";
      fixesApplied.push({
        code: "image.alt_missing",
        action: "apply the default alt text placeholder",
        applied: true,
        target: `sheets[${sheetIndex}].images[${imageIndex}]`,
      });
    });
  });

  const after = validateSpreadsheetAccessibility(clone);
  return {
    reportBefore: before,
    reportAfter: after,
    fixesApplied,
    document: clone,
  };
}
