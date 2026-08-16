import type {
  CellValue,
  SpreadsheetDocument,
  SpreadsheetRenderOptions,
  SpreadsheetSheet,
} from "./types/spreadsheet-ast.js";
import { isErrorValue, isRichTextValue } from "./types/spreadsheet-ast.js";
import {
  preflightSpreadsheet,
  type SpreadsheetQualityReport,
  type SpreadsheetRenderModeRecommendation,
  type SpreadsheetStringStrategy,
} from "./preflight.js";
import { getSheetColumnCount } from "./layout/column-width.js";
import { isDeterministicModeEnabled } from "./deterministic-mode.js";

const DEFAULT_ROW_CHUNK_SIZE = 1_000;
const MIN_ROW_CHUNK_SIZE = 100;
const MAX_ROW_CHUNK_SIZE = 10_000;

export type SpreadsheetRequestedStringStrategy = "auto" | SpreadsheetStringStrategy;

export interface SpreadsheetPartManifestEntry {
  path: string;
  stage: "smallPart" | "worksheet" | "worksheetRelationship" | "trailingGlobal";
}

export interface SpreadsheetSheetRenderPlan {
  name: string;
  rowCount: number;
  cellCount: number;
  columnCount: number;
  chunkSize: number;
  chunkCount: number;
  estimatedWorksheetXmlBytes: number;
  features: {
    mergedCells: boolean;
    freezePane: boolean;
    autoFilter: boolean;
    dataValidations: boolean;
    hyperlinks: boolean;
    conditionalFormatting: boolean;
    printSetup: boolean;
    formulas: boolean;
    tables: boolean;
  };
}

export interface SpreadsheetRenderPlan {
  deterministic: boolean;
  recommendedRenderMode: SpreadsheetRenderModeRecommendation;
  requestedStringStrategy: SpreadsheetRequestedStringStrategy;
  resolvedStringStrategy: SpreadsheetStringStrategy;
  includeSharedStrings: boolean;
  rowChunkSize: number;
  qualityReport: SpreadsheetQualityReport;
  sheetPlans: SpreadsheetSheetRenderPlan[];
  partManifest: SpreadsheetPartManifestEntry[];
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

function clampRowChunkSize(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_ROW_CHUNK_SIZE;
  }
  return Math.min(MAX_ROW_CHUNK_SIZE, Math.max(MIN_ROW_CHUNK_SIZE, Math.floor(value)));
}

function buildSheetPlan(sheet: SpreadsheetSheet, rowChunkSize: number): SpreadsheetSheetRenderPlan {
  let cellCount = 0;
  let estimatedWorksheetXmlBytes = 0;
  let hasCellMerges = false;
  let hasHyperlinks = false;
  let hasFormulas = false;
  for (const row of sheet.rows) {
    estimatedWorksheetXmlBytes += 24;
    cellCount += row.cells.length;
    for (const cell of row.cells) {
      const formula = cell.formula;
      const cachedValue = typeof formula === "string" ? cell.value : (formula?.cachedValue ?? cell.value);
      estimatedWorksheetXmlBytes += estimateCellXmlBytes(cachedValue);
      if (formula) {
        estimatedWorksheetXmlBytes += 18 + (typeof formula === "string" ? formula.length : formula.expression.length);
      }
      if (cell.hyperlink) {
        estimatedWorksheetXmlBytes += 32;
      }
      hasHyperlinks ||= cell.hyperlink !== undefined;
      hasFormulas ||= cell.formula !== undefined;
      hasCellMerges ||= (cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1;
    }
  }

  return {
    name: sheet.name,
    rowCount: sheet.rows.length,
    cellCount,
    columnCount: getSheetColumnCount(sheet),
    chunkSize: rowChunkSize,
    chunkCount: Math.max(1, Math.ceil(Math.max(sheet.rows.length, 1) / rowChunkSize)),
    estimatedWorksheetXmlBytes,
    features: {
      mergedCells: Boolean(sheet.mergedCells?.length) || hasCellMerges,
      freezePane: sheet.freezePane !== undefined,
      autoFilter: sheet.autoFilter !== undefined && sheet.autoFilter !== false,
      dataValidations: Boolean(sheet.dataValidations?.length),
      hyperlinks: hasHyperlinks,
      conditionalFormatting: Boolean(sheet.conditionalFormatting?.length),
      printSetup: sheet.pageSetup !== undefined,
      formulas: hasFormulas,
      tables: Boolean(sheet.tables?.length),
    },
  };
}

function buildPartManifest(
  document: SpreadsheetDocument,
  sheetPlans: SpreadsheetSheetRenderPlan[],
  includeSharedStrings: boolean,
): SpreadsheetPartManifestEntry[] {
  const manifest: SpreadsheetPartManifestEntry[] = [
    { path: "[Content_Types].xml", stage: "smallPart" },
    { path: "_rels/.rels", stage: "smallPart" },
    { path: "docProps/core.xml", stage: "smallPart" },
    { path: "docProps/app.xml", stage: "smallPart" },
    { path: "xl/workbook.xml", stage: "smallPart" },
    { path: "xl/_rels/workbook.xml.rels", stage: "smallPart" },
    { path: "xl/styles.xml", stage: "smallPart" },
    { path: "xl/theme/theme1.xml", stage: "smallPart" },
  ];

  sheetPlans.forEach((_sheetPlan, index) => {
    manifest.push({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      stage: "worksheet",
    });
  });

  sheetPlans.forEach((sheetPlan, index) => {
    if (!sheetPlan.features.hyperlinks && !sheetPlan.features.tables) {
      return;
    }
    manifest.push({
      path: `xl/worksheets/_rels/sheet${index + 1}.xml.rels`,
      stage: "worksheetRelationship",
    });
  });

  if (includeSharedStrings) {
    manifest.push({
      path: "xl/sharedStrings.xml",
      stage: "trailingGlobal",
    });
  }

  let nextTableId = 1;
  document.sheets.forEach((sheet) => {
    sheet.tables?.forEach(() => {
      manifest.push({
        path: `xl/tables/table${nextTableId}.xml`,
        stage: "trailingGlobal",
      });
      nextTableId += 1;
    });
  });

  return manifest;
}

export function createRenderPlan(
  document: SpreadsheetDocument,
  options?: SpreadsheetRenderOptions,
): SpreadsheetRenderPlan {
  const qualityReport = preflightSpreadsheet(document, options);
  const requestedStringStrategy = options?.stringStrategy ?? "auto";
  const resolvedStringStrategy = requestedStringStrategy !== "auto"
    ? requestedStringStrategy
    : qualityReport.recommendedStringStrategy;
  const rowChunkSize = clampRowChunkSize(options?.rowChunkSize);
  const sheetPlans = document.sheets.map((sheet) => buildSheetPlan(sheet, rowChunkSize));
  const includeSharedStrings = resolvedStringStrategy === "sharedStrings";

  return {
    deterministic: options?.deterministic ?? isDeterministicModeEnabled(),
    recommendedRenderMode: qualityReport.recommendedRenderMode,
    requestedStringStrategy,
    resolvedStringStrategy,
    includeSharedStrings,
    rowChunkSize,
    qualityReport,
    sheetPlans,
    partManifest: buildPartManifest(document, sheetPlans, includeSharedStrings),
  };
}
