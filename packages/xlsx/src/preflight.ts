import type {
  CellValue,
  SpreadsheetDocument,
  SpreadsheetRenderOptions,
  SpreadsheetSheet,
} from "./types/spreadsheet-ast.js";
import { isErrorValue, isRichTextValue } from "./types/spreadsheet-ast.js";
import type { SpreadsheetFinding, SpreadsheetValidationVerdict } from "./quality/workbook-quality.js";
import { stableStringify } from "./styles/component-registry.js";
import { resolveStyleInput } from "./styles/style-utils.js";

export type SpreadsheetRenderModeRecommendation = "buffer" | "stream";
export type SpreadsheetStringStrategy = "sharedStrings" | "inlineStrings";

export interface SpreadsheetWorkloadEstimate {
  sheetCount: number;
  totalRows: number;
  totalCells: number;
  maxSheetRows: number;
  maxSheetCells: number;
  totalStringCells: number;
  uniqueStringCount: number;
  repeatedStringRatio: number;
  projectedWorksheetXmlBytes: number;
  projectedZipBytes: number;
}

export interface SpreadsheetQualityReport {
  verdict: SpreadsheetValidationVerdict;
  renderModeRecommendation: SpreadsheetRenderModeRecommendation;
  estimatedWorkbookSizeBytes: number;
  estimatedPeakMemoryBytes: number;
  estimatedUniqueStrings: number;
  estimatedStyleCount: number;
  findings: SpreadsheetFinding[];
  recommendedRenderMode: SpreadsheetRenderModeRecommendation;
  recommendedStringStrategy: SpreadsheetStringStrategy;
  estimates: SpreadsheetWorkloadEstimate;
  reasons: string[];
}

function estimateCellXmlBytes(value: CellValue | undefined): number {
  if (value === undefined || value === null) {
    return 16;
  }
  if (isRichTextValue(value)) {
    return 32 + value.reduce((sum, run) => sum + run.text.length, 0);
  }
  if (isErrorValue(value)) {
    return 24 + value.error.length;
  }
  if (typeof value === "string") {
    return 28 + value.length;
  }
  if (typeof value === "boolean") {
    return 22;
  }
  if (value instanceof Date) {
    return 26;
  }
  return 24;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function estimateSharedStringsXmlBytes(uniqueStringCount: number, uniqueStringCharBytes: number): number {
  if (uniqueStringCount === 0) {
    return 0;
  }
  return 64 + uniqueStringCharBytes + (uniqueStringCount * 16);
}

function estimateStylesXmlBytes(estimatedStyleCount: number): number {
  if (estimatedStyleCount <= 1) {
    return 1_000;
  }
  return 1_000 + (estimatedStyleCount * 280);
}

function estimateWorksheetXmlBytes(
  baseCellXmlBytes: number,
  totalRows: number,
  styledCellCount: number,
  rowsWithWrappedText: number,
): number {
  return Math.round(baseCellXmlBytes * 0.9)
    + (totalRows * 10)
    + (styledCellCount * 6)
    + (rowsWithWrappedText * 35);
}

function estimateCompressedWorkbookBytes(options: {
  estimatedStyleCount: number;
  projectedSharedStringsXmlBytes: number;
  projectedStylesXmlBytes: number;
  projectedWorksheetXmlBytes: number;
  recommendedStringStrategy: SpreadsheetStringStrategy;
  repeatedStringRatio: number;
  rowsWithWrappedText: number;
  sheetCount: number;
  styledCellCount: number;
  totalCells: number;
  totalRows: number;
}): number {
  const styledCellRatio = options.totalCells === 0 ? 0 : options.styledCellCount / options.totalCells;
  const wrappedRowRatio = options.totalRows === 0 ? 0 : options.rowsWithWrappedText / options.totalRows;
  const worksheetCompressionRatio = clamp(
    0.075
      + (styledCellRatio * 0.015)
      + (wrappedRowRatio * 0.01)
      + (options.recommendedStringStrategy === "inlineStrings" ? 0.015 : 0)
      - (options.repeatedStringRatio >= 3 ? 0.005 : 0),
    0.07,
    0.14,
  );
  const sharedStringsCompressionRatio = clamp(
    0.18 - Math.max(0, Math.min(0.06, (options.repeatedStringRatio - 1) * 0.015)),
    0.1,
    0.18,
  );
  const stylesCompressionRatio = clamp(
    0.24
      + Math.min(0.03, styledCellRatio * 0.03)
      + Math.min(0.04, (options.estimatedStyleCount / 5_000) * 0.04),
    0.24,
    0.34,
  );
  const projectedSmallPartBytes = 4_500 + (options.sheetCount * 500);

  return Math.round(
    projectedSmallPartBytes
      + (options.projectedWorksheetXmlBytes * worksheetCompressionRatio)
      + (options.projectedSharedStringsXmlBytes * sharedStringsCompressionRatio)
      + (options.projectedStylesXmlBytes * stylesCompressionRatio),
  );
}

function collectStringValue(value: CellValue | undefined): string | null {
  if (value === undefined || value === null || isErrorValue(value)) {
    return null;
  }
  if (isRichTextValue(value)) {
    return value.map((run) => run.text).join("");
  }
  return typeof value === "string" ? value : null;
}

function collectStyleKey(
  prefix: string,
  style: unknown,
  styleKeyCache: WeakMap<object, string>,
): string | undefined {
  if (style === undefined) {
    return undefined;
  }
  if (typeof style === "string") {
    return `${prefix}:${style}`;
  }
  if (typeof style !== "object" || style === null) {
    return `${prefix}:${String(style)}`;
  }

  const cached = styleKeyCache.get(style);
  if (cached !== undefined) {
    return `${prefix}:${cached}`;
  }

  const serialized = stableStringify(style);
  styleKeyCache.set(style, serialized);
  return `${prefix}:${serialized}`;
}

function styleUsesWrapText(
  style: unknown,
  wrapTextCache: WeakMap<object, boolean>,
): boolean {
  if (style === undefined) {
    return false;
  }
  if (typeof style === "string") {
    return resolveStyleInput(style)?.alignment?.wrapText === true;
  }
  if (typeof style !== "object" || style === null) {
    return false;
  }

  const cached = wrapTextCache.get(style);
  if (cached !== undefined) {
    return cached;
  }

  const wrapped = resolveStyleInput(style)?.alignment?.wrapText === true;
  wrapTextCache.set(style, wrapped);
  return wrapped;
}

function sheetCompatibilityFindings(sheet: SpreadsheetSheet): SpreadsheetFinding[] {
  const findings: SpreadsheetFinding[] = [];

  if (sheet.state === "veryHidden") {
    findings.push({
      code: "GOOGLE_SHEETS_IMPORT_RISK",
      severity: "warning",
      category: "compatibility",
      message: `Sheet ${sheet.name} uses veryHidden state, which may not round-trip cleanly in Google Sheets`,
      location: { sheetName: sheet.name },
      repairable: false,
      crossAppCritical: true,
    });
  }

  const hasDynamicFormula = sheet.rows.some((row) => row.cells.some((cell) => (
    typeof cell.formula === "object" && cell.formula !== null && cell.formula.dynamic === true
  )));
  if (hasDynamicFormula) {
    findings.push({
      code: "GOOGLE_SHEETS_IMPORT_RISK",
      severity: "warning",
      category: "compatibility",
      message: `Sheet ${sheet.name} contains dynamic-array formula metadata that may import differently across spreadsheet apps`,
      location: { sheetName: sheet.name },
      repairable: false,
      crossAppCritical: true,
    });
  }

  return findings;
}

function verdictFromFindings(findings: SpreadsheetFinding[]): SpreadsheetValidationVerdict {
  if (findings.some((finding) => finding.severity === "error")) {
    return "errors";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "warnings";
  }
  return "clean";
}

export function preflightSpreadsheet(
  document: SpreadsheetDocument,
  options?: SpreadsheetRenderOptions,
): SpreadsheetQualityReport {
  const stringCounts = new Map<string, number>();
  const styleKeyCache = new WeakMap<object, string>();
  const wrapTextCache = new WeakMap<object, boolean>();
  const styleKeys = new Set<string>();
  let uniqueStringCharBytes = 0;
  let totalRows = 0;
  let totalCells = 0;
  let maxSheetRows = 0;
  let maxSheetCells = 0;
  let totalStringCells = 0;
  let baseCellXmlBytes = 0;
  let styledCellCount = 0;
  let rowsWithWrappedText = 0;
  const findings: SpreadsheetFinding[] = [];

  document.sheets.forEach((sheet) => {
    totalRows += sheet.rows.length;
    maxSheetRows = Math.max(maxSheetRows, sheet.rows.length);
    findings.push(...sheetCompatibilityFindings(sheet));
    const headerStyleKey = collectStyleKey("header", sheet.styling?.headerRow, styleKeyCache);
    if (headerStyleKey) {
      styleKeys.add(headerStyleKey);
    }
    const oddStyleKey = collectStyleKey("odd", sheet.styling?.alternateRows?.odd, styleKeyCache);
    if (oddStyleKey) {
      styleKeys.add(oddStyleKey);
    }
    const evenStyleKey = collectStyleKey("even", sheet.styling?.alternateRows?.even, styleKeyCache);
    if (evenStyleKey) {
      styleKeys.add(evenStyleKey);
    }

    let sheetCellCount = 0;
    sheet.rows.forEach((row) => {
      sheetCellCount += row.cells.length;
      let rowHasWrappedText = false;
      row.cells.forEach((cell) => {
        totalCells += 1;
        baseCellXmlBytes += estimateCellXmlBytes(cell.value);
        const stringValue = collectStringValue(cell.value);
        if (stringValue !== null) {
          totalStringCells += 1;
          if (!stringCounts.has(stringValue)) {
            uniqueStringCharBytes += stringValue.length;
          }
          stringCounts.set(stringValue, (stringCounts.get(stringValue) ?? 0) + 1);
        }
        if (cell.style !== undefined) {
          styledCellCount += 1;
          const styleKey = collectStyleKey("cell", cell.style, styleKeyCache);
          if (styleKey) {
            styleKeys.add(styleKey);
          }
          if (styleUsesWrapText(cell.style, wrapTextCache)) {
            rowHasWrappedText = true;
          }
        }
      });
      if (rowHasWrappedText) {
        rowsWithWrappedText += 1;
      }
    });
    maxSheetCells = Math.max(maxSheetCells, sheetCellCount);
    for (const formatting of sheet.conditionalFormatting ?? []) {
      for (const rule of formatting.rules) {
        if ("style" in rule) {
          const styleKey = collectStyleKey("cf", rule.style, styleKeyCache);
          if (styleKey) {
            styleKeys.add(styleKey);
          }
        }
      }
    }
  });

  const uniqueStringCount = stringCounts.size;
  const estimatedStyleCount = styleKeys.size;
  const repeatedStringRatio = uniqueStringCount === 0 ? 1 : totalStringCells / uniqueStringCount;
  const reasons: string[] = [];

  let recommendedRenderMode: SpreadsheetRenderModeRecommendation = "buffer";
  if (options?.largeDataset) {
    recommendedRenderMode = "stream";
    reasons.push("Caller marked workbook as largeDataset");
  }
  if (maxSheetRows > 50_000) {
    recommendedRenderMode = "stream";
    reasons.push(`A sheet exceeds 50,000 rows (${maxSheetRows})`);
  }
  const highStringVolume = totalStringCells >= 100_000 || baseCellXmlBytes > 32 * 1024 * 1024;
  let recommendedStringStrategy: SpreadsheetStringStrategy = "sharedStrings";
  if (uniqueStringCount >= 100_000) {
    recommendedStringStrategy = "inlineStrings";
    reasons.push(`Projected unique string count is high (${uniqueStringCount})`);
  } else if (highStringVolume && repeatedStringRatio <= 1.5 && totalStringCells > 0) {
    recommendedStringStrategy = "inlineStrings";
    reasons.push(`Repeated string ratio is low (${repeatedStringRatio.toFixed(2)}x) under high string volume`);
  } else if ((uniqueStringCount * 32) > 32 * 1024 * 1024) {
    recommendedStringStrategy = "inlineStrings";
    reasons.push("Projected sharedStrings.xml exceeds 32MB");
  }

  const projectedWorksheetXmlBytes = estimateWorksheetXmlBytes(
    baseCellXmlBytes,
    totalRows,
    styledCellCount,
    rowsWithWrappedText,
  );
  const projectedSharedStringsXmlBytes = recommendedStringStrategy === "sharedStrings"
    ? estimateSharedStringsXmlBytes(uniqueStringCount, uniqueStringCharBytes)
    : 0;
  const projectedStylesXmlBytes = estimateStylesXmlBytes(estimatedStyleCount);
  const projectedZipBytes = estimateCompressedWorkbookBytes({
    estimatedStyleCount,
    projectedSharedStringsXmlBytes,
    projectedStylesXmlBytes,
    projectedWorksheetXmlBytes,
    recommendedStringStrategy,
    repeatedStringRatio,
    rowsWithWrappedText,
    sheetCount: document.sheets.length,
    styledCellCount,
    totalCells,
    totalRows,
  });
  const estimatedPeakMemoryBytes = projectedWorksheetXmlBytes
    + projectedSharedStringsXmlBytes
    + projectedStylesXmlBytes
    + (estimatedStyleCount * 256)
    + Math.round(projectedZipBytes * 0.25);

  if (totalCells > 1_000_000) {
    recommendedRenderMode = "stream";
    reasons.push(`Total cell count exceeds 1,000,000 (${totalCells})`);
  }
  if (projectedWorksheetXmlBytes > 64 * 1024 * 1024) {
    recommendedRenderMode = "stream";
    reasons.push(`Projected worksheet XML exceeds 64MB (${projectedWorksheetXmlBytes} bytes)`);
  }
  if (projectedZipBytes > 20 * 1024 * 1024) {
    recommendedRenderMode = "stream";
    reasons.push(`Projected ZIP size exceeds 20MB (${projectedZipBytes} bytes)`);
  }
  if (recommendedRenderMode === "stream") {
    findings.push({
      code: "STREAM_MODE_RECOMMENDED",
      severity: "warning",
      category: "operational",
      message: "Workbook shape exceeds the conservative buffer-mode thresholds; stream mode is recommended",
      metadata: {
        maxSheetRows,
        totalCells,
        projectedWorksheetXmlBytes,
        projectedZipBytes,
      },
      repairable: false,
      crossAppCritical: false,
    });
  }
  if (projectedZipBytes > 20 * 1024 * 1024 || projectedWorksheetXmlBytes > 64 * 1024 * 1024) {
    findings.push({
      code: "LARGE_FILE_WARNING",
      severity: "warning",
      category: "operational",
      message: "Workbook is projected to be large enough to create render, transfer, or import friction",
      metadata: {
        projectedZipBytes,
        projectedWorksheetXmlBytes,
      },
      repairable: false,
      crossAppCritical: false,
    });
  }

  if (uniqueStringCount >= 100_000 || (highStringVolume && repeatedStringRatio <= 1.5 && totalStringCells > 0)) {
    findings.push({
      code: "HIGH_UNIQUE_STRING_COUNT",
      severity: "warning",
      category: "operational",
      message: "Workbook has enough unique-string pressure that inline strings are likely safer than sharedStrings",
      metadata: {
        uniqueStringCount,
        totalStringCells,
        repeatedStringRatio: Number(repeatedStringRatio.toFixed(2)),
      },
      repairable: false,
      crossAppCritical: false,
    });
  }
  if (estimatedStyleCount > 4_000) {
    findings.push({
      code: "EXCESSIVE_STYLE_CARDINALITY",
      severity: "warning",
      category: "operational",
      message: `Workbook is estimated to use ${estimatedStyleCount} distinct styles, which risks compatibility and file-size issues`,
      metadata: { estimatedStyleCount },
      repairable: false,
      crossAppCritical: false,
    });
  }

  if (reasons.length === 0) {
    reasons.push("Workbook fits the buffer-mode thresholds");
  }

  return {
    verdict: verdictFromFindings(findings),
    renderModeRecommendation: recommendedRenderMode,
    estimatedWorkbookSizeBytes: projectedZipBytes,
    estimatedPeakMemoryBytes,
    estimatedUniqueStrings: uniqueStringCount,
    estimatedStyleCount,
    findings,
    recommendedRenderMode,
    recommendedStringStrategy,
    estimates: {
      sheetCount: document.sheets.length,
      totalRows,
      totalCells,
      maxSheetRows,
      maxSheetCells,
      totalStringCells,
      uniqueStringCount,
      repeatedStringRatio,
      projectedWorksheetXmlBytes,
      projectedZipBytes,
    },
    reasons,
  };
}
