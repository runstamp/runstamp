import type {
  SpreadsheetCell,
  SpreadsheetCellComment,
  SpreadsheetCellStyle,
  SpreadsheetColumn,
  SpreadsheetDataValidation,
  SpreadsheetDataValidationType,
  SpreadsheetDefaults,
  SpreadsheetPageSetup,
  SpreadsheetPrintTitles,
  SpreadsheetRichTextValue,
  SpreadsheetSheet,
  SpreadsheetSheetProtection,
} from "../types/spreadsheet-ast.js";
import { FormulaEvaluator } from "../formulas/evaluator.js";
import { isErrorValue, isRichTextValue } from "../types/spreadsheet-ast.js";
import { absRangeRef, cellRef, colIndexToLetter, parseRangeRef } from "../utils/cell-ref.js";
import { normalizeHyperlink } from "../utils/hyperlinks.js";
import { escapeXml, formatNumberForCell, needsXmlSpacePreserve, sanitizeSharedString } from "../utils/xml.js";
import { SharedStringTable } from "./shared-strings.js";
import { StyleRegistry } from "./style-registry.js";
import { normalizeFont, resolveCellStyle } from "../styles/style-utils.js";
import { serializeRichTextRunFont } from "../styles/font-serializer.js";
import { serializeConditionalFormatting } from "../styles/conditional-formatting.js";
import {
  buildColumnLayout,
  clampColumnWidth,
  estimateDisplayLength,
  estimateHeuristicColumnWidth,
  getSheetColumnCount,
  stringifyDisplayValue,
} from "../layout/column-width.js";
import { SheetXmlBuilder } from "./sheet-xml-builder.js";
import { serializeWorksheetRelationships } from "./worksheet-rels-serializer.js";
import { buildWorksheetSyntheticTableCells, type WorksheetSyntheticCell, type WorksheetTableBinding } from "./table-serializer.js";
import type { WorksheetPivotTableBinding } from "./pivot-serializer.js";
import { compileSheetStructure } from "../worksheet/structure.js";
import { dateToSerialString, type ExcelDateSystem } from "../utils/date.js";
import { chartSafeRowBreaks, estimatePrintLayout, sheetExceedsPrintableWidth } from "../layout/print-layout.js";

export interface SerializeSheetOptions {
  dateSystem?: ExcelDateSystem;
  defaults?: SpreadsheetDefaults;
  formulaEvaluator: FormulaEvaluator | null;
  rowChunkSize?: number;
  sharedStrings?: SharedStringTable;
  styleRegistry: StyleRegistry;
  selected: boolean;
  sheetIndex: number;
  stringStrategy: "sharedStrings" | "inlineStrings";
  tableBindings?: WorksheetTableBinding[];
  pivotTableBindings?: WorksheetPivotTableBinding[];
}

export interface SerializedSheetRowChunk {
  startRowNumber: number;
  endRowNumber: number;
  sourceRowCount: number;
  serializedRowCount: number;
  cellCount: number;
  byteLength: number;
  xml: string;
}

export interface SerializedSheetArtifact {
  xml: string;
  autoFilterRef?: string;
  printArea?: string;
  printTitles?: SpreadsheetPrintTitles;
  relationships?: string;
}

export interface SerializedSheetComment {
  ref: string;
  row: number;
  col: number;
  author?: string;
  text: string;
}

export interface SerializedSheetChunkArtifact extends Omit<SerializedSheetArtifact, "xml"> {
  prefix: string;
  suffix: string;
  rowChunks: SerializedSheetRowChunk[];
  comments: SerializedSheetComment[];
  metrics: {
    totalRowsWritten: number;
    totalSerializedRows: number;
    totalCellsWritten: number;
    chunkCount: number;
  };
}

const noRefCellOpenTagCache = new Map<string, string>();
const noRefCellEmptyTagCache = new Map<string, string>();
const noRefInlineStringOpenTagCache = new Map<string, string>();
const LARGE_ROW_REF_OMISSION_THRESHOLD = 512;
const SIMPLE_ROW_OPEN_TAG = "<row>";
const SIMPLE_ROW_CLOSE_TAG = "</row>";
const DEFAULT_FITTED_PAGE_MARGINS = {
  bottom: 0.3,
  footer: 0.15,
  header: 0.15,
  left: 0.35,
  right: 0.35,
  top: 0.3,
} as const;

function inferredPrintArea(sheet: SpreadsheetSheet, structure: ReturnType<typeof compileSheetStructure>): string | undefined {
  if (sheet.pageSetup?.printArea) return sheet.pageSetup.printArea;
  const bounds = structure.originCells.flatMap((row) => row.cells.map((entry) => ({
    endCol: entry.col + (entry.cell.colSpan ?? 1) - 1,
    endRow: entry.row + (entry.cell.rowSpan ?? 1) - 1,
    startCol: entry.col,
    startRow: entry.row,
  })));
  for (const merge of structure.mergeRanges) bounds.push(merge.bounds);
  for (const table of sheet.tables ?? []) bounds.push(parseRangeRef(table.ref));
  const addDrawing = (drawing: NonNullable<SpreadsheetSheet["charts"]>[number] | NonNullable<SpreadsheetSheet["images"]>[number]) => {
    const fallbackEndCol = drawing.anchor.from.col + Math.max(1, Math.ceil((drawing.width ?? 64) / 64));
    const fallbackEndRow = drawing.anchor.from.row + Math.max(1, Math.ceil((drawing.height ?? 20) / 20));
    bounds.push({
      startCol: drawing.anchor.from.col,
      startRow: drawing.anchor.from.row,
      endCol: drawing.anchor.to?.col ?? fallbackEndCol,
      endRow: drawing.anchor.to?.row ?? fallbackEndRow,
    });
  };
  for (const chart of sheet.charts ?? []) addDrawing(chart);
  for (const image of sheet.images ?? []) addDrawing(image);
  if (bounds.length === 0) return undefined;
  let startRow = bounds[0]!.startRow;
  let startCol = bounds[0]!.startCol;
  let endRow = bounds[0]!.endRow;
  let endCol = bounds[0]!.endCol;
  for (let index = 1; index < bounds.length; index += 1) {
    const bound = bounds[index]!;
    startRow = Math.min(startRow, bound.startRow);
    startCol = Math.min(startCol, bound.startCol);
    endRow = Math.max(endRow, bound.endRow);
    endCol = Math.max(endCol, bound.endCol);
  }
  return absRangeRef(startRow, startCol, endRow, endCol).replaceAll("$", "");
}

function sheetHasMaterialTextOverflow(sheet: SpreadsheetSheet): boolean {
  return sheet.rows.some((row) => row.cells.length > 1 && row.cells.some((cell, columnIndex) => {
    const width = sheet.columns?.[columnIndex]?.width;
    return typeof cell.value === "string"
      && width !== undefined
      && cell.value.length > width * 1.35;
  }));
}

function densityAdaptivePageSetup(
  sheet: SpreadsheetSheet,
  printArea: string | undefined,
): SpreadsheetPageSetup | undefined {
  let pageSetup = sheet.pageSetup ? { ...sheet.pageSetup } : undefined;
  if (!printArea) return pageSetup;
  const used = parseRangeRef(printArea);
  const usedRows = used.endRow - used.startRow + 1;
  const usedColumns = used.endCol - used.startCol + 1;
  const hasDrawings = (sheet.charts?.length ?? 0) + (sheet.images?.length ?? 0) > 0;
  const hasMaterialTextOverflow = sheetHasMaterialTextOverflow(sheet);
  const denseCompactTable = hasMaterialTextOverflow
    && usedRows >= 10
    && !sheet.rows.some((row) => row.cells.length === 0);

  if (
    pageSetup === undefined
    && hasDrawings
    && usedRows <= 24
    && usedColumns <= 12
  ) {
    pageSetup = {
      fitToHeight: 1,
      fitToWidth: 1,
      margins: DEFAULT_FITTED_PAGE_MARGINS,
      orientation: "landscape",
      paperSize: 11,
      printArea,
    };
  } else if (pageSetup?.scale === undefined && pageSetup?.paperSize === undefined && !hasDrawings && usedRows <= 24 && usedColumns <= 8) {
    pageSetup = {
      ...pageSetup,
      // Auto-configured compact sheets use a single page. Preserve an explicit
      // zero unless material text overflow would otherwise force microtext;
      // that dense compact case is safer as a wrapped one-page table.
      fitToHeight: denseCompactTable ? 1 : (pageSetup?.fitToHeight ?? 1),
      fitToWidth: 1,
      orientation: "landscape",
      paperSize: 11,
      printArea,
    };
  } else if (
    usedRows > 24
    && pageSetup?.scale === undefined
    && pageSetup?.fitToWidth === 1
    && pageSetup.fitToHeight === undefined
  ) {
    if (hasDrawings) {
      const maximumChartSpan = Math.max(0, ...(sheet.charts ?? []).map((chart) => (
        (chart.anchor.to?.row ?? chart.anchor.from.row + Math.ceil((chart.height ?? 300) / 20))
        - chart.anchor.from.row
      )));
      const compactChartSheet = maximumChartSpan > 0
        && sheet.rows.length + maximumChartSpan <= 42;
      // Compact chart summaries fit as one page. Charts following a populated
      // table retain automatic vertical pagination so the manual row break is honored.
      pageSetup = { ...pageSetup, fitToHeight: compactChartSheet ? 1 : 0 };
    } else if (usedRows <= 34 && usedColumns > 10) {
      pageSetup = { ...pageSetup, fitToHeight: 1 };
    } else if (usedRows > 32 && usedColumns > 10) {
      // Dense, wide operational registers become microtext when both axes are
      // forced onto one page. Reserve two balanced page heights while keeping
      // every column on each landscape page.
      pageSetup = { ...pageSetup, fitToHeight: 2 };
    } else if (usedRows > 48) {
      // At normal spreadsheet print density, roughly 48 visible rows fit a
      // landscape page. Balance the sheet across that many page-heights so a
      // short remainder is not stranded on a terminal page.
      pageSetup = { ...pageSetup, fitToHeight: Math.ceil(usedRows / 48) };
    }
  }
  if (
    pageSetup?.scale === undefined
    && pageSetup?.fitToWidth === 1
    && pageSetup.margins === undefined
    && (
      hasDrawings
      || (
        pageSetup.paperSize === 11
        && usedRows >= 6
      )
    )
  ) {
    pageSetup = { ...pageSetup, margins: DEFAULT_FITTED_PAGE_MARGINS };
  }
  return pageSetup;
}

function printRowExpansionFactor(
  sheet: SpreadsheetSheet,
  defaults: SpreadsheetDefaults | undefined,
  printArea: string | undefined,
  pageSetup: SpreadsheetPageSetup | undefined,
): number {
  if (!printArea || pageSetup?.scale !== undefined || (sheet.images?.length ?? 0) > 0) return 1;
  const hasCharts = (sheet.charts?.length ?? 0) > 0;
  // A chart that follows the data and has been assigned its own print page must
  // not prevent the preceding summary table from using that page's height.
  // Combined table/chart pages remain untouched because their shared fit scale
  // already balances both regions.
  if (hasCharts && pageSetup?.fitToHeight !== 0) return 1;
  const used = parseRangeRef(printArea);
  const usedColumnCount = used.endCol - used.startCol + 1;
  const contentEndRow = hasCharts ? sheet.rows.length - 1 : used.endRow;
  const contentRowCount = contentEndRow - used.startRow + 1;
  const fittedPageCount = typeof pageSetup?.fitToHeight === "number" && pageSetup.fitToHeight > 1
    ? pageSetup.fitToHeight
    : 1;
  if (Math.ceil(contentRowCount / fittedPageCount) > 48) return 1;
  const layout = estimatePrintLayout({
    ...sheet,
    pageSetup: { ...pageSetup, printArea },
  }, defaults);
  const contentHeight = layout.rowHeights
    .slice(used.startRow, contentEndRow + 1)
    .reduce((sum, height) => sum + height, 0);
  const printedContentHeight = (contentHeight / fittedPageCount) * Math.max(0.01, layout.scale);
  // Leave additional headroom before a manual chart-page break so the last
  // expanded table row cannot spill and create an empty intervening page.
  const hasRepeatedTitles = sheet.pageSetup?.printTitles?.rows !== undefined;
  const hasKeyValueSummary = sheet.rows.slice(0, 10).filter((row) => (
    row.cells.length === 2 && typeof row.cells[0]?.value === "string"
  )).length >= 3 && sheet.rows.some((row) => row.cells.length >= 5);
  const compactFittedPage = pageSetup?.paperSize === 11 && pageSetup.fitToHeight === 1;
  const denseCompactFittedPage = compactFittedPage
    && contentRowCount >= 10
    && !sheet.rows.some((row) => row.cells.length === 0);
  const compactTargetFillRatio = denseCompactFittedPage ? 1.4 : 0.95;
  const targetFillRatio = hasCharts
    ? 0.8
    : (hasRepeatedTitles
        ? (pageSetup?.orientation === "portrait"
            // Long portrait registers need a little vertical headroom after
            // fit-to-width scaling. Filling past the printable height strands
            // only a few records on a nearly empty terminal page.
            ? (hasKeyValueSummary ? 1.05 : (contentRowCount <= 30 ? 0.99 : 0.94))
            : 0.82)
        : (pageSetup?.paperSize === 11 && usedColumnCount <= 4 && contentRowCount >= 6 && contentRowCount <= 10
            ? (usedColumnCount <= 3 ? 1.15 : 1.04)
            : compactFittedPage
            ? compactTargetFillRatio
            : (pageSetup?.fitToHeight === 1 ? 0.95 : (contentRowCount > 12 ? 0.82 : 0.95))));
  // Fit-to-width already establishes the readable scale for very wide compact
  // forecasts. Cap their vertical enlargement so they fill the page without
  // stranding only totals on a second page.
  const maximumExpansion = !hasCharts && usedColumnCount >= 12
    ? 1.6
    : (denseCompactFittedPage
        ? 3.75
        : (pageSetup?.paperSize === 11 && usedColumnCount <= 4 && contentRowCount >= 6 && contentRowCount <= 10
            ? (usedColumnCount <= 3 ? 4 : 3.2)
            : 2.75));
  return Math.max(1, Math.min(maximumExpansion, (layout.printableHeightPoints * targetFillRatio) / Math.max(1, printedContentHeight)));
}

interface BalancedUnconstrainedTablePages {
  breaks: number[];
  fitToHeight?: number;
}

function balancedUnconstrainedTablePages(
  sheet: SpreadsheetSheet,
  pageSetup: SpreadsheetPageSetup | undefined,
  printArea: string | undefined,
  serializedRowHeights: readonly number[],
  defaults: SpreadsheetDefaults | undefined,
): BalancedUnconstrainedTablePages {
  if (
    !printArea
    || pageSetup?.fitToWidth !== 1
    || pageSetup.fitToHeight !== 0
    || (sheet.charts?.length ?? 0) > 0
    || (sheet.images?.length ?? 0) > 0
    || sheet.pageSetup?.printTitles?.rows === undefined
  ) return { breaks: [] };

  const used = parseRangeRef(printArea);
  const titleRows = sheet.pageSetup.printTitles.rows;
  const dataStart = Math.max(used.startRow, titleRows.end + 1);
  const dataEnd = Math.min(used.endRow, serializedRowHeights.length - 1);
  if (dataEnd - dataStart + 1 < 24) return { breaks: [] };

  const layout = estimatePrintLayout({ ...sheet, pageSetup: { ...pageSetup, printArea } }, defaults);
  const pageHeight = layout.printableHeightPoints / Math.max(0.1, layout.scale);
  const sumHeights = (start: number, end: number): number => {
    let total = 0;
    for (let row = start; row <= end; row += 1) total += serializedRowHeights[row] ?? 0;
    return total;
  };
  const preambleHeight = sumHeights(used.startRow, dataStart - 1);
  const repeatedTitleHeight = sumHeights(titleRows.start, titleRows.end);
  const dataHeight = sumHeights(dataStart, dataEnd);
  const firstPageCapacity = Math.max(1, pageHeight - preambleHeight);
  const continuationCapacity = Math.max(1, pageHeight - repeatedTitleHeight);

  let pageCount = 1;
  while (
    firstPageCapacity + continuationCapacity * (pageCount - 1) < dataHeight
    && pageCount < dataEnd - dataStart + 1
  ) pageCount += 1;
  if (pageCount <= 1) return { breaks: [] };

  // When natural pagination would create a nearly empty final page, let the
  // spreadsheet application apply only the tiny extra scale needed to use one
  // fewer page. This avoids both the terminal sliver and the severe microtext
  // caused by the old fixed two-/three-page heuristic.
  if (pageCount > 1) {
    const compactPageCount = pageCount - 1;
    const compactCapacity = firstPageCapacity + continuationCapacity * (compactPageCount - 1);
    if (dataHeight / compactCapacity <= 1.06) {
      return { breaks: [], fitToHeight: compactPageCount };
    }
  }

  const totalCapacity = firstPageCapacity + continuationCapacity * (pageCount - 1);
  const breaks: number[] = [];
  let accumulatedHeight = 0;
  let nextBreakPage = 1;
  for (let row = dataStart; row <= dataEnd && nextBreakPage < pageCount; row += 1) {
    accumulatedHeight += serializedRowHeights[row] ?? 0;
    const capacityThroughPage = firstPageCapacity + continuationCapacity * (nextBreakPage - 1);
    const targetHeight = dataHeight * capacityThroughPage / totalCapacity;
    const remainingRows = dataEnd - row;
    const remainingPages = pageCount - nextBreakPage;
    if (accumulatedHeight >= targetHeight && remainingRows >= remainingPages) {
      breaks.push(row + 1);
      nextBreakPage += 1;
    }
  }
  return { breaks };
}

interface CachedCellStyleBundle {
  resolvedStyle: SpreadsheetCellStyle | undefined;
  styleAttr: string;
}

function getNoRefCellOpenTag(styleAttr: string, typeAttr: string): string {
  const key = `${typeAttr}|${styleAttr}`;
  const cached = noRefCellOpenTagCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const tag = `<c${typeAttr}${styleAttr}><v>`;
  noRefCellOpenTagCache.set(key, tag);
  return tag;
}

function getNoRefCellEmptyTag(styleAttr: string): string {
  const cached = noRefCellEmptyTagCache.get(styleAttr);
  if (cached !== undefined) {
    return cached;
  }
  const tag = `<c${styleAttr}/>`;
  noRefCellEmptyTagCache.set(styleAttr, tag);
  return tag;
}

function getNoRefInlineStringOpenTag(styleAttr: string): string {
  const cached = noRefInlineStringOpenTagCache.get(styleAttr);
  if (cached !== undefined) {
    return cached;
  }
  const tag = `<c t="inlineStr"${styleAttr}>`;
  noRefInlineStringOpenTagCache.set(styleAttr, tag);
  return tag;
}

function serializeSheetPr(
  sheet: SpreadsheetSheet,
  pageSetup: SpreadsheetPageSetup | undefined = sheet.pageSetup,
): string {
  const parts: string[] = [];
  if (sheet.tabColor) {
    parts.push(`<tabColor rgb="FF${sheet.tabColor.replace(/^#/, "").toUpperCase()}"/>`);
  }
  if (pageSetup && (pageSetup.fitToWidth !== undefined || pageSetup.fitToHeight !== undefined)) {
    parts.push(`<pageSetUpPr fitToPage="1"/>`);
  }

  return parts.length > 0 ? `<sheetPr>${parts.join("")}</sheetPr>` : "";
}

function serializePrintOptions(sheet: SpreadsheetSheet): string {
  const options = sheet.pageSetup?.options;
  if (!options) {
    return "";
  }

  const attributes: string[] = [];
  if (options.gridLines !== undefined) {
    attributes.push(`gridLines="${options.gridLines ? 1 : 0}"`);
  }
  if (options.headings !== undefined) {
    attributes.push(`headings="${options.headings ? 1 : 0}"`);
  }

  return attributes.length > 0 ? `<printOptions ${attributes.join(" ")}/>` : "";
}

function serializePageMargins(sheet: SpreadsheetSheet): string {
  const margins = sheet.pageSetup?.margins;
  if (!margins) {
    return "";
  }

  const attributes: string[] = [];
  if (margins.left !== undefined) attributes.push(`left="${margins.left}"`);
  if (margins.right !== undefined) attributes.push(`right="${margins.right}"`);
  if (margins.top !== undefined) attributes.push(`top="${margins.top}"`);
  if (margins.bottom !== undefined) attributes.push(`bottom="${margins.bottom}"`);
  if (margins.header !== undefined) attributes.push(`header="${margins.header}"`);
  if (margins.footer !== undefined) attributes.push(`footer="${margins.footer}"`);

  return attributes.length > 0 ? `<pageMargins ${attributes.join(" ")}/>` : "";
}

function serializePageSetup(pageSetup: SpreadsheetPageSetup | undefined): string {
  if (!pageSetup) {
    return "";
  }

  const attributes: string[] = [];
  if (pageSetup.paperSize !== undefined) attributes.push(`paperSize="${pageSetup.paperSize}"`);
  if (pageSetup.orientation) attributes.push(`orientation="${pageSetup.orientation}"`);
  if (pageSetup.scale !== undefined) attributes.push(`scale="${pageSetup.scale}"`);
  if (pageSetup.fitToWidth !== undefined) attributes.push(`fitToWidth="${pageSetup.fitToWidth}"`);
  if (pageSetup.fitToHeight !== undefined) attributes.push(`fitToHeight="${pageSetup.fitToHeight}"`);

  return attributes.length > 0 ? `<pageSetup ${attributes.join(" ")}/>` : "";
}

function dateToSerial(value: Date, dateSystem: ExcelDateSystem): string {
  return dateToSerialString(value, dateSystem);
}

function serializeRichText(
  value: SpreadsheetRichTextValue,
  cellStyle: SpreadsheetCellStyle | undefined,
  defaults: { family: string; size: number },
): string {
  const runs = value.map((run) => {
    const font = normalizeFont({
      ...cellStyle?.font,
      ...run.font,
    }, defaults);
    const textAttrs = needsXmlSpacePreserve(run.text) ? ` xml:space="preserve"` : "";
    return `<r>${serializeRichTextRunFont(font)}<t${textAttrs}>${escapeXml(run.text)}</t></r>`;
  }).join("");
  return `<is>${runs}</is>`;
}

function serializeInlineString(value: string): string {
  const sanitized = sanitizeSharedString(value);
  const textAttrs = needsXmlSpacePreserve(sanitized) ? ` xml:space="preserve"` : "";
  return `<is><t${textAttrs}>${escapeXml(sanitized)}</t></is>`;
}

function serializeCell(
  ref: string | undefined,
  cell: SpreadsheetCell,
  styleAttr: string,
  resolvedStyle: SpreadsheetCellStyle | undefined,
  defaults: SpreadsheetDefaults | undefined,
  sheetName: string,
  formulaEvaluator: FormulaEvaluator | null,
  sharedStrings: SharedStringTable | undefined,
  dateSystem: ExcelDateSystem,
): string {
  const refAttr = ref ? ` r="${ref}"` : "";
  const rawFormula = cell.formula;

  if (!rawFormula) {
    if (cell.value === null || cell.value === undefined) {
      if (!styleAttr) {
        return "";
      }
      return refAttr ? `<c${refAttr}${styleAttr}/>` : getNoRefCellEmptyTag(styleAttr);
    }

    if (isRichTextValue(cell.value)) {
      const defaultFont = {
        family: defaults?.font?.family ?? "Calibri",
        size: defaults?.font?.size ?? 11,
      };
      return `<c${refAttr} t="inlineStr"${styleAttr}>${serializeRichText(cell.value, resolvedStyle, defaultFont)}</c>`;
    }

    if (isErrorValue(cell.value)) {
      const openTag = refAttr ? `<c${refAttr} t="e"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="e"`);
      return `${openTag}${cell.value.error}</v></c>`;
    }

    if (typeof cell.value === "string") {
      if (sharedStrings) {
        const sharedIndex = sharedStrings.register(cell.value);
        const openTag = refAttr ? `<c${refAttr} t="s"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="s"`);
        return `${openTag}${sharedIndex}</v></c>`;
      }
      const openTag = refAttr ? `<c${refAttr} t="inlineStr"${styleAttr}>` : getNoRefInlineStringOpenTag(styleAttr);
      return `${openTag}${serializeInlineString(cell.value)}</c>`;
    }

    if (typeof cell.value === "boolean") {
      const openTag = refAttr ? `<c${refAttr} t="b"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="b"`);
      return `${openTag}${cell.value ? 1 : 0}</v></c>`;
    }

    if (cell.value instanceof Date) {
      const openTag = refAttr ? `<c${refAttr}${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, "");
      return `${openTag}${dateToSerial(cell.value, dateSystem)}</v></c>`;
    }

    const openTag = refAttr ? `<c${refAttr}${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, "");
    return `${openTag}${formatNumberForCell(cell.value)}</v></c>`;
  }

  const formula = formulaEvaluator?.getFormulaDefinition(cell) ?? null;

  // When formulaEvaluator is null (free tier), store the raw formula without evaluating
  if (!formula) {
    const rawExpression = typeof rawFormula === "string" ? rawFormula : rawFormula.expression;
    const formulaTag = `<f>${escapeXml(rawExpression)}</f>`;
    return `<c${refAttr}${styleAttr}>${formulaTag}</c>`;
  }

  const cachedValue = formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheetName, ref ?? "");
  const formulaAttributes = [];
  const dynamicAttr = formula.dynamic ? ` cm="1"` : "";
  if (formula.arrayRange) {
    formulaAttributes.push(`t="array"`, `ref="${formula.arrayRange}"`);
  }
  const formulaTag = formulaAttributes.length > 0
    ? `<f ${formulaAttributes.join(" ")}>${escapeXml(formula.expression)}</f>`
    : `<f>${escapeXml(formula.expression)}</f>`;

  if (cachedValue === undefined || cachedValue === null) {
    return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}</c>`;
  }

  if (isRichTextValue(cachedValue)) {
    const text = cachedValue.map((run) => run.text).join("");
    return `<c${refAttr} t="str"${styleAttr}${dynamicAttr}>${formulaTag}<v>${escapeXml(text)}</v></c>`;
  }

  if (isErrorValue(cachedValue)) {
    return `<c${refAttr} t="e"${styleAttr}${dynamicAttr}>${formulaTag}<v>${cachedValue.error}</v></c>`;
  }

  if (typeof cachedValue === "string") {
    return `<c${refAttr} t="str"${styleAttr}${dynamicAttr}>${formulaTag}<v>${escapeXml(cachedValue)}</v></c>`;
  }

  if (typeof cachedValue === "boolean") {
    return `<c${refAttr} t="b"${styleAttr}${dynamicAttr}>${formulaTag}<v>${cachedValue ? 1 : 0}</v></c>`;
  }

  if (cachedValue instanceof Date) {
    return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}<v>${dateToSerial(cachedValue, dateSystem)}</v></c>`;
  }

  return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}<v>${formatNumberForCell(cachedValue)}</v></c>`;
}

function resolveStyleAttr(
  styleRegistry: StyleRegistry,
  resolvedStyle: SpreadsheetCellStyle | undefined,
  cache: WeakMap<SpreadsheetCellStyle, string>,
): string {
  if (!resolvedStyle) {
    return "";
  }

  const cached = cache.get(resolvedStyle);
  if (cached !== undefined) {
    return cached;
  }

  const styleIndex = styleRegistry.registerResolvedStyle(resolvedStyle);
  const styleAttr = styleIndex > 0 ? ` s="${styleIndex}"` : "";
  cache.set(resolvedStyle, styleAttr);
  return styleAttr;
}

function canCacheRawCellStyle(
  style: SpreadsheetCell["style"],
  value: SpreadsheetCell["value"],
  rowStyle: SpreadsheetCellStyle | undefined,
): style is Record<string, unknown> & { preset?: string; numberFormat?: string } {
  return rowStyle === undefined
    && typeof style === "object"
    && style !== null
    && style.preset === undefined
    && !(value instanceof Date && style.numberFormat === undefined);
}

function resolveCellStyleBundle(
  cell: SpreadsheetCell,
  rowStyle: SpreadsheetCellStyle | undefined,
  styleRegistry: StyleRegistry,
  styleAttrCache: WeakMap<SpreadsheetCellStyle, string>,
  rawStyleCache: WeakMap<object, CachedCellStyleBundle>,
): CachedCellStyleBundle {
  if (canCacheRawCellStyle(cell.style, cell.value, rowStyle)) {
    const cached = rawStyleCache.get(cell.style);
    if (cached !== undefined) {
      return cached;
    }
    const resolvedStyle = resolveCellStyle(cell.style, cell.value, rowStyle);
    const bundle = {
      resolvedStyle,
      styleAttr: resolveStyleAttr(styleRegistry, resolvedStyle, styleAttrCache),
    };
    rawStyleCache.set(cell.style, bundle);
    return bundle;
  }

  const resolvedStyle = resolveCellStyle(cell.style, cell.value, rowStyle);
  return {
    resolvedStyle,
    styleAttr: resolveStyleAttr(styleRegistry, resolvedStyle, styleAttrCache),
  };
}

function getDisplayValueForMetrics(
  cell: SpreadsheetCell,
  formulaEvaluator: FormulaEvaluator | null,
  sheetName: string,
  ref: string,
): SpreadsheetCell["value"] {
  if (!cell.formula || !formulaEvaluator) {
    return cell.value;
  }
  const formula = formulaEvaluator.getFormulaDefinition(cell);
  if (!formula) {
    return cell.value;
  }

  return formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheetName, ref);
}

function resolveCellOverflowStyle(
  resolvedStyle: SpreadsheetCellStyle | undefined,
  displayValue: SpreadsheetCell["value"],
  columnWidth: number | undefined,
  defaults: SpreadsheetDefaults | undefined,
  textOverflowMode: "wrap" | "shrink" | null,
): SpreadsheetCellStyle | undefined {
  if (
    columnWidth === undefined
    || resolvedStyle?.alignment?.wrapText === true
    || resolvedStyle?.alignment?.shrinkToFit === true
  ) {
    return resolvedStyle;
  }
  const requiredWidth = estimateHeuristicColumnWidth(displayValue, resolvedStyle, defaults);
  if (requiredWidth === undefined || requiredWidth <= columnWidth) return resolvedStyle;
  if (typeof displayValue === "string" && textOverflowMode !== null && requiredWidth > columnWidth * 1.35) {
    if (textOverflowMode === "wrap") {
      return {
        ...resolvedStyle,
        alignment: {
          ...resolvedStyle?.alignment,
          vertical: resolvedStyle?.alignment?.vertical ?? "top",
          wrapText: true,
        },
      };
    }
    return {
      ...resolvedStyle,
      alignment: {
        ...resolvedStyle?.alignment,
        shrinkToFit: true,
      },
    };
  }
  if (typeof displayValue !== "number" || requiredWidth <= columnWidth * 1.2) return resolvedStyle;
  return {
    ...resolvedStyle,
    alignment: {
      ...resolvedStyle?.alignment,
      shrinkToFit: true,
    },
  };
}

function estimateWrappedCellHeight(
  cell: SpreadsheetCell,
  resolvedStyle: SpreadsheetCellStyle | undefined,
  columnWidth: number,
  defaults: SpreadsheetDefaults | undefined,
): number | undefined {
  if (!resolvedStyle?.alignment?.wrapText) {
    return undefined;
  }

  const displayLength = estimateDisplayLength(cell.value, resolvedStyle);
  if (displayLength === 0) {
    return undefined;
  }

  const charsPerLine = Math.max(1, Math.floor((columnWidth || (defaults?.columnWidth ?? 8.43)) * 1.15));
  const rawText = typeof cell.value === "string"
    ? cell.value
    : (Array.isArray(cell.value) ? cell.value.map((run) => run.text).join("") : "");
  const explicitLineCount = rawText.length > 0 ? rawText.split(/\r\n|\r|\n/).length : 1;
  const lines = Math.max(explicitLineCount, Math.ceil(displayLength / charsPerLine));
  if (lines <= 1) {
    return undefined;
  }
  const fontSize = resolvedStyle.font?.size ?? defaults?.font?.size ?? 11;
  const estimatedHeight = Math.min(lines * fontSize * 1.6, 409);
  const defaultRowHeight = defaults?.rowHeight ?? 15;
  return estimatedHeight > defaultRowHeight ? estimatedHeight : undefined;
}

function formatFormula(value: string | number | string[], type: SpreadsheetDataValidationType, dateSystem: ExcelDateSystem): string {
  if (Array.isArray(value)) return `"${value.join(",")}"`;
  if (typeof value === "number") return String(value);
  if (type === "date" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    return dateToSerial(new Date(value), dateSystem);
  }
  return value;
}

function serializeDataValidations(dataValidations: SpreadsheetDataValidation[] | undefined, dateSystem: ExcelDateSystem): string {
  if (!dataValidations || dataValidations.length === 0) {
    return "";
  }

  return `<dataValidations count="${dataValidations.length}">${dataValidations.map((validation) => {
    const attributes = [
      `sqref="${validation.ref}"`,
      `type="${validation.type}"`,
    ];
    if (validation.operator) attributes.push(`operator="${validation.operator}"`);
    attributes.push(`allowBlank="${validation.allowBlank === false ? 0 : 1}"`);
    if (validation.showInputMessage !== undefined) attributes.push(`showInputMessage="${validation.showInputMessage ? 1 : 0}"`);
    attributes.push(`showErrorMessage="${validation.showErrorMessage === false ? 0 : 1}"`);
    if (validation.showDropDown !== undefined) attributes.push(`showDropDown="${validation.showDropDown ? 0 : 1}"`);
    if (validation.errorStyle) attributes.push(`errorStyle="${validation.errorStyle}"`);
    if (validation.errorTitle) attributes.push(`errorTitle="${escapeXml(validation.errorTitle)}"`);
    if (validation.error) attributes.push(`error="${escapeXml(validation.error)}"`);
    if (validation.promptTitle) attributes.push(`promptTitle="${escapeXml(validation.promptTitle)}"`);
    if (validation.prompt) attributes.push(`prompt="${escapeXml(validation.prompt)}"`);

    const f1 = formatFormula(validation.formula1, validation.type, dateSystem);
    const formulas = [`<formula1>${escapeXml(f1)}</formula1>`];
    if (validation.formula2 !== undefined) {
      const f2 = formatFormula(validation.formula2, validation.type, dateSystem);
      formulas.push(`<formula2>${escapeXml(f2)}</formula2>`);
    }

    return `<dataValidation ${attributes.join(" ")}>${formulas.join("")}</dataValidation>`;
  }).join("")}</dataValidations>`;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = password.length - 1; i >= 0; i--) {
    hash = ((hash >> 14) & 0x01) | ((hash << 1) & 0x7FFF);
    hash ^= password.charCodeAt(i);
  }
  hash ^= password.length;
  hash ^= 0xCE4B;
  return hash.toString(16).toUpperCase().padStart(4, "0");
}

function serializeSheetProtection(protection: SpreadsheetSheetProtection | undefined): string {
  if (!protection) {
    return "";
  }

  const attributes: string[] = [];

  if (protection.password) {
    attributes.push(`password="${hashPassword(protection.password)}"`);
  }

  const sheetEnabled = protection.sheet !== false;
  attributes.push(`sheet="${sheetEnabled ? "1" : "0"}"`);

  if (protection.objects !== undefined) {
    attributes.push(`objects="${protection.objects ? "1" : "0"}"`);
  }
  if (protection.scenarios !== undefined) {
    attributes.push(`scenarios="${protection.scenarios ? "1" : "0"}"`);
  }

  const protectedByDefault: Array<[keyof SpreadsheetSheetProtection, string]> = [
    ["formatCells", "formatCells"],
    ["formatColumns", "formatColumns"],
    ["formatRows", "formatRows"],
    ["insertColumns", "insertColumns"],
    ["insertRows", "insertRows"],
    ["insertHyperlinks", "insertHyperlinks"],
    ["deleteColumns", "deleteColumns"],
    ["deleteRows", "deleteRows"],
    ["sort", "sort"],
    ["autoFilter", "autoFilter"],
    ["pivotTables", "pivotTables"],
  ];

  for (const [key, attr] of protectedByDefault) {
    const value = protection[key];
    if (value !== undefined) {
      attributes.push(`${attr}="${value ? "1" : "0"}"`);
    }
  }

  if (protection.selectLockedCells !== undefined) {
    attributes.push(`selectLockedCells="${protection.selectLockedCells ? "1" : "0"}"`);
  }
  if (protection.selectUnlockedCells !== undefined) {
    attributes.push(`selectUnlockedCells="${protection.selectUnlockedCells ? "1" : "0"}"`);
  }

  return `<sheetProtection ${attributes.join(" ")}/>`;
}

function isEmptyPlaceholderCell(cell: SpreadsheetCell): boolean {
  return cell.formula === undefined
    && (cell.value === null || cell.value === undefined);
}

function serializesCellWithoutGap(cell: SpreadsheetCell): boolean {
  return cell.formula !== undefined
    || (cell.value !== null && cell.value !== undefined)
    || cell.style !== undefined;
}

function canInferCellRefFromPosition(cell: SpreadsheetCell): boolean {
  return cell.formula === undefined
    && cell.hyperlink === undefined
    && cell.comment === undefined;
}

function columnNeedsHeuristicWidth(column: SpreadsheetColumn | undefined): boolean {
  return column?.width === undefined && column?.bestFit === true;
}

function shouldEstimateWrappedRowHeights(
  sheet: SpreadsheetSheet,
  totalSourceRows: number,
  sheetColumnCount: number,
  rowExpansionFactor: number,
): boolean {
  if (rowExpansionFactor !== 1 || sheet.pageSetup?.printArea || sheet.pageSetup?.fitToHeight !== undefined) {
    return true;
  }
  return totalSourceRows * Math.max(1, sheetColumnCount) <= 100_000;
}

export function serializeSheet(sheet: SpreadsheetSheet, options: SerializeSheetOptions): SerializedSheetArtifact {
  const chunked = serializeSheetChunks(sheet, options);

  return {
    xml: chunked.prefix + chunked.rowChunks.map((chunk) => chunk.xml).join("") + chunked.suffix,
    autoFilterRef: chunked.autoFilterRef,
    printArea: chunked.printArea,
    printTitles: chunked.printTitles,
    relationships: chunked.relationships,
  };
}

export function serializeSheetChunks(
  sheet: SpreadsheetSheet,
  options: SerializeSheetOptions,
): SerializedSheetChunkArtifact {
  const defaultColWidth = String(clampColumnWidth(options.defaults?.columnWidth ?? 8.43));
  const rowChunkSize = Math.min(10_000, Math.max(100, options.rowChunkSize ?? 1_000));
  const sheetColumnCount = getSheetColumnCount(sheet);
  const columnLetters = Array.from({ length: sheetColumnCount }, (_unused, index) => colIndexToLetter(index));
  const tableBindings = options.tableBindings ?? [];
  const pivotTableBindings = options.pivotTableBindings ?? [];
  const dateSystem = options.dateSystem ?? "1900";
  const builder = new SheetXmlBuilder([
    `xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`,
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,
  ]);
  const structure = compileSheetStructure(sheet);
  const printArea = inferredPrintArea(sheet, structure);
  const densityPageSetup = densityAdaptivePageSetup(sheet, printArea);
  const printBounds = printArea === undefined ? undefined : parseRangeRef(printArea);
  const usedPrintRows = printBounds === undefined ? 0 : printBounds.endRow - printBounds.startRow + 1;
  const usedPrintColumns = printBounds === undefined ? 0 : printBounds.endCol - printBounds.startCol + 1;
  const autoWrapMaterialText = densityPageSetup?.paperSize !== 11
    || (usedPrintRows >= 10 && !sheet.rows.some((row) => row.cells.length === 0));
  const hasDedicatedChartFollowingData = (sheet.charts ?? []).some((chart) => (
    chart.anchor.from.row >= sheet.rows.length
  ));
  const onePageDashboardWrapColumn = hasDedicatedChartFollowingData
    && sheet.pageSetup?.fitToHeight === 1
    ? (sheet.columns ?? []).findIndex((column, columnIndex) => (
        column.width !== undefined
        && column.width >= 24
        && sheet.rows.some((row) => {
          const value = row.cells[columnIndex]?.value;
          return typeof value === "string" && value.length > column.width! * 1.35;
        })
      ))
    : -1;
  const explicitColumnWidth = (sheet.columns ?? []).reduce((sum, column) => sum + (column.width ?? 0), 0);
  const hasCompactKeyValueSummary = sheet.rows.slice(0, 10).some((row) => (
    row.cells.length === 2
    && typeof row.cells[0]?.value === "string"
    && row.cells[0].value.length >= 12
  )) && sheet.rows.some((row) => row.cells.length >= 5);
  const semanticMinimumColumnWidths = (sheet.columns ?? []).map((_column, columnIndex) => Math.min(
    30,
    Math.max(0, ...sheet.rows.map((row) => {
      const cell = row.cells[columnIndex];
      const style = typeof cell?.style === "object" && cell.style !== null ? cell.style : undefined;
      const explicitWidth = sheet.columns?.[columnIndex]?.width;
      return typeof cell?.value === "string"
        && style?.alignment?.horizontal === "right"
        && explicitWidth !== undefined
        && cell.value.length > explicitWidth * 1.6
        // Right-aligned text cannot overflow into the populated cell on its
        // left. Compound labels therefore need nearly their full character
        // budget or their leading segment disappears in print output.
        ? cell.value.length / 1.05
        : 0;
    })),
  ));
  const dedicatedDashboardColumnExpansion = hasDedicatedChartFollowingData
    && usedPrintColumns <= 10
    && explicitColumnWidth > 0
    ? Math.max(1, Math.min(1.4, 125 / explicitColumnWidth))
    : 1;
  const portraitRegisterColumnExpansion = (sheet.charts?.length ?? 0) === 0
    && densityPageSetup?.orientation === "portrait"
    && densityPageSetup.fitToWidth === 1
    && densityPageSetup.fitToHeight === 0
    && usedPrintRows >= 10
    && usedPrintColumns <= 7
    && explicitColumnWidth > 0
    ? Math.max(1, Math.min(1.8, 105 / explicitColumnWidth))
    : 1;
  const columnExpansionFactor = dedicatedDashboardColumnExpansion > 1
    ? dedicatedDashboardColumnExpansion
    : portraitRegisterColumnExpansion > 1
    ? portraitRegisterColumnExpansion
    : densityPageSetup?.paperSize === 11
    && densityPageSetup.fitToHeight === 1
    && usedPrintRows >= 10
    && usedPrintRows <= 24
    && usedPrintColumns <= 8
    && sheetHasMaterialTextOverflow(sheet)
    && !sheet.rows.some((row) => row.cells.length === 0)
    ? 1.55
    : densityPageSetup?.fitToHeight === 2
    && usedPrintRows <= 48
    && usedPrintColumns > 10
    && (sheet.charts?.length ?? 0) === 0
    && (sheet.images?.length ?? 0) === 0
    ? 1.35
    : 1;
  const expandedColumnWidth = (width: number, index: number): number => Math.max(
    width * columnExpansionFactor,
    hasCompactKeyValueSummary && index === 0 ? 18 : 0,
    semanticMinimumColumnWidths[index] ?? 0,
  );
  const hasSemanticColumnExpansion = (sheet.columns ?? []).some((column, index) => (
    column.width !== undefined && (semanticMinimumColumnWidths[index] ?? 0) > column.width
  ));
  const printLayoutSheet = columnExpansionFactor === 1
    && !hasCompactKeyValueSummary
    && !hasSemanticColumnExpansion
    ? sheet
    : {
        ...sheet,
        columns: sheet.columns?.map((column, index) => (
          column.width === undefined ? column : { ...column, width: expandedColumnWidth(column.width, index) }
        )),
      };
  const rowExpansionFactor = printRowExpansionFactor(
    printLayoutSheet,
    options.defaults,
    printArea,
    densityPageSetup,
  );
  const hasChartDrawings = (sheet.charts?.length ?? 0) > 0;
  // Chart anchors use worksheet row coordinates. Keep the implicit height
  // stable on chart sheets and expand only populated table rows so enlarging
  // the summary does not also stretch (and split) the chart drawing.
  const defaultRowHeight = String((options.defaults?.rowHeight ?? 15) * (hasChartDrawings ? 1 : rowExpansionFactor));

  const sheetViewAttributes = [`workbookViewId="0"`];
  if (options.selected) {
    sheetViewAttributes.push(`tabSelected="1"`);
  }
  if (sheet.rightToLeft) {
    sheetViewAttributes.push(`rightToLeft="1"`);
  }
  const freezePane = sheet.freezePane;
  if ((freezePane?.row ?? 0) > 0 || (freezePane?.col ?? 0) > 0) {
    const xSplit = freezePane && freezePane.col > 0 ? ` xSplit="${freezePane.col}"` : "";
    const ySplit = freezePane && freezePane.row > 0 ? ` ySplit="${freezePane.row}"` : "";
    const topLeftCell = cellRef(freezePane?.row ?? 0, freezePane?.col ?? 0);
    const activePane = freezePane && freezePane.row > 0 && freezePane.col > 0
      ? "bottomRight"
      : (freezePane && freezePane.row > 0 ? "bottomLeft" : "topRight");
    builder.setSheetViews(
      `<sheetViews><sheetView ${sheetViewAttributes.join(" ")}><pane${xSplit}${ySplit} topLeftCell="${topLeftCell}" activePane="${activePane}" state="frozen"/><selection pane="${activePane}" activeCell="${topLeftCell}" sqref="${topLeftCell}"/></sheetView></sheetViews>`,
    );
  } else {
    builder.setSheetViews(`<sheetViews><sheetView ${sheetViewAttributes.join(" ")}/></sheetViews>`);
  }
  const dimensionRef = structure.maxCol >= 0 && structure.maxRow >= 0
    ? (structure.maxCol === 0 && structure.maxRow === 0
        ? cellRef(0, 0)
        : absRangeRef(0, 0, structure.maxRow, structure.maxCol).replaceAll("$", ""))
    : "A1";
  builder.setDimension(`<dimension ref="${dimensionRef}"/>`);
  builder.setSheetFormatPr(`<sheetFormatPr defaultRowHeight="${defaultRowHeight}" defaultColWidth="${defaultColWidth}"/>`);

  const columnCount = getSheetColumnCount(sheet);
  const computedColumns = Array.from(
    { length: columnCount },
    (_unused, index) => {
    const explicit = sheet.columns?.[index];
      return explicit?.width !== undefined
        ? { width: clampColumnWidth(expandedColumnWidth(explicit.width, index)), bestFit: explicit.bestFit ?? false }
        : undefined;
    },
  );
  const hyperlinkParts: string[] = [];
  const collectedComments: SerializedSheetComment[] = [];
  const worksheetRelationships: Array<{ id: string; target: string; type: "hyperlink" | "table" | "vmlDrawing" | "comment" | "drawing" | "pivotTable" }> = [];
  const styleAttrCache = new WeakMap<SpreadsheetCellStyle, string>();
  const rawCellStyleCache = new WeakMap<object, CachedCellStyleBundle>();
  const syntheticTableCellsByRow = buildWorksheetSyntheticTableCells(tableBindings);
  const syntheticRowIndices = [...syntheticTableCellsByRow.keys()];
  const maxSyntheticRowIndex = syntheticRowIndices.length > 0 ? Math.max(...syntheticRowIndices) : -1;
  const totalSourceRows = Math.max(sheet.rows.length, maxSyntheticRowIndex + 1);
  const estimateWrappedRowHeights = shouldEstimateWrappedRowHeights(
    sheet,
    totalSourceRows,
    sheetColumnCount,
    rowExpansionFactor,
  );
  const rowChunks: SerializedSheetRowChunk[] = [];
  let chunkStartRowNumber = 0;
  let chunkEndRowNumber = 0;
  let chunkSourceRowCount = 0;
  let chunkSerializedRowCount = 0;
  let chunkCellCount = 0;
  let chunkXml = "";
  let totalSerializedRows = 0;
  let totalCellsWritten = 0;
  const serializedRowHeights = Array.from(
    { length: totalSourceRows },
    () => Number(defaultRowHeight),
  );
  const canUseSimpleRowPath = syntheticTableCellsByRow.size === 0
    && structure.mergeRanges.length === 0
    && structure.rows.length === sheet.rows.length
    && structure.rows.every((structuredRow, rowIndex) => (
      structuredRow.row === rowIndex
      && structuredRow.cells.length === (sheet.rows[rowIndex]?.cells.length ?? 0)
      && structuredRow.cells.every((entry, columnIndex) => entry.col === columnIndex)
    ));

  const flushChunk = () => {
    if (chunkSourceRowCount === 0) {
      return;
    }

    const xml = chunkXml;
    rowChunks.push({
      startRowNumber: chunkStartRowNumber,
      endRowNumber: chunkEndRowNumber,
      sourceRowCount: chunkSourceRowCount,
      serializedRowCount: chunkSerializedRowCount,
      cellCount: chunkCellCount,
      byteLength: Buffer.byteLength(xml, "utf8"),
      xml,
    });

    chunkStartRowNumber = 0;
    chunkEndRowNumber = 0;
    chunkSourceRowCount = 0;
    chunkSerializedRowCount = 0;
    chunkCellCount = 0;
    chunkXml = "";
  };

  const positionedRowMap = canUseSimpleRowPath ? undefined : new Map(structure.rows.map((row) => [row.row, row]));
  const originRowMap = canUseSimpleRowPath ? undefined : new Map(structure.originCells.map((row) => [row.row, row]));
  const headerRowStyle = resolveCellStyle(sheet.styling?.headerRow, undefined);
  const alternateOddStyle = resolveCellStyle(sheet.styling?.alternateRows?.odd, undefined);
  const alternateEvenStyle = resolveCellStyle(sheet.styling?.alternateRows?.even, undefined);
  for (let rowIndex = 0; rowIndex < totalSourceRows; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? { cells: [] };
    const mergedCells = canUseSimpleRowPath
      ? []
      : (() => {
          const positionedRow = positionedRowMap?.get(rowIndex) ?? { row: rowIndex, cells: [] };
          const syntheticCells = syntheticTableCellsByRow.get(rowIndex) ?? [];
          const cellMap = new Map<number, { col: number; cell: SpreadsheetCell }>(
            positionedRow.cells.map((entry) => [entry.col, entry]),
          );
          syntheticCells.forEach((entry: WorksheetSyntheticCell) => {
            const existing = cellMap.get(entry.col);
            if (!existing || isEmptyPlaceholderCell(existing.cell)) {
              cellMap.set(entry.col, {
                col: entry.col,
                cell: entry.cell,
              });
            }
          });
          return [...cellMap.values()].sort((left, right) => left.col - right.col);
        })();
    const rowNumber = rowIndex + 1;
    if (chunkSourceRowCount === 0) {
      chunkStartRowNumber = rowNumber;
    }
    chunkEndRowNumber = rowNumber;
    chunkSourceRowCount += 1;
    const rowStyle = rowIndex === 0
      ? headerRowStyle
      : ((rowNumber % 2 === 0) ? alternateEvenStyle : alternateOddStyle);
    let cellXml = "";
    let cellCount = 0;
    const preserveCompactSpacerHeight = row.height === undefined
      && rowExpansionFactor > 1
      && row.cells.length === 0;
    const expandChartTableRow = row.height === undefined
      && hasChartDrawings
      && rowExpansionFactor > 1
      && row.cells.length > 0;
    let estimatedHeight = row.height === undefined
      ? ((preserveCompactSpacerHeight || expandChartTableRow)
          ? (options.defaults?.rowHeight ?? 15) * (expandChartTableRow ? rowExpansionFactor : 1)
          : undefined)
      : row.height * rowExpansionFactor;
    let adjustedHeight = row.height !== undefined || preserveCompactSpacerHeight || expandChartTableRow;
    const originColumns = canUseSimpleRowPath
      ? undefined
      : new Set((originRowMap?.get(rowIndex)?.cells ?? []).map((cell) => cell.col));
    const canOmitCellRefs = canUseSimpleRowPath
      && row.cells.length >= 16
      && row.cells.every((cell) => (
        serializesCellWithoutGap(cell)
        && canInferCellRefFromPosition(cell)
      ));
    if (canUseSimpleRowPath) {
      for (let col = 0; col < row.cells.length; col += 1) {
        const cell = row.cells[col]!;
        const needsColumnWidth = columnNeedsHeuristicWidth(sheet.columns?.[col]);
        const needsWrappedHeight = estimateWrappedRowHeights && row.height === undefined;
        const needsRef = !canOmitCellRefs
          || cell.hyperlink !== undefined
          || cell.comment !== undefined
          || (options.formulaEvaluator !== null && cell.formula !== undefined);
        let fallbackRef: string | undefined;
        const getFallbackRef = () => {
          if (fallbackRef === undefined) {
            fallbackRef = `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`;
          }
          return fallbackRef;
        };
        const ref = needsRef ? getFallbackRef() : undefined;
        const styleBundle = resolveCellStyleBundle(
          cell,
          rowStyle,
          options.styleRegistry,
          styleAttrCache,
          rawCellStyleCache,
        );
        const resolvedStyle = resolveCellOverflowStyle(
          styleBundle.resolvedStyle,
          getDisplayValueForMetrics(cell, options.formulaEvaluator, sheet.name, ref ?? getFallbackRef()),
          sheet.columns?.[col]?.width === undefined ? undefined : computedColumns[col]?.width,
          options.defaults,
          (cell.colSpan ?? 1) !== 1 || row.cells.length <= 1
            ? null
            : (hasDedicatedChartFollowingData
                ? (col === onePageDashboardWrapColumn ? "wrap" : "shrink")
                : (autoWrapMaterialText
                    ? (densityPageSetup?.fitToHeight === 1 && usedPrintColumns < 8 ? "wrap" : "shrink")
                    : null)),
        );
        const styleAttr = resolvedStyle === styleBundle.resolvedStyle
          ? styleBundle.styleAttr
          : resolveStyleAttr(options.styleRegistry, resolvedStyle, styleAttrCache);
        const serialized = serializeCell(
          ref,
          cell,
          styleAttr,
          resolvedStyle,
          options.defaults,
          sheet.name,
          options.formulaEvaluator,
          options.sharedStrings,
          dateSystem,
        );
        if (serialized) {
          cellXml += serialized;
          cellCount += 1;
        }

        let displayValue: SpreadsheetCell["value"] | undefined;
        if (needsColumnWidth || (needsWrappedHeight && resolvedStyle?.alignment?.wrapText)) {
          displayValue = getDisplayValueForMetrics(
            cell,
            options.formulaEvaluator,
            sheet.name,
            ref ?? getFallbackRef(),
          );
        }

        if (needsColumnWidth) {
          const heuristicWidth = estimateHeuristicColumnWidth(
            displayValue,
            resolvedStyle,
            options.defaults,
          );
          if (heuristicWidth !== undefined) {
            const existing = computedColumns[col];
            if (!existing || heuristicWidth > existing.width) {
              computedColumns[col] = {
                width: heuristicWidth,
                bestFit: true,
              };
            }
          }
        }

        if (cell.hyperlink) {
          const hyperlink = normalizeHyperlink(cell.hyperlink);
          const attributes = [`ref="${ref}"`];
          if (hyperlink.display) {
            attributes.push(`display="${escapeXml(hyperlink.display)}"`);
          }
          if (hyperlink.tooltip) {
            attributes.push(`tooltip="${escapeXml(hyperlink.tooltip)}"`);
          }

          if (hyperlink.mode === "internal") {
            attributes.push(`location="${escapeXml(hyperlink.location)}"`);
          } else {
            const relationshipId = `rId${worksheetRelationships.length + 1}`;
            worksheetRelationships.push({
              id: relationshipId,
              target: hyperlink.target,
              type: "hyperlink",
            });
            attributes.push(`r:id="${relationshipId}"`);
          }

          hyperlinkParts.push(`<hyperlink ${attributes.join(" ")}/>`);
        }

        if (cell.comment) {
          collectedComments.push({
            ref: ref!,
            row: rowIndex,
            col,
            author: cell.comment.author,
            text: cell.comment.text,
          });
        }

        if (needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          const wrappedHeight = estimateWrappedCellHeight(
            { ...cell, value: displayValue },
            resolvedStyle,
            Array.from({ length: cell.colSpan ?? 1 }, (_unused, offset) => (
              computedColumns[col + offset]?.width ?? (options.defaults?.columnWidth ?? 8.43)
            )).reduce((sum, width) => sum + width, 0),
            options.defaults,
          );
          if (wrappedHeight !== undefined) {
            estimatedHeight = Math.max(
              estimatedHeight ?? ((options.defaults?.rowHeight ?? 15) * rowExpansionFactor),
              wrappedHeight * rowExpansionFactor,
            );
            adjustedHeight = true;
          }
        }
      }
    } else {
      for (const { cell, col } of mergedCells) {
        let ref: string | undefined;
        const isOriginCell = originColumns?.has(col) === true;
        const needsColumnWidth = isOriginCell && columnNeedsHeuristicWidth(sheet.columns?.[col]);
        const needsWrappedHeight = estimateWrappedRowHeights && row.height === undefined;
        const needsRef = !canOmitCellRefs
          || (isOriginCell && (cell.hyperlink !== undefined || cell.comment !== undefined))
          || (options.formulaEvaluator !== null && cell.formula !== undefined);

        const ensureRef = () => {
          if (ref === undefined) {
            ref = `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`;
          }
          return ref;
        };
        const styleBundle = resolveCellStyleBundle(
          cell,
          rowStyle,
          options.styleRegistry,
          styleAttrCache,
          rawCellStyleCache,
        );
        const resolvedStyle = resolveCellOverflowStyle(
          styleBundle.resolvedStyle,
          getDisplayValueForMetrics(
            cell,
            options.formulaEvaluator,
            sheet.name,
            needsRef ? ensureRef() : `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`,
          ),
          sheet.columns?.[col]?.width === undefined ? undefined : computedColumns[col]?.width,
          options.defaults,
          (cell.colSpan ?? 1) !== 1 || mergedCells.length <= 1
            ? null
            : (hasDedicatedChartFollowingData
                ? (col === onePageDashboardWrapColumn ? "wrap" : "shrink")
                : (autoWrapMaterialText
                    ? (densityPageSetup?.fitToHeight === 1 && usedPrintColumns < 8 ? "wrap" : "shrink")
                    : null)),
        );
        const styleAttr = resolvedStyle === styleBundle.resolvedStyle
          ? styleBundle.styleAttr
          : resolveStyleAttr(options.styleRegistry, resolvedStyle, styleAttrCache);
        const serialized = serializeCell(
          needsRef ? ensureRef() : undefined,
          cell,
          styleAttr,
          resolvedStyle,
          options.defaults,
          sheet.name,
          options.formulaEvaluator,
          options.sharedStrings,
          dateSystem,
        );
        if (serialized) {
          cellXml += serialized;
          cellCount += 1;
        }

        let displayValue: SpreadsheetCell["value"] | undefined;
        const getDisplayValue = () => {
          if (displayValue === undefined) {
            displayValue = getDisplayValueForMetrics(
              cell,
              options.formulaEvaluator,
              sheet.name,
              needsRef ? ensureRef() : `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`,
            );
          }
          return displayValue;
        };

        if (needsColumnWidth) {
          const heuristicWidth = estimateHeuristicColumnWidth(
            getDisplayValue(),
            resolvedStyle,
            options.defaults,
          );
          if (heuristicWidth !== undefined) {
            const existing = computedColumns[col];
            if (!existing || heuristicWidth > existing.width) {
              computedColumns[col] = {
                width: heuristicWidth,
                bestFit: true,
              };
            }
          }
        }

        if (isOriginCell && cell.hyperlink) {
          const refValue = ensureRef();
          const hyperlink = normalizeHyperlink(cell.hyperlink);
          const attributes = [`ref="${refValue}"`];
          if (hyperlink.display) {
            attributes.push(`display="${escapeXml(hyperlink.display)}"`);
          }
          if (hyperlink.tooltip) {
            attributes.push(`tooltip="${escapeXml(hyperlink.tooltip)}"`);
          }

          if (hyperlink.mode === "internal") {
            attributes.push(`location="${escapeXml(hyperlink.location)}"`);
          } else {
            const relationshipId = `rId${worksheetRelationships.length + 1}`;
            worksheetRelationships.push({
              id: relationshipId,
              target: hyperlink.target,
              type: "hyperlink",
            });
            attributes.push(`r:id="${relationshipId}"`);
          }

          hyperlinkParts.push(`<hyperlink ${attributes.join(" ")}/>`);
        }

        if (isOriginCell && cell.comment) {
          collectedComments.push({
            ref: ensureRef(),
            row: rowIndex,
            col,
            author: cell.comment.author,
            text: cell.comment.text,
          });
        }

        if (needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          const wrappedHeight = estimateWrappedCellHeight(
            { ...cell, value: getDisplayValue() },
            resolvedStyle,
            Array.from({ length: cell.colSpan ?? 1 }, (_unused, offset) => (
              computedColumns[col + offset]?.width ?? (options.defaults?.columnWidth ?? 8.43)
            )).reduce((sum, width) => sum + width, 0),
            options.defaults,
          );
          if (wrappedHeight !== undefined) {
            estimatedHeight = Math.max(
              estimatedHeight ?? ((options.defaults?.rowHeight ?? 15) * rowExpansionFactor),
              wrappedHeight * rowExpansionFactor,
            );
            adjustedHeight = true;
          }
        }
      }
    }

    serializedRowHeights[rowIndex] = row.hidden ? 0 : (estimatedHeight ?? Number(defaultRowHeight));
    const shouldSerializeRow = cellCount > 0 || row.hidden || estimatedHeight !== undefined;
    if (!shouldSerializeRow) {
      continue;
    }

    const canOmitRowRef = canOmitCellRefs
      && totalSourceRows >= LARGE_ROW_REF_OMISSION_THRESHOLD
      && !adjustedHeight
      && !row.hidden;
    if (canOmitRowRef) {
      chunkXml += `${SIMPLE_ROW_OPEN_TAG}${cellXml}${SIMPLE_ROW_CLOSE_TAG}`;
    } else if (!adjustedHeight && !row.hidden) {
      chunkXml += `<row r="${rowNumber}">${cellXml}</row>`;
    } else {
      const rowAttributes = [`r="${rowNumber}"`];
      if (estimatedHeight !== undefined && adjustedHeight) {
        rowAttributes.push(`ht="${estimatedHeight}"`, `customHeight="1"`);
      }
      if (row.hidden) {
        rowAttributes.push(`hidden="1"`);
      }
      chunkXml += `<row ${rowAttributes.join(" ")}>${cellXml}</row>`;
    }
    chunkSerializedRowCount += 1;
    totalSerializedRows += 1;
    chunkCellCount += cellCount;
    totalCellsWritten += cellCount;

    if (chunkSourceRowCount >= rowChunkSize) {
      flushChunk();
    }
  }
  flushChunk();

  const columnLayout = buildColumnLayout(printLayoutSheet, computedColumns, options.defaults);
  if (columnLayout.segments.length > 0) {
    builder.setCols(`<cols>${columnLayout.segments.map((segment) => {
      const attributes = [`min="${segment.start}"`, `max="${segment.end}"`, `width="${segment.width}"`];
      if (segment.customWidth) attributes.push(`customWidth="1"`);
      if (segment.hidden) attributes.push(`hidden="1"`);
      if (segment.bestFit) attributes.push(`bestFit="1"`);
      return `<col ${attributes.join(" ")}/>`;
    }).join("")}</cols>`);
  }

  const densityAwareSheet = densityPageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: densityPageSetup };
  const autoFitToWidth = densityPageSetup?.scale === undefined
    && densityPageSetup?.fitToWidth === undefined
    && sheetExceedsPrintableWidth(densityAwareSheet, options.defaults);
  const widthAwarePageSetup = autoFitToWidth
    ? { ...densityPageSetup, fitToWidth: 1, fitToHeight: densityPageSetup?.fitToHeight ?? 0 }
    : densityPageSetup;
  const effectivePageSetup = densityAdaptivePageSetup(
    widthAwarePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: widthAwarePageSetup },
    printArea,
  );
  const sheetPr = serializeSheetPr(sheet, effectivePageSetup);
  if (sheetPr) {
    builder.setSheetPr(sheetPr);
  }

  if (structure.autoFilterRef) {
    builder.setAutoFilter(`<autoFilter ref="${structure.autoFilterRef}"/>`);
  }
  const sheetProtectionXml = serializeSheetProtection(sheet.protection);
  if (sheetProtectionXml) {
    builder.setSheetProtection(sheetProtectionXml);
  }
  if (structure.mergeRanges.length > 0) {
    builder.setMergeCells(
      `<mergeCells count="${structure.mergeRanges.length}">${structure.mergeRanges.map((merge) => `<mergeCell ref="${merge.ref}"/>`).join("")}</mergeCells>`,
    );
  }
  const conditionalFormatting = serializeConditionalFormatting(sheet.conditionalFormatting, options.styleRegistry);
  if (conditionalFormatting.xml) {
    builder.addConditionalFormatting(conditionalFormatting.xml);
  }
  if (conditionalFormatting.extLst) {
    builder.setExtLst(conditionalFormatting.extLst);
  }
  const dataValidations = serializeDataValidations(sheet.dataValidations, dateSystem);
  if (dataValidations) {
    builder.setDataValidations(dataValidations);
  }
  if (hyperlinkParts.length > 0) {
    builder.setHyperlinks(`<hyperlinks>${hyperlinkParts.join("")}</hyperlinks>`);
  }
  const printOptions = serializePrintOptions(sheet);
  if (printOptions) {
    builder.setPrintOptions(printOptions);
  }
  const pageMargins = serializePageMargins(
    effectivePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: effectivePageSetup },
  );
  if (pageMargins) {
    builder.setPageMargins(pageMargins);
  }
  const candidateRowBreaks = chartSafeRowBreaks(
    effectivePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: effectivePageSetup },
    options.defaults,
  );
  const balancedTablePages = balancedUnconstrainedTablePages(
    printLayoutSheet,
    effectivePageSetup,
    printArea,
    serializedRowHeights,
    options.defaults,
  );
  const rowBreaks = [...new Set([
    ...((sheet.charts?.length ?? 0) > 0 || hasCompactKeyValueSummary ? candidateRowBreaks : []),
    ...balancedTablePages.breaks,
  ])].sort((left, right) => left - right);
  const pageSetupWithManualBalance = rowBreaks.length > 0
    && (sheet.charts?.length ?? 0) === 0
    && typeof effectivePageSetup?.fitToHeight === "number"
    && effectivePageSetup.fitToHeight > 1
    && hasCompactKeyValueSummary
    && sheet.pageSetup?.fitToHeight !== effectivePageSetup.fitToHeight
    ? { ...effectivePageSetup, fitToHeight: 0 }
    : effectivePageSetup;
  const pageSetup = serializePageSetup(
    balancedTablePages.fitToHeight === undefined
      ? pageSetupWithManualBalance
      : { ...pageSetupWithManualBalance, fitToHeight: balancedTablePages.fitToHeight },
  );
  if (pageSetup) {
    builder.setPageSetup(pageSetup);
  }
  if (rowBreaks.length > 0) {
    const breaks = rowBreaks.map((row) => `<brk id="${row}" min="0" max="16383" man="1"/>`).join("");
    builder.setRowBreaks(`<rowBreaks count="${rowBreaks.length}" manualBreakCount="${rowBreaks.length}">${breaks}</rowBreaks>`);
  }
  if (tableBindings.length > 0) {
    const tableParts = tableBindings.map((binding) => {
      const relationshipId = `rId${worksheetRelationships.length + 1}`;
      worksheetRelationships.push({
        id: relationshipId,
        target: `../tables/${binding.partName}`,
        type: "table",
      });
      return `<tablePart r:id="${relationshipId}"/>`;
    });
    builder.setTableParts(`<tableParts count="${tableParts.length}">${tableParts.join("")}</tableParts>`);
  }
  if (pivotTableBindings.length > 0) {
    pivotTableBindings.forEach((binding) => {
      const relationshipId = `rId${worksheetRelationships.length + 1}`;
      worksheetRelationships.push({
        id: relationshipId,
        target: `../pivotTables/${binding.partName}`,
        type: "pivotTable",
      });
    });
  }
  if (collectedComments.length > 0) {
    const sheetNumber = options.sheetIndex + 1;
    const commentRelId = `rId${worksheetRelationships.length + 1}`;
    worksheetRelationships.push({
      id: commentRelId,
      target: `../comments${sheetNumber}.xml`,
      type: "comment",
    });
    const vmlRelId = `rId${worksheetRelationships.length + 1}`;
    worksheetRelationships.push({
      id: vmlRelId,
      target: `../drawings/vmlDrawing${sheetNumber}.vml`,
      type: "vmlDrawing",
    });
    builder.setLegacyDrawing(`<legacyDrawing r:id="${vmlRelId}"/>`);
  }
  const hasImages = sheet.images && sheet.images.length > 0;
  const hasCharts = sheet.charts && sheet.charts.length > 0;
  if (hasImages || hasCharts) {
    const drawingRelId = `rId${worksheetRelationships.length + 1}`;
    const sheetNumber = options.sheetIndex + 1;
    worksheetRelationships.push({
      id: drawingRelId,
      target: `../drawings/drawing${sheetNumber}.xml`,
      type: "drawing",
    });
    builder.setDrawing(`<drawing r:id="${drawingRelId}"/>`);
  }
  const envelope = builder.buildSheetDataEnvelope();

  return {
    prefix: envelope.prefix,
    suffix: envelope.suffix,
    rowChunks,
    comments: collectedComments,
    metrics: {
      totalRowsWritten: totalSourceRows,
      totalSerializedRows,
      totalCellsWritten,
      chunkCount: rowChunks.length,
    },
    autoFilterRef: structure.autoFilterRef,
    printArea,
    printTitles: sheet.pageSetup?.printTitles,
    relationships: worksheetRelationships.length > 0
      ? serializeWorksheetRelationships(worksheetRelationships)
      : undefined,
  };
}
