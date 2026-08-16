// src/typography/tableAutoSize.ts — Table auto-sizing algorithm

import type { TableData, TableCell, TextRun } from "../types/ast.js";
import { calculateRichTextMetrics } from "./richMetrics.js";
import { getFontOrNull } from "./fontCache.js";

/**
 * Converts a cell's content to a flat TextRun array for metrics calculation.
 */
function cellToRuns(cell: TableCell): TextRun[] {
  if (cell.paragraphs && cell.paragraphs.length > 0) {
    return cell.paragraphs.flatMap(p => p.runs);
  }
  if (cell.content && Array.isArray(cell.content)) {
    return cell.content as TextRun[];
  }
  if (typeof cell.text === "string" && cell.text.length > 0) {
    return [{ text: cell.text }];
  }
  return [];
}

/**
 * Bold-aware character-count heuristic, used when HarfBuzz has no font data (returns 0).
 * Bold text uses a wider per-character factor (0.65) than regular text (0.60).
 */
function charCountWidth(cell: TableCell, fontSize: number, fontWeight: string | undefined): number {
  const isBold = fontWeight === "bold";
  const charWidthFactor = isBold ? 0.65 : 0.6;
  const runs = cellToRuns(cell);
  return runs.reduce((max, run) => {
    const runFontSize = run.style?.fontSize ?? fontSize;
    const runBold = (run.style?.fontWeight ?? (isBold ? "bold" : "normal")) === "bold";
    const factor = runBold ? 0.65 : 0.6;
    return Math.max(max, run.text.length * runFontSize * factor);
  }, (cell.text ?? "").length * fontSize * charWidthFactor);
}

/**
 * Returns true if any font relevant to the cell's text is available in the
 * HarfBuzz font cache. Used to decide whether to use metric-based or
 * heuristic-based width estimation.
 */
function hasFontData(runs: TextRun[], defaultFontFamily: string | undefined): boolean {
  const checked = new Set<string>();
  const families = [
    defaultFontFamily ?? "Helvetica",
    ...runs.map(r => r.style?.fontFamily).filter(Boolean) as string[],
  ];
  for (const fam of families) {
    if (!checked.has(fam)) {
      checked.add(fam);
      if (getFontOrNull(fam)) return true;
    }
  }
  return false;
}

/**
 * Estimates the pixel width of a cell's text content.
 * Uses HarfBuzz shaping (via calculateRichTextMetrics) when fonts are loaded.
 * Falls back to a bold-aware character-count heuristic when no fonts are in
 * the font cache (common in test environments without font loading).
 */
function estimateCellTextWidth(cell: TableCell, defaultFontSize: number = 16): number {
  const fontSize = cell.style?.fontSize ?? defaultFontSize;
  const fontFamily = cell.style?.fontFamily;
  const fontWeight = cell.style?.fontWeight;
  const defaultStyle = { fontSize, fontFamily, fontWeight };

  const runs = cellToRuns(cell);
  if (runs.length === 0) return 0;

  // Check if any relevant font is loaded before trying HarfBuzz shaping.
  // Without font data, shapeSegmentWidth returns 0 and richMetrics falls back
  // to a flat 0.6 factor that doesn't distinguish bold from regular text.
  if (!hasFontData(runs, fontFamily)) {
    return charCountWidth(cell, fontSize, fontWeight);
  }

  // For paragraph-based cells, measure each paragraph separately and take max
  // (each paragraph may have different runs and the max line width matters for column sizing)
  if (cell.paragraphs && cell.paragraphs.length > 1) {
    let maxWidth = 0;
    for (const para of cell.paragraphs) {
      if (para.runs.length === 0) continue;
      const metrics = calculateRichTextMetrics(para.runs, defaultStyle);
      maxWidth = Math.max(maxWidth, metrics.width);
    }
    return maxWidth;
  }

  return calculateRichTextMetrics(runs, defaultStyle).width;
}

const MIN_COLUMN_WIDTH = 30;  // pixels

/**
 * Auto-size table columns based on content width or distribute evenly.
 *
 * @param tableData - The table data with rows/cells
 * @param containerWidth - Total available width in pixels
 * @returns Array of column widths in pixels
 */
export function autoSizeTableColumns(
  tableData: TableData,
  containerWidth: number,
): number[] {
  const colCount = tableData.columns.length;
  if (colCount === 0) return [];

  // "distribute" mode: equal column widths
  if (tableData.autoFit === "distribute") {
    const colWidth = containerWidth / colCount;
    return new Array(colCount).fill(colWidth);
  }

  // Content-based auto-fit
  // Step 1: Calculate max content width per column
  const maxWidths = new Array(colCount).fill(0);

  for (const row of tableData.rows) {
    let colIdx = 0;
    for (const cell of row.cells) {
      if (colIdx >= colCount) break;

      // Skip merge ghost cells
      if (cell.vMerge || cell.hMerge) {
        colIdx++;
        continue;
      }

      const cellWidth = estimateCellTextWidth(cell);
      const padding = cell.style?.padding ?? 5;
      const totalWidth = cellWidth + padding * 2;

      const span = cell.colSpan ?? 1;
      if (span === 1) {
        maxWidths[colIdx] = Math.max(maxWidths[colIdx], totalWidth);
      } else {
        // Distribute merged cell width across spanned columns
        const perCol = totalWidth / span;
        for (let s = 0; s < span && colIdx + s < colCount; s++) {
          maxWidths[colIdx + s] = Math.max(maxWidths[colIdx + s], perCol);
        }
      }

      colIdx += span;
    }
  }

  // Step 2: Apply minimum widths
  for (let i = 0; i < colCount; i++) {
    maxWidths[i] = Math.max(maxWidths[i], MIN_COLUMN_WIDTH);
  }

  // Step 3: Scale proportionally to fit containerWidth
  const totalContentWidth = maxWidths.reduce((sum, w) => sum + w, 0);

  if (totalContentWidth <= 0) {
    // Fallback: equal distribution
    const colWidth = containerWidth / colCount;
    return new Array(colCount).fill(colWidth);
  }

  const scale = containerWidth / totalContentWidth;
  return maxWidths.map(w => w * scale);
}
