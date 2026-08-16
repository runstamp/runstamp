import type {
  SpreadsheetDefaults,
  SpreadsheetPageSetup,
  SpreadsheetSheet,
} from "../types/spreadsheet-ast.js";
import { parseRangeRef } from "../utils/cell-ref.js";
import { computeColumnLayout } from "./column-width.js";
import { estimateRowHeight } from "./row-height.js";

const POINTS_PER_INCH = 72;
const DEFAULT_COLUMN_WIDTH = 8.43;
const DEFAULT_ROW_HEIGHT = 15;
const DEFAULT_CHART_HEIGHT_PIXELS = 300;
const PIXELS_PER_ROW = 20;

const PAPER_DIMENSIONS_INCHES: Record<number, readonly [width: number, height: number]> = {
  1: [8.5, 11], // Letter
  5: [8.5, 14], // Legal
  8: [11.69, 16.54], // A3
  9: [8.27, 11.69], // A4
  11: [5.83, 8.27], // A5
};

export interface EstimatedPrintLayout {
  columnWidths: number[];
  rowHeights: number[];
  contentWidthPoints: number;
  printableWidthPoints: number;
  printableHeightPoints: number;
  scale: number;
}

function paperDimensions(pageSetup: SpreadsheetPageSetup | undefined): readonly [number, number] {
  const dimensions = PAPER_DIMENSIONS_INCHES[pageSetup?.paperSize ?? 1] ?? PAPER_DIMENSIONS_INCHES[1]!;
  return pageSetup?.orientation === "landscape"
    ? [dimensions[1], dimensions[0]]
    : dimensions;
}

function columnWidthToPoints(width: number): number {
  // ECMA-376's character-width conversion, using Excel's 7px Calibri baseline.
  const pixels = Math.floor(((256 * width + Math.floor(128 / 7)) / 256) * 7) + 5;
  return pixels * 0.75;
}

function printAreaLastColumn(sheet: SpreadsheetSheet): number | undefined {
  const ref = sheet.pageSetup?.printArea;
  if (!ref) return undefined;
  try {
    return parseRangeRef(ref).endCol;
  } catch {
    return undefined;
  }
}

export function estimatePrintLayout(
  sheet: SpreadsheetSheet,
  defaults?: SpreadsheetDefaults,
): EstimatedPrintLayout {
  const columnLayout = computeColumnLayout(sheet, defaults);
  const lastPrintColumn = printAreaLastColumn(sheet);
  const usedColumnCount = lastPrintColumn === undefined
    ? columnLayout.columnWidths.length
    : Math.max(columnLayout.columnWidths.length, lastPrintColumn + 1);
  const printableColumnWidths = Array.from(
    { length: usedColumnCount },
    (_unused, index) => columnLayout.columnWidths[index]
      ?? sheet.columns?.[index]?.width
      ?? defaults?.columnWidth
      ?? DEFAULT_COLUMN_WIDTH,
  );
  const contentWidthPoints = printableColumnWidths
    .reduce((total, width, index) => {
      if (sheet.columns?.[index]?.hidden) return total;
      return total + columnWidthToPoints(width);
    }, 0);

  const [paperWidth, paperHeight] = paperDimensions(sheet.pageSetup);
  const leftMargin = sheet.pageSetup?.margins?.left ?? 0.7;
  const rightMargin = sheet.pageSetup?.margins?.right ?? 0.7;
  const topMargin = sheet.pageSetup?.margins?.top ?? 0.75;
  const bottomMargin = sheet.pageSetup?.margins?.bottom ?? 0.75;
  const printableWidthPoints = Math.max(1, paperWidth - leftMargin - rightMargin) * POINTS_PER_INCH;
  const printableHeightPoints = Math.max(1, paperHeight - topMargin - bottomMargin) * POINTS_PER_INCH;

  const requestedScale = sheet.pageSetup?.scale === undefined
    ? 1
    : sheet.pageSetup.scale / 100;
  const fitWidthScale = sheet.pageSetup?.fitToWidth === 1 && contentWidthPoints > 0
    ? Math.min(1, printableWidthPoints / contentWidthPoints)
    : 1;

  const rowHeights = sheet.rows.map((row, rowIndex) => {
    if (row.hidden) return 0;
    return estimateRowHeight(row, rowIndex, sheet, columnLayout.columnWidths, defaults)
      ?? defaults?.rowHeight
      ?? DEFAULT_ROW_HEIGHT;
  });

  return {
    columnWidths: printableColumnWidths,
    rowHeights,
    contentWidthPoints,
    printableWidthPoints,
    printableHeightPoints,
    scale: Math.min(requestedScale, fitWidthScale),
  };
}

export function sheetExceedsPrintableWidth(
  sheet: SpreadsheetSheet,
  defaults?: SpreadsheetDefaults,
): boolean {
  const layout = estimatePrintLayout(sheet, defaults);
  return layout.contentWidthPoints * layout.scale > layout.printableWidthPoints;
}

function rowTop(row: number, rowHeights: number[], defaultHeight: number): number {
  let top = 0;
  for (let index = 0; index < row; index += 1) {
    top += rowHeights[index] ?? defaultHeight;
  }
  return top;
}

function repeatedTitleHeight(
  sheet: SpreadsheetSheet,
  rowHeights: number[],
  defaultHeight: number,
): number {
  const titles = sheet.pageSetup?.printTitles?.rows;
  if (!titles) return 0;
  let height = 0;
  for (let row = titles.start; row <= titles.end; row += 1) {
    height += rowHeights[row] ?? defaultHeight;
  }
  return height;
}

export function chartCrossesEstimatedPageBreak(
  sheet: SpreadsheetSheet,
  chart: NonNullable<SpreadsheetSheet["charts"]>[number],
  defaults?: SpreadsheetDefaults,
): boolean {
  if (sheet.pageSetup?.fitToHeight === 1) return false;
  const layout = estimatePrintLayout(sheet, defaults);
  const defaultHeight = defaults?.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const scaledPageHeight = layout.printableHeightPoints / Math.max(layout.scale, 0.1);
  const titleHeight = repeatedTitleHeight(sheet, layout.rowHeights, defaultHeight);
  const continuationHeight = Math.max(defaultHeight, scaledPageHeight - titleHeight);
  const start = rowTop(chart.anchor.from.row, layout.rowHeights, defaultHeight);
  const endRow = chart.anchor.to?.row
    ?? chart.anchor.from.row + Math.ceil((chart.height ?? DEFAULT_CHART_HEIGHT_PIXELS) / PIXELS_PER_ROW);
  const end = rowTop(endRow, layout.rowHeights, defaultHeight);
  if (end <= scaledPageHeight) return false;
  if (start < scaledPageHeight) return true;
  return Math.floor((start - scaledPageHeight) / continuationHeight)
    !== Math.floor((Math.max(start, end - 0.01) - scaledPageHeight) / continuationHeight);
}

export function chartSafeRowBreaks(
  sheet: SpreadsheetSheet,
  defaults?: SpreadsheetDefaults,
): number[] {
  if (sheet.pageSetup?.fitToHeight === 1) return [];
  const breakRows = new Set<number>();
  const fittedPageCount = sheet.pageSetup?.fitToHeight;
  if (
    (sheet.charts?.length ?? 0) === 0
    && typeof fittedPageCount === "number"
    && fittedPageCount > 1
    && sheet.rows.length > fittedPageCount
  ) {
    const rowsPerPage = Math.ceil(sheet.rows.length / fittedPageCount);
    for (let page = 1; page < fittedPageCount; page += 1) {
      const breakRow = rowsPerPage * page;
      if (breakRow < sheet.rows.length) breakRows.add(breakRow);
    }
  }
  for (const chart of sheet.charts ?? []) {
    const followsData = chart.anchor.from.row >= sheet.rows.length;
    if (
      chart.anchor.from.row > 0
      && (followsData || chartCrossesEstimatedPageBreak(sheet, chart, defaults))
    ) {
      breakRows.add(chart.anchor.from.row);
    }
  }
  return [...breakRows].sort((left, right) => left - right);
}
