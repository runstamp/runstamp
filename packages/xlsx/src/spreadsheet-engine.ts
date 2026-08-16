import {
  assembleXlsx,
  assembleXlsxStreamable,
  assembleXlsxWithMetadata,
  type XlsxAssemblyResult,
  type XlsxParts,
  type XlsxStreamableParts,
} from "./assembly/xlsx-assembler.js";
import { FormulaEvaluator } from "./formulas/evaluator.js";
import { preflightSpreadsheet } from "./preflight.js";
import {
  repairSpreadsheetBuffer,
  validateAndRepairSpreadsheetBuffer,
  validateSpreadsheetBuffer,
  type SpreadsheetBufferValidateOptions,
  type SpreadsheetRepairOptions,
  type SpreadsheetRepairResult,
  type SpreadsheetRepairValidationResult,
  type SpreadsheetValidationSummary,
} from "./quality/workbook-quality.js";
import { buildSharedSpreadsheetQualityReport } from "./quality/shared-quality.js";
import type {
  SpreadsheetPartRenderMetrics,
  SpreadsheetRenderKeyPartBytes,
  SpreadsheetRenderResult,
  SpreadsheetRenderStageMetrics,
} from "./render-metrics.js";
import { createRenderPlan } from "./render-plan.js";
import {
  assembleFromTemplate,
  assembleFromTemplateStream,
  type SpreadsheetTemplateAssemblyInput,
  type SpreadsheetTemplateAssemblyOptions,
} from "./template-assembler.js";
import { inspectTemplate, parseTemplate, type SpreadsheetTemplateIndex, type SpreadsheetTemplateInspectionReport, type SpreadsheetTemplateParseOptions } from "./template-parser.js";
import type { SpreadsheetDocument, SpreadsheetRenderOptions } from "./types/spreadsheet-ast.js";
import { serializeChart } from "./serializers/chart-serializer.js";
import { serializeComments, serializeCommentsVml } from "./serializers/comment-serializer.js";
import { serializeDrawing, serializeDrawingRelationships } from "./serializers/drawing-serializer.js";
import type { DrawingChartEntry, DrawingRelationshipEntry } from "./serializers/drawing-serializer.js";
import { serializeCoreProps, serializeAppProps } from "./serializers/doc-props-serializer.js";
import { serializeContentTypes, serializePackageRels } from "./serializers/package-serializer.js";
import { buildPivotArtifacts, serializePivotTableRelationships } from "./serializers/pivot-serializer.js";
import { serializeSheetChunks } from "./serializers/sheet-serializer.js";
import { buildWorksheetTableBindings, serializeTableParts } from "./serializers/table-serializer.js";
import { SharedStringTable } from "./serializers/shared-strings.js";
import { StyleRegistry } from "./serializers/style-registry.js";
import { serializeTheme } from "./serializers/theme-serializer.js";
import { serializeWorkbook, serializeWorkbookRels } from "./serializers/workbook-serializer.js";
import { validateSpreadsheetDocument } from "./validation/spreadsheet-schema.js";
import {
  getWorkerSheetSerializationEligibility,
  isWorkerSheetSerializationPoolPrimed,
  serializeSheetsInWorkers,
  type WorkerSheetSerializationTask,
} from "./workers/sheet-serialization-worker-pool.js";
import {
  remediateSpreadsheetAccessibility,
  validateSpreadsheetAccessibility,
  type AccessibilityReport as SpreadsheetAccessibilityReport,
  type AccessibilityRemediationResult as SpreadsheetAccessibilityRemediationResult,
} from "./quality/accessibility.js";
import {
  lintSpreadsheetDocument,
  type SpreadsheetLintResult,
} from "./quality/lint.js";
import type { RenderWithQualityResult } from "./public-quality-types.js";

const MIN_WORKER_SERIALIZATION_CELL_COUNT = 100_000;
const MIN_WORKER_SERIALIZATION_XML_BYTES = 4_000_000;
const PRINT_PAGE_DEDICATED_CHART_PREFERRED_ROW_SPAN = 34;
const PRINT_PAGE_DASHBOARD_CHART_ROW_SPAN = 18;
const PRINT_PAGE_DASHBOARD_MINIMUM_TABLE_ROWS = 9;
const PRINT_PAGE_COMPACT_MARGINS = {
  bottom: 0.3,
  footer: 0.15,
  header: 0.15,
  left: 0.35,
  right: 0.35,
  top: 0.3,
} as const;

function rebalanceOnePageDashboardColumns(
  sheet: SpreadsheetDocument["sheets"][number],
): SpreadsheetDocument["sheets"][number]["columns"] {
  if (sheet.columns === undefined) return undefined;
  const longestText = sheet.columns.map((_column, columnIndex) => Math.max(
    0,
    ...sheet.rows.map((row) => {
      const value = row.cells[columnIndex]?.value;
      return typeof value === "string" ? value.length : 0;
    }),
  ));
  const wrapColumn = sheet.columns.findIndex((column, columnIndex) => (
    column.width !== undefined
    && column.width >= 24
    && (longestText[columnIndex] ?? 0) > column.width * 1.35
  ));
  if (wrapColumn < 0) return sheet.columns;
  return sheet.columns.map((column, columnIndex) => {
    if (column.width === undefined) return column;
    const textLength = longestText[columnIndex] ?? 0;
    if (columnIndex === wrapColumn) {
      return { ...column, width: Math.min(48, Math.ceil(column.width * 1.1)) };
    }
    if (textLength > column.width * 1.2) {
      const divisor = column.width >= 24 ? 1.55 : 1.2;
      return { ...column, width: Math.min(38, Math.max(column.width, Math.ceil(textLength / divisor))) };
    }
    if (textLength < column.width * 0.85) {
      return { ...column, width: Math.max(6, Math.ceil(textLength * 1.05)) };
    }
    return column;
  });
}

function spanPrintNarratives(
  sheet: SpreadsheetDocument["sheets"][number],
): SpreadsheetDocument["sheets"][number] {
  const columnCount = sheet.columns?.length ?? 0;
  if (columnCount < 2) return sheet;
  const totalColumnWidth = sheet.columns?.reduce((sum, column) => sum + (column.width ?? 8.43), 0) ?? 0;
  let changed = false;
  const rows = sheet.rows.map((row) => {
    const cell = row.cells[0];
    const style = typeof cell?.style === "object" && cell.style !== null ? cell.style : undefined;
    const fontSize = style?.font?.size ?? 11;
    const shouldSpan = row.cells.length === 1
      && typeof cell?.value === "string"
      && cell.colSpan === undefined
      && fontSize <= 10
      && cell.value.length > totalColumnWidth * 1.15;
    if (!shouldSpan) return row;
    changed = true;
    return {
      ...row,
      cells: [{
        ...cell,
        colSpan: columnCount,
        style: {
          ...style,
          alignment: {
            ...style?.alignment,
            vertical: style?.alignment?.vertical ?? "top",
            wrapText: true,
          },
        },
      }],
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}

function repeatPrintContinuationContext(
  sheet: SpreadsheetDocument["sheets"][number],
): SpreadsheetDocument["sheets"][number] {
  const titleRows = sheet.pageSetup?.printTitles?.rows;
  const usedColumnCount = Math.max(
    sheet.columns?.length ?? 0,
    ...sheet.rows.map((row) => row.cells.length),
  );
  if (
    sheet.pageSetup?.fitToWidth !== 1
    || titleRows === undefined
    || titleRows.start === 0
    || sheet.rows.length < 30
    || usedColumnCount > 11
    || !sheet.rows.slice(0, titleRows.start).every((row) => row.cells.length <= 1)
  ) return sheet;
  const titleCell = sheet.rows[0]?.cells[0];
  const titleStyle = typeof titleCell?.style === "object" && titleCell.style !== null ? titleCell.style : undefined;
  if (
    typeof titleCell?.value !== "string"
    || (titleStyle?.font?.size ?? 0) < 12
  ) return sheet;
  return {
    ...sheet,
    pageSetup: {
      ...sheet.pageSetup,
      margins: sheet.pageSetup.margins ?? PRINT_PAGE_COMPACT_MARGINS,
      printTitles: {
        ...sheet.pageSetup.printTitles,
        rows: { start: 0, end: titleRows.end },
      },
    },
  };
}

function styleUnformattedChartSheetChrome(
  sheet: SpreadsheetDocument["sheets"][number],
): SpreadsheetDocument["sheets"][number] {
  if ((sheet.charts?.length ?? 0) === 0) return sheet;
  let changed = false;
  const rows = sheet.rows.map((row, rowIndex) => {
    if (
      rowIndex === 0
      && row.cells.length === 1
      && typeof row.cells[0]?.value === "string"
      && row.cells[0].style === undefined
    ) {
      changed = true;
      return {
        ...row,
        height: row.height ?? 28,
        cells: [{
          ...row.cells[0],
          style: {
            font: { bold: true, color: "FF203A4F", size: 18 },
            alignment: { vertical: "center" as const },
          },
        }],
      };
    }
    const unformattedHeader = rowIndex > 0
      && row.cells.length >= 2
      && row.cells.every((cell) => typeof cell.value === "string" && cell.style === undefined);
    if (!unformattedHeader) return row;
    changed = true;
    return {
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        style: {
          font: { bold: true, color: "FFFFFFFF" },
          fill: { type: "solid" as const, fgColor: "FF203A4F" },
          alignment: { vertical: "center" as const },
        },
      })),
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}

function polishPrintTableSemantics(
  sheet: SpreadsheetDocument["sheets"][number],
): SpreadsheetDocument["sheets"][number] {
  const repeatedHeaderIndex = sheet.pageSetup?.printTitles?.rows?.start;
  const keyValueRowIndices = new Set(
    sheet.rows.slice(0, 10).flatMap((row, rowIndex) => (
      row.cells.length === 2 && typeof row.cells[0]?.value === "string"
        ? [rowIndex]
        : []
    )),
  );
  const normalizeKeyValues = keyValueRowIndices.size >= 3
    && sheet.rows.some((row) => row.cells.length >= 5);
  let changed = false;
  const rows = sheet.rows.map((row, rowIndex) => {
    if (
      rowIndex === repeatedHeaderIndex
      && row.cells.length >= 2
      && row.cells.every((cell) => typeof cell.value === "string")
    ) {
      changed = true;
      return {
        ...row,
        cells: row.cells.map((cell, columnIndex) => {
          const style = typeof cell.style === "object" && cell.style !== null ? cell.style : {};
          return {
            ...cell,
            style: {
              ...style,
              border: {
                ...style.border,
                ...(columnIndex > 0 ? { left: { style: "thin" as const, color: "FFFFFFFF" } } : {}),
              },
              alignment: {
                ...style.alignment,
                ...(style.alignment?.horizontal === "left" ? { indent: Math.max(1, style.alignment.indent ?? 0) } : {}),
                vertical: style.alignment?.vertical ?? "center",
                wrapText: true,
              },
            },
          };
        }),
      };
    }
    if (!normalizeKeyValues || !keyValueRowIndices.has(rowIndex)) return row;
    changed = true;
    return {
      ...row,
      cells: row.cells.map((cell, columnIndex) => {
        const style = typeof cell.style === "object" && cell.style !== null ? cell.style : {};
        return {
          ...cell,
          style: {
            ...style,
            ...(columnIndex === 0
              ? { font: { ...style.font, bold: true } }
              : (typeof cell.value !== "string" || cell.value.length <= 14
                  ? { alignment: { ...style.alignment, horizontal: "right" as const } }
                  : {})),
          },
        };
      }),
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}

function topAlignRowsWithWrappedText(
  sheet: SpreadsheetDocument["sheets"][number],
): SpreadsheetDocument["sheets"][number] {
  let changed = false;
  const rows = sheet.rows.map((row) => {
    const wraps = row.cells.some((cell, columnIndex) => {
      const style = typeof cell.style === "object" && cell.style !== null ? cell.style : undefined;
      const width = sheet.columns?.[columnIndex]?.width;
      return (
        typeof cell.value === "string"
        && width !== undefined
        && cell.value.length > width * 1.35
        && style?.alignment?.wrapText !== false
      );
    });
    // Multi-column records with one materially wrapped field otherwise leave
    // their neighbouring values visually attached to the wrapped field's
    // second line. Do not rewrite compact key/value rows or explicit vertical
    // alignment choices.
    if (!wraps || row.cells.length < 3) return row;
    changed = true;
    return {
      ...row,
      cells: row.cells.map((cell) => {
        const style = typeof cell.style === "object" && cell.style !== null ? cell.style : {};
        if (style.alignment?.vertical !== undefined) return cell;
        return {
          ...cell,
          style: {
            ...style,
            alignment: { ...style.alignment, vertical: "top" as const },
          },
        };
      }),
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}

function normalizeNonnegativeDataBarBaselines(
  sheet: SpreadsheetDocument["sheets"][number],
): SpreadsheetDocument["sheets"][number] {
  if (!sheet.conditionalFormatting) return sheet;
  const conditionalFormatting = sheet.conditionalFormatting.map((entry) => {
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/u.exec(entry.ref);
    if (!match || match[1] !== match[3]) return entry;
    const columnLetters = match[1];
    let columnIndex = 0;
    for (const character of columnLetters) columnIndex = columnIndex * 26 + character.charCodeAt(0) - 64;
    columnIndex -= 1;
    const startRow = Number(match[2]) - 1;
    const endRow = Number(match[4]) - 1;
    const values = sheet.rows.slice(startRow, endRow + 1).map((row) => row.cells[columnIndex]?.value);
    const allNonnegative = values.length > 0 && values.every((value) => typeof value === "number" && value >= 0);
    if (!allNonnegative) return entry;
    return {
      ...entry,
      rules: entry.rules.map((rule) => (
        rule.type === "dataBar" && rule.min.type === "min"
          ? { ...rule, min: { type: "num" as const, value: 0 } }
          : rule
      )),
    };
  });
  return { ...sheet, conditionalFormatting };
}

function optimizePrintPageChartAnchors(document: SpreadsheetDocument): SpreadsheetDocument {
  return {
    ...document,
    sheets: document.sheets.map((sourceSheet) => {
      const sheet = spanPrintNarratives(normalizeNonnegativeDataBarBaselines(topAlignRowsWithWrappedText(
        polishPrintTableSemantics(styleUnformattedChartSheetChrome(repeatPrintContinuationContext(sourceSheet))),
      )));
      const charts = sheet.charts ?? [];
      const compactSideBySideChart = sheet.pageSetup == null
        && sheet.rows.length <= 18
        && charts.length > 0
        && charts.length <= 2
        && charts.every((chart) => chart.anchor.from.row < sheet.rows.length && chart.anchor.from.col > 0);
      if (compactSideBySideChart) {
        const chartStartRow = sheet.rows.length + 1;
        const chartValueRanges = new Set(charts.flatMap((chart) => chart.series.flatMap((series) => (
          typeof series.values === "string"
            ? [series.values.split("!").at(-1)!.replaceAll("$", "")]
            : []
        ))));
        const conditionalFormatting = sheet.conditionalFormatting?.flatMap((entry) => {
          if (!chartValueRanges.has(entry.ref.replaceAll("$", ""))) return [entry];
          const rules = entry.rules.filter((rule) => rule.type !== "dataBar");
          return rules.length > 0 ? [{ ...entry, rules }] : [];
        });
        return {
          ...sheet,
          conditionalFormatting: conditionalFormatting?.length ? conditionalFormatting : undefined,
          columns: sheet.columns?.map((column, columnIndex) => ({
            ...column,
            width: column.width === undefined
              ? undefined
              : (columnIndex < 2 ? column.width * 5 : Math.max(8, column.width)),
          })),
          pageSetup: {
            fitToHeight: 1,
            fitToWidth: 1,
            margins: PRINT_PAGE_COMPACT_MARGINS,
            orientation: "landscape",
            paperSize: 11,
          },
          charts: charts.map((chart) => ({
            ...chart,
            anchor: {
              // A short table beside a tall chart leaves an unusable void below
              // the table. Stack the chart below the data so both elements use
              // the page width and read in natural top-to-bottom order.
              from: { ...chart.anchor.from, col: 0, row: chartStartRow },
              to: {
                col: 2,
                row: chartStartRow + 32,
              },
            },
          })),
        };
      }
      const printFitted = sheet.pageSetup?.scale === undefined
        && sheet.pageSetup?.fitToWidth === 1;
      const chartsFollowData = charts.length > 0
        && charts.every((chart) => chart.anchor.from.row >= sheet.rows.length);
      const composeDashboardOnOnePage = printFitted
        && chartsFollowData
        && charts.length <= 2
        // Nine rows are enough substantive table context to balance a chart
        // on the same page. Shorter source tables retain a dedicated chart
        // page so a tiny key/value block does not squeeze the visualization.
        && sheet.rows.length >= PRINT_PAGE_DASHBOARD_MINIMUM_TABLE_ROWS
        && sheet.rows.length <= 36;
      if (composeDashboardOnOnePage) {
        const chartStartRow = sheet.rows.length + 1;
        const usedColumnCount = Math.max(
          sheet.columns?.length ?? 0,
          ...sheet.rows.map((row) => row.cells.length),
        );
        const splitColumn = Math.max(4, Math.ceil(usedColumnCount / 2));
        return {
          ...sheet,
          columns: charts.length === 1
            ? rebalanceOnePageDashboardColumns(sheet)
            : sheet.columns,
          pageSetup: {
            ...sheet.pageSetup,
            fitToHeight: 1,
            margins: sheet.pageSetup?.margins ?? PRINT_PAGE_COMPACT_MARGINS,
          },
          charts: charts.map((chart, index) => {
            const sideBySide = charts.length === 2;
            const fromColumn = sideBySide ? index * splitColumn : 0;
            const toColumn = sideBySide
              ? (index + 1) * splitColumn
              : Math.max(8, usedColumnCount);
            return {
              ...chart,
              anchor: {
                from: { ...chart.anchor.from, col: fromColumn, row: chartStartRow },
                to: {
                  col: toColumn,
                  row: chartStartRow + PRINT_PAGE_DASHBOARD_CHART_ROW_SPAN,
                },
              },
            };
          }),
        };
      }
      let nextDedicatedChartRow = sheet.rows.length + 1;
      return {
        ...sheet,
        charts: charts.map((chart) => {
          const endRow = chart.anchor.to?.row
            ?? chart.anchor.from.row + Math.ceil((chart.height ?? 300) / 20);
          const rowSpan = endRow - chart.anchor.from.row;
          const chartFollowsData = chart.anchor.from.row >= sheet.rows.length;
          const printFitted = sheet.pageSetup?.scale === undefined
            && sheet.pageSetup?.fitToWidth === 1;
          if (!printFitted || !chartFollowsData) {
            return chart;
          }
          const printAnchorRow = nextDedicatedChartRow;
          // This branch is exclusively for charts placed after the tabular
          // data on a dedicated print page. Give that page a full-height
          // canvas even when the source table is compact; using the combined
          // table/chart budget here strands a large blank lower band.
          const printRowSpan = Math.max(rowSpan, PRINT_PAGE_DEDICATED_CHART_PREFERRED_ROW_SPAN);
          nextDedicatedChartRow = printAnchorRow + printRowSpan + 1;
          return {
            ...chart,
            anchor: {
              from: { ...chart.anchor.from, row: printAnchorRow },
              to: {
                col: Math.max(
                  chart.anchor.to?.col ?? 0,
                  chart.anchor.from.col + 8,
                  sheet.columns?.length ?? 0,
                ),
                row: printAnchorRow + printRowSpan,
              },
            },
          };
        }),
      };
    }),
  };
}

export type SpreadsheetEngineCapability =
  | "quality-reporting"
  | "repair-pipeline"
  | "template-assembly";

type SpreadsheetWarmPathScaffold = {
  effectiveMeta: SpreadsheetDocument["meta"];
  firstVisibleSheetIndex: number;
  plan: ReturnType<typeof createRenderPlan>;
  pivotArtifacts: ReturnType<typeof buildPivotArtifacts>;
  tableBindingsBySheet: ReturnType<typeof buildWorksheetTableBindings>;
};

export class SpreadsheetEngine {
  private static readonly warmPathCacheLimit = 8;
  private static readonly warmPathCache = new Map<string, SpreadsheetWarmPathScaffold>();

  private static durationMs(start: bigint, end: bigint): number {
    return Number(end - start) / 1_000_000;
  }

  static validateDocument(document: unknown): SpreadsheetDocument {
    return validateSpreadsheetDocument(document);
  }

  static supports(capability: SpreadsheetEngineCapability): boolean {
    switch (capability) {
      case "quality-reporting":
        return true;
      case "repair-pipeline":
      case "template-assembly":
        return true;
      default:
        return false;
    }
  }

  static validateAccessibility(document: SpreadsheetDocument): SpreadsheetAccessibilityReport {
    const validated = validateSpreadsheetDocument(document);
    return validateSpreadsheetAccessibility(validated);
  }

  /**
   * Static lint pass — detects structural issues Excel rejects but our
   * Zod schema accepts (sheet name length/chars, autoFilter/CF refs out of
   * bounds, between/notBetween formula shape, duplicate names case-insensitive).
   * Pure walker; no rendering side effects.
   */
  static lint(document: SpreadsheetDocument): SpreadsheetLintResult {
    return lintSpreadsheetDocument(document);
  }

  static remediateAccessibility(document: SpreadsheetDocument): SpreadsheetAccessibilityRemediationResult {
    const validated = validateSpreadsheetDocument(document);
    return remediateSpreadsheetAccessibility(validated);
  }

  static validate(document: unknown): SpreadsheetDocument;
  static validate(buffer: Buffer, options?: SpreadsheetBufferValidateOptions): Promise<SpreadsheetValidationSummary>;
  static validate(
    input: unknown,
    options?: SpreadsheetBufferValidateOptions,
  ): SpreadsheetDocument | Promise<SpreadsheetValidationSummary> {
    if (Buffer.isBuffer(input)) {
      return validateSpreadsheetBuffer(input, options);
    }
    return this.validateDocument(input);
  }

  static preflight(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ) {
    const validated = validateSpreadsheetDocument(document, options);
    return preflightSpreadsheet(validated, options);
  }

  static async renderWithQuality(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): Promise<RenderWithQualityResult> {
    const validated = validateSpreadsheetDocument(document, options);
    const rendered = await this.renderValidatedWithMetrics(validated, options);
    const qualityResult = await validateAndRepairSpreadsheetBuffer(rendered.buffer, {
      deterministic: options?.deterministic,
    });
    const output = qualityResult.repair.repaired ? qualityResult.repair.buffer : rendered.buffer;
    return {
      output,
      quality: buildSharedSpreadsheetQualityReport(
        qualityResult,
        rendered.metrics.totalGenerationTimeMs,
      ),
    };
  }

  static plan(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ) {
    const validated = validateSpreadsheetDocument(document, options);
    return createRenderPlan(validated, options);
  }

  static async render(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): Promise<Buffer> {
    const validated = validateSpreadsheetDocument(document, options);
    return this.renderValidated(validated, options);
  }

  static async renderStream(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): Promise<NodeJS.ReadableStream> {
    const validated = validateSpreadsheetDocument(document, options);
    return this.renderValidatedStream(validated, options);
  }

  static async renderValidated(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): Promise<Buffer> {
    const rendered = await this.renderValidatedWithMetrics(document, options);
    return rendered.buffer;
  }

  static async renderWithMetrics(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): Promise<SpreadsheetRenderResult> {
    const validated = validateSpreadsheetDocument(document, options);
    return this.renderValidatedWithMetrics(validated, options);
  }

  static async parseTemplate(
    buffer: Buffer,
    options?: SpreadsheetTemplateParseOptions,
  ): Promise<SpreadsheetTemplateIndex> {
    return parseTemplate(buffer, options);
  }

  static inspectTemplate(index: SpreadsheetTemplateIndex): SpreadsheetTemplateInspectionReport {
    return inspectTemplate(index);
  }

  static async assembleFromTemplate(
    index: SpreadsheetTemplateIndex,
    injection: SpreadsheetTemplateAssemblyInput,
    options?: SpreadsheetTemplateAssemblyOptions,
  ): Promise<Buffer> {
    return assembleFromTemplate(index, injection, options);
  }

  static async assembleFromTemplateStream(
    index: SpreadsheetTemplateIndex,
    injection: SpreadsheetTemplateAssemblyInput,
    options?: SpreadsheetTemplateAssemblyOptions,
  ): Promise<NodeJS.ReadableStream> {
    return assembleFromTemplateStream(index, injection, options);
  }

  static async repair(
    buffer: Buffer,
    options?: SpreadsheetRepairOptions,
  ): Promise<SpreadsheetRepairResult> {
    return repairSpreadsheetBuffer(buffer, options);
  }

  static async validateAndRepair(
    buffer: Buffer,
    options?: SpreadsheetRepairOptions,
  ): Promise<SpreadsheetRepairValidationResult> {
    return validateAndRepairSpreadsheetBuffer(buffer, options);
  }

  private static async renderValidatedWithMetrics(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions & { licenseKey?: string },
  ): Promise<SpreadsheetRenderResult> {
    const renderStart = process.hrtime.bigint();
    const prepared = await this.prepareValidatedWorkbook(document, options);
    const {
      deterministic,
      partMetrics,
      parts,
      plan,
      serializedSheets,
      sharedStrings,
      stringStrategy,
      styleRegistry,
      serializationStageMetrics,
    } = prepared;

    const zipStart = process.hrtime.bigint();
    const assembled = await assembleXlsxWithMetadata(parts, { deterministic });
    const renderEnd = process.hrtime.bigint();
    const totalRowsWritten = serializedSheets.reduce((sum, sheet) => sum + sheet.metrics.totalRowsWritten, 0);
    const totalSerializedRows = serializedSheets.reduce((sum, sheet) => sum + sheet.metrics.totalSerializedRows, 0);
    const totalCellsWritten = serializedSheets.reduce((sum, sheet) => sum + sheet.metrics.totalCellsWritten, 0);
    const archiveFinalizationTimeMs = this.durationMs(zipStart, renderEnd);
    const buffer = assembled.buffer;
    const keyPartBytes = this.collectKeyPartBytes(parts, assembled);

    return {
      buffer,
      plan,
      metrics: {
        renderMode: plan.recommendedRenderMode,
        stringStrategy,
        totalRowsWritten,
        totalSerializedRows,
        totalCellsWritten,
        uniqueStringsCount: sharedStrings?.uniqueCount ?? plan.qualityReport.estimates.uniqueStringCount,
        styleCount: styleRegistry.cellStyleCount,
        estimatedZipSizeBytes: plan.qualityReport.estimates.projectedZipBytes,
        outputSizeBytes: buffer.length,
        outputSizeDeltaBytes: buffer.length - plan.qualityReport.estimates.projectedZipBytes,
        totalGenerationTimeMs: this.durationMs(renderStart, renderEnd),
        zipFinalizationTimeMs: archiveFinalizationTimeMs,
        stageMetrics: {
          ...serializationStageMetrics,
          archiveFinalizationTimeMs,
        },
        keyPartBytes,
        partMetrics,
        sheetMetrics: serializedSheets.map((sheet, index) => ({
          name: document.sheets[index]?.name ?? `Sheet${index + 1}`,
          totalRowsWritten: sheet.metrics.totalRowsWritten,
          totalSerializedRows: sheet.metrics.totalSerializedRows,
          totalCellsWritten: sheet.metrics.totalCellsWritten,
          chunkCount: sheet.metrics.chunkCount,
          chunkMetrics: sheet.rowChunks.map((chunk) => ({
            startRowNumber: chunk.startRowNumber,
            endRowNumber: chunk.endRowNumber,
            sourceRowCount: chunk.sourceRowCount,
            serializedRowCount: chunk.serializedRowCount,
            cellCount: chunk.cellCount,
            byteLength: chunk.byteLength,
          })),
        })),
      },
    };
  }

  private static async renderValidatedStream(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions & { licenseKey?: string },
  ): Promise<NodeJS.ReadableStream> {
    const core = await this.prepareWorkbookCore(document, options);
    const streamableParts: XlsxStreamableParts = {
      contentTypes: core.commonParts.contentTypes,
      packageRels: core.commonParts.packageRels,
      workbook: core.commonParts.workbook,
      workbookRels: core.commonParts.workbookRels,
      styles: core.commonParts.styles,
      sharedStrings: core.commonParts.sharedStrings,
      theme: core.commonParts.theme,
      sheetRelationships: core.commonParts.sheetRelationships,
      tables: core.commonParts.tables,
      pivotTables: core.commonParts.pivotTables,
      pivotTableRelationships: core.commonParts.pivotTableRelationships,
      pivotCacheDefinitions: core.commonParts.pivotCacheDefinitions,
      pivotCacheDefinitionRelationships: core.commonParts.pivotCacheDefinitionRelationships,
      pivotCacheRecords: core.commonParts.pivotCacheRecords,
      comments: core.commonParts.comments,
      vmlDrawings: core.commonParts.vmlDrawings,
      drawings: core.commonParts.drawings,
      drawingRelationships: core.commonParts.drawingRelationships,
      media: core.commonParts.media,
      charts: core.commonParts.charts,
      coreProps: core.commonParts.coreProps,
      appProps: core.commonParts.appProps,
      sheets: core.serializedSheets.map((serializedSheet, index) => ({
        name: `sheet${index + 1}.xml`,
        prefix: serializedSheet.prefix,
        rowChunks: serializedSheet.rowChunks.map((chunk) => chunk.xml),
        suffix: serializedSheet.suffix,
      })),
    };
    return assembleXlsxStreamable(streamableParts, { deterministic: core.deterministic });
  }

  private static async prepareWorkbookCore(
    sourceDocument: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ) {
    const document = optimizePrintPageChartAnchors(sourceDocument);
    const scaffold = this.prepareWarmPathScaffold(document, options);
    const {
      effectiveMeta,
      firstVisibleSheetIndex,
      plan,
      pivotArtifacts,
      tableBindingsBySheet,
    } = scaffold;
    const deterministic = plan.deterministic;
    const stringStrategy = plan.resolvedStringStrategy;
    const dateSystem = document.date1904 ? "1904" : "1900";
    const formulaEvaluator = this.documentHasFormulas(document)
      ? new FormulaEvaluator(document, dateSystem)
      : null;
    const sharedStrings = plan.includeSharedStrings ? new SharedStringTable() : undefined;
    const styleRegistry = new StyleRegistry(document.defaults);

    const worksheetSerializationStart = process.hrtime.bigint();
    const workerEligibility = getWorkerSheetSerializationEligibility({
      document,
      options,
      resolvedStringStrategy: stringStrategy,
    });
    const useWorkerSheetSerialization = workerEligibility.eligible
      && this.shouldUseWorkerSheetSerialization(plan);
    if (useWorkerSheetSerialization && this.documentHasDateValues(document)) {
      styleRegistry.registerStyle(undefined, new Date(Date.UTC(2000, 0, 1)));
    }
    const serializedSheets = useWorkerSheetSerialization
      ? await serializeSheetsInWorkers(document.sheets.map((sheet, index): WorkerSheetSerializationTask => ({
          dateSystem,
          defaults: document.defaults,
          rowChunkSize: plan.rowChunkSize,
          selected: index === (firstVisibleSheetIndex >= 0 ? firstVisibleSheetIndex : 0),
          sheet,
          sheetIndex: index,
          stringStrategy: "inlineStrings",
        })))
      : document.sheets.map((sheet, index) => (
        serializeSheetChunks(sheet, {
          dateSystem,
          defaults: document.defaults,
          formulaEvaluator,
          rowChunkSize: plan.rowChunkSize,
          sharedStrings,
          styleRegistry,
          selected: index === (firstVisibleSheetIndex >= 0 ? firstVisibleSheetIndex : 0),
          sheetIndex: index,
          stringStrategy,
          tableBindings: tableBindingsBySheet[index],
          pivotTableBindings: pivotArtifacts.bindingsBySheet[index],
        })
      ));
    const worksheetSerializationTimeMs = this.durationMs(worksheetSerializationStart, process.hrtime.bigint());

    const serializedTables = serializeTableParts(document, tableBindingsBySheet, formulaEvaluator);
    const commentSheetIndices: number[] = [];
    const commentParts: Array<readonly [string, string]> = [];
    const vmlDrawingParts: Array<readonly [string, string]> = [];
    serializedSheets.forEach((serializedSheet, index) => {
      if (serializedSheet.comments.length === 0) {
        return;
      }
      const sheetNumber = index + 1;
      commentSheetIndices.push(index);
      commentParts.push([
        `comments${sheetNumber}.xml`,
        serializeComments(serializedSheet.comments.map((c) => ({
          ref: c.ref,
          author: c.author,
          text: c.text,
        }))),
      ] as const);
      vmlDrawingParts.push([
        `vmlDrawing${sheetNumber}.vml`,
        serializeCommentsVml(serializedSheet.comments.map((c) => ({
          row: c.row,
          col: c.col,
        }))),
      ] as const);
    });
    const drawingSheetIndices: number[] = [];
    const drawingParts: Array<readonly [string, string]> = [];
    const drawingRelParts: Array<readonly [string, string]> = [];
    const mediaParts: Array<readonly [string, Buffer]> = [];
    const chartParts: Array<readonly [string, string]> = [];
    const imageTypesUsed = new Set<"png" | "jpeg">();
    let globalMediaIndex = 0;
    let globalChartIndex = 0;

    document.sheets.forEach((sheet, index) => {
      const hasImages = sheet.images && sheet.images.length > 0;
      const pivotCharts = pivotArtifacts.pivotChartParts.filter((part) => part.sheetIndex === index);
      const hasCharts = (sheet.charts && sheet.charts.length > 0) || pivotCharts.length > 0;
      if (!hasImages && !hasCharts) {
        return;
      }
      const sheetNumber = index + 1;
      drawingSheetIndices.push(index);

      const drawingImages: Array<{ relationshipId: string; anchor: NonNullable<typeof sheet.images>[0]["anchor"]; name?: string; description?: string; width?: number; height?: number }> = [];
      const drawingCharts: DrawingChartEntry[] = [];
      const drawingRelEntries: DrawingRelationshipEntry[] = [];
      let relIdCounter = 0;

      if (hasImages) {
        sheet.images!.forEach((image) => {
          globalMediaIndex += 1;
          relIdCounter += 1;
          const mediaFileName = `image${globalMediaIndex}.${image.type}`;
          const relationshipId = `rId${relIdCounter}`;
          imageTypesUsed.add(image.type);

          mediaParts.push([mediaFileName, image.data] as const);
          drawingImages.push({
            relationshipId,
            anchor: image.anchor,
            name: image.name,
            description: image.description,
            width: image.width,
            height: image.height,
          });
          drawingRelEntries.push({
            relationshipId,
            target: `../media/${mediaFileName}`,
            type: "image",
          });
        });
      }

      if (hasCharts) {
        sheet.charts?.forEach((chart) => {
          globalChartIndex += 1;
          relIdCounter += 1;
          const chartFileName = `chart${globalChartIndex}.xml`;
          const relationshipId = `rId${relIdCounter}`;

          chartParts.push([
            chartFileName,
            serializeChart(chart, { document, sheetName: sheet.name }),
          ] as const);
          drawingCharts.push({
            relationshipId,
            anchor: chart.anchor,
            name: chart.title,
            width: chart.width,
            height: chart.height,
          });
          drawingRelEntries.push({
            relationshipId,
            target: `../charts/${chartFileName}`,
            type: "chart",
          });
        });

        pivotCharts.forEach((chartPart) => {
          relIdCounter += 1;
          const chartFileName = chartPart.path.replace("xl/charts/", "");
          const relationshipId = `rId${relIdCounter}`;
          chartParts.push([chartFileName, chartPart.xml] as const);
          drawingCharts.push({
            relationshipId,
            anchor: chartPart.definition.anchor,
            name: chartPart.definition.title,
            width: chartPart.definition.width,
            height: chartPart.definition.height,
          });
          drawingRelEntries.push({
            relationshipId,
            target: `../charts/${chartFileName}`,
            type: "chart",
          });
        });
      }

      drawingParts.push([
        `drawing${sheetNumber}.xml`,
        serializeDrawing(drawingImages, drawingCharts),
      ] as const);
      drawingRelParts.push([
        `drawing${sheetNumber}.xml.rels`,
        serializeDrawingRelationships(drawingRelEntries),
      ] as const);
    });

    const sheetRelationships = serializedSheets.flatMap((serializedSheet, index) => (
      serializedSheet.relationships
        ? [[`sheet${index + 1}.xml.rels`, serializedSheet.relationships] as const]
        : []
    ));
    const sheetFeatures = serializedSheets.map((serializedSheet) => ({
      autoFilterRef: serializedSheet.autoFilterRef,
      printArea: serializedSheet.printArea,
      printTitles: serializedSheet.printTitles,
    }));
    const packageSerializationStart = process.hrtime.bigint();
    const contentTypes = serializeContentTypes(document.sheets.length, {
        includeSharedStrings: plan.includeSharedStrings,
        tableCount: serializedTables.length,
        commentSheetIndices,
        drawingSheetIndices,
        imageTypes: [...imageTypesUsed],
        chartCount: globalChartIndex + pivotArtifacts.pivotChartParts.length,
        pivotTableCount: pivotArtifacts.pivotTableParts.length,
        pivotCacheDefinitionCount: pivotArtifacts.pivotCacheDefinitionParts.length,
        pivotCacheRecordCount: pivotArtifacts.pivotCacheRecordParts.length,
      });
    const packageRels = serializePackageRels();
    const workbook = serializeWorkbook(document, { sheetFeatures, pivotCaches: pivotArtifacts.workbookPivotCaches });
    const workbookRels = serializeWorkbookRels(document.sheets.length, {
        includeSharedStrings: plan.includeSharedStrings,
        pivotCaches: pivotArtifacts.workbookPivotCaches,
      });
    const stylesSerializationStart = process.hrtime.bigint();
    const styles = styleRegistry.toXml();
    const stylesSerializationTimeMs = this.durationMs(stylesSerializationStart, process.hrtime.bigint());
    const sharedStringsSerializationStart = process.hrtime.bigint();
    const sharedStringsXml = sharedStrings?.toXml();
    const sharedStringsSerializationTimeMs = this.durationMs(sharedStringsSerializationStart, process.hrtime.bigint());
    const theme = serializeTheme(document.theme);
    const packageSerializationTimeMs = Math.max(
      0,
      this.durationMs(packageSerializationStart, process.hrtime.bigint())
        - stylesSerializationTimeMs
        - sharedStringsSerializationTimeMs,
    );
    const commonParts = {
      contentTypes,
      packageRels,
      workbook,
      workbookRels,
      styles,
      sharedStrings: sharedStringsXml,
      theme,
      sheetRelationships,
      tables: serializedTables.map((table) => [table.path.replace("xl/tables/", ""), table.xml] as const),
      pivotTables: pivotArtifacts.pivotTableParts.map((pivotTable) => [pivotTable.path.replace("xl/pivotTables/", ""), pivotTable.xml] as const),
      pivotTableRelationships: pivotArtifacts.bindingsBySheet.flatMap((bindings) =>
        bindings.map((binding) => [
          `${binding.partName}.rels`,
          serializePivotTableRelationships(binding),
        ] as const),
      ),
      pivotCacheDefinitions: pivotArtifacts.pivotCacheDefinitionParts.map((part) => [part.path.replace("xl/pivotCache/", ""), part.xml] as const),
      pivotCacheDefinitionRelationships: pivotArtifacts.pivotCacheDefinitionRelationshipParts.map((part) => [part.path.replace("xl/pivotCache/_rels/", ""), part.xml] as const),
      pivotCacheRecords: pivotArtifacts.pivotCacheRecordParts.map((part) => [part.path.replace("xl/pivotCache/", ""), part.xml] as const),
      comments: commentParts,
      vmlDrawings: vmlDrawingParts,
      drawings: drawingParts,
      drawingRelationships: drawingRelParts,
      media: mediaParts,
      charts: chartParts,
      coreProps: serializeCoreProps(effectiveMeta, deterministic),
      appProps: serializeAppProps(document.sheets.map((sheet) => sheet.name), effectiveMeta),
    };

    return {
      deterministic,
      plan,
      serializedSheets,
      sharedStrings,
      stringStrategy,
      styleRegistry,
      serializationStageMetrics: {
        worksheetSerializationTimeMs,
        stylesSerializationTimeMs,
        sharedStringsSerializationTimeMs,
        packageSerializationTimeMs,
      },
      commonParts,
    };
  }

  private static prepareWarmPathScaffold(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): SpreadsheetWarmPathScaffold {
    if (options?.warmPath !== true) {
      return this.buildWarmPathScaffold(document, options);
    }

    const key = this.getWarmPathCacheKey(document, options);
    const cached = this.warmPathCache.get(key);
    if (cached) {
      this.warmPathCache.delete(key);
      this.warmPathCache.set(key, cached);
      return cached;
    }

    const scaffold = this.buildWarmPathScaffold(document, options);
    this.warmPathCache.set(key, scaffold);
    if (this.warmPathCache.size > this.warmPathCacheLimit) {
      const oldestKey = this.warmPathCache.keys().next().value;
      if (oldestKey) {
        this.warmPathCache.delete(oldestKey);
      }
    }
    return scaffold;
  }

  private static buildWarmPathScaffold(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): SpreadsheetWarmPathScaffold {
    const accessibilityConfig =
      document.accessible && document.accessible !== true ? document.accessible : undefined;
    const effectiveMeta = accessibilityConfig && (
      accessibilityConfig.language !== undefined
      || accessibilityConfig.title !== undefined
    )
      ? {
          ...document.meta,
          language: accessibilityConfig.language ?? document.meta?.language,
          title: accessibilityConfig.title ?? document.meta?.title,
        }
      : document.meta;
    const plan = createRenderPlan(document, options);
    const dateSystem = document.date1904 ? "1904" : "1900";
    const tableBindingsBySheet = buildWorksheetTableBindings(document);
    const ordinaryChartCount = document.sheets.reduce((sum, sheet) => sum + (sheet.charts?.length ?? 0), 0);
    const pivotArtifacts = buildPivotArtifacts(document, ordinaryChartCount, dateSystem);
    const firstVisibleSheetIndex = document.sheets.findIndex((sheet) => (sheet.state ?? "visible") === "visible");

    return {
      effectiveMeta,
      firstVisibleSheetIndex,
      plan,
      pivotArtifacts,
      tableBindingsBySheet,
    };
  }

  private static getWarmPathCacheKey(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): string {
    const { warmPath: _warmPath, ...normalizedOptions } = options ?? {};
    return JSON.stringify({
      document,
      options: normalizedOptions,
    });
  }

  private static documentHasFormulas(document: SpreadsheetDocument): boolean {
    return document.sheets.some((sheet) => (
      sheet.rows.some((row) => row.cells.some((cell) => cell.formula !== undefined))
    ));
  }

  private static documentHasDateValues(document: SpreadsheetDocument): boolean {
    return document.sheets.some((sheet) => (
      sheet.rows.some((row) => row.cells.some((cell) => cell.value instanceof Date))
    ));
  }

  private static shouldUseWorkerSheetSerialization(
    plan: ReturnType<typeof createRenderPlan>,
  ): boolean {
    if (isWorkerSheetSerializationPoolPrimed()) {
      return true;
    }

    const estimatedCellCount = plan.sheetPlans.reduce((sum, sheet) => sum + sheet.cellCount, 0);
    const estimatedWorksheetXmlBytes = plan.sheetPlans.reduce(
      (sum, sheet) => sum + sheet.estimatedWorksheetXmlBytes,
      0,
    );
    return estimatedCellCount >= MIN_WORKER_SERIALIZATION_CELL_COUNT
      || estimatedWorksheetXmlBytes >= MIN_WORKER_SERIALIZATION_XML_BYTES;
  }

  private static async prepareValidatedWorkbook(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): Promise<{
    deterministic: boolean;
    partMetrics: SpreadsheetPartRenderMetrics[];
    parts: XlsxParts;
    plan: ReturnType<typeof createRenderPlan>;
    serializationStageMetrics: Omit<SpreadsheetRenderStageMetrics, "archiveFinalizationTimeMs">;
    serializedSheets: ReturnType<typeof serializeSheetChunks>[];
    sharedStrings?: SharedStringTable;
    stringStrategy: ReturnType<typeof createRenderPlan>["resolvedStringStrategy"];
    styleRegistry: StyleRegistry;
  }> {
    const core = await this.prepareWorkbookCore(document, options);
    const sheets = core.serializedSheets.map((serializedSheet, index) => ([
      `sheet${index + 1}.xml`,
      serializedSheet.prefix + serializedSheet.rowChunks.map((chunk) => chunk.xml).join("") + serializedSheet.suffix,
    ] as const));
    const parts: XlsxParts = {
      ...core.commonParts,
      sheets,
    };

    return {
      deterministic: core.deterministic,
      partMetrics: this.collectPartMetrics(parts, core.plan.partManifest),
      parts,
      plan: core.plan,
      serializationStageMetrics: core.serializationStageMetrics,
      serializedSheets: core.serializedSheets,
      sharedStrings: core.sharedStrings,
      stringStrategy: core.stringStrategy,
      styleRegistry: core.styleRegistry,
    };
  }

  private static collectPartMetrics(
    parts: Parameters<typeof assembleXlsx>[0],
    manifest: ReturnType<typeof createRenderPlan>["partManifest"],
  ): SpreadsheetPartRenderMetrics[] {
    const partMap = new Map<string, number>([
      ["[Content_Types].xml", Buffer.byteLength(parts.contentTypes, "utf8")],
      ["_rels/.rels", Buffer.byteLength(parts.packageRels, "utf8")],
      ["docProps/core.xml", Buffer.byteLength(parts.coreProps, "utf8")],
      ["docProps/app.xml", Buffer.byteLength(parts.appProps, "utf8")],
      ["xl/workbook.xml", Buffer.byteLength(parts.workbook, "utf8")],
      ["xl/_rels/workbook.xml.rels", Buffer.byteLength(parts.workbookRels, "utf8")],
      ["xl/styles.xml", Buffer.byteLength(parts.styles, "utf8")],
      ["xl/theme/theme1.xml", Buffer.byteLength(parts.theme, "utf8")],
    ]);

    parts.sheets.forEach(([name, content]) => {
      partMap.set(`xl/worksheets/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.sheetRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/worksheets/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    if (parts.sharedStrings) {
      partMap.set("xl/sharedStrings.xml", Buffer.byteLength(parts.sharedStrings, "utf8"));
    }
    parts.tables?.forEach(([name, content]) => {
      partMap.set(`xl/tables/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotTables?.forEach(([name, content]) => {
      partMap.set(`xl/pivotTables/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotTableRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/pivotTables/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotCacheDefinitions?.forEach(([name, content]) => {
      partMap.set(`xl/pivotCache/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotCacheDefinitionRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/pivotCache/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotCacheRecords?.forEach(([name, content]) => {
      partMap.set(`xl/pivotCache/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.comments?.forEach(([name, content]) => {
      partMap.set(`xl/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.vmlDrawings?.forEach(([name, content]) => {
      partMap.set(`xl/drawings/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.drawings?.forEach(([name, content]) => {
      partMap.set(`xl/drawings/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.drawingRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/drawings/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.media?.forEach(([name, content]) => {
      partMap.set(`xl/media/${name}`, content.length);
    });
    parts.charts?.forEach(([name, content]) => {
      partMap.set(`xl/charts/${name}`, Buffer.byteLength(content, "utf8"));
    });

    return manifest.map((entry) => ({
      path: entry.path,
      stage: entry.stage,
      byteLength: partMap.get(entry.path) ?? 0,
    }));
  }

  private static collectKeyPartBytes(
    parts: Parameters<typeof assembleXlsx>[0],
    assembled: XlsxAssemblyResult,
  ): SpreadsheetRenderKeyPartBytes {
    const entryMetricsByPath = new Map(assembled.entryMetrics.map((entry) => [entry.path, entry] as const));
    const sheetEntry = entryMetricsByPath.get("xl/worksheets/sheet1.xml");
    const stylesEntry = entryMetricsByPath.get("xl/styles.xml");
    const sharedStringsEntry = entryMetricsByPath.get("xl/sharedStrings.xml");
    const keyedZipContributionBytes = (
      (sheetEntry?.zipContributionBytes ?? 0)
      + (stylesEntry?.zipContributionBytes ?? 0)
      + (sharedStringsEntry?.zipContributionBytes ?? 0)
    );

    return {
      sheet1XmlBytes: parts.sheets[0] ? Buffer.byteLength(parts.sheets[0][1], "utf8") : 0,
      stylesXmlBytes: Buffer.byteLength(parts.styles, "utf8"),
      sharedStringsXmlBytes: parts.sharedStrings ? Buffer.byteLength(parts.sharedStrings, "utf8") : 0,
      zipBytes: assembled.buffer.length,
      sheet1XmlCompressedBytes: sheetEntry?.compressedBytes ?? 0,
      stylesXmlCompressedBytes: stylesEntry?.compressedBytes ?? 0,
      sharedStringsXmlCompressedBytes: sharedStringsEntry?.compressedBytes ?? 0,
      sheet1XmlZipContributionBytes: sheetEntry?.zipContributionBytes ?? 0,
      stylesXmlZipContributionBytes: stylesEntry?.zipContributionBytes ?? 0,
      sharedStringsXmlZipContributionBytes: sharedStringsEntry?.zipContributionBytes ?? 0,
      otherZipContributionBytes: Math.max(0, assembled.buffer.length - keyedZipContributionBytes),
    };
  }
}
