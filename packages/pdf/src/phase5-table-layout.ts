import {
  buildFontInputKey,
  formatPdfNumber,
  prepareEmbeddedFonts,
  shapeEmbeddedText,
  type PdfEmbeddedFontInput,
  type PdfFontInput,
  type PreparedEmbeddedFont,
} from "./font-embedding.js";
import { measureHelveticaText } from "./helvetica-widths.js";
import { breakTextIntoLines, type PdfLineToken } from "./phase3-linebreak.js";
import {
  DEFAULT_DIVIDER_COLOR,
  layoutContainerNode,
  layoutTopLevelTextNode,
  resolveDividerLayout,
  type Phase3AnchorPlacement,
  type Phase3LinePlacement,
  type PreparedPhase3Fonts,
} from "./phase3-render.js";
import type {
  PdfDocumentPhase3,
  PdfDocumentLayoutNode,
  PdfPhase3ContainerNode,
  PdfPhase3HeadingNode,
  PdfPhase3Link,
  PdfPhase3Margins,
  PdfPhase3Node,
  PdfPhase3ParagraphNode,
  PdfPhase3PreformattedNode,
  PdfPhase3Style,
  PdfPhase3TextBase,
} from "./phase3-types.js";
import type { PdfGraphic, PdfLineGraphic, PdfRectGraphic } from "./phase4-types.js";
import type {
  PdfPhase5Border,
  PdfPhase5CellContentNode,
  PdfPhase5CellStyle,
  PdfPhase5TableCell,
  PdfPhase5TableColumn,
  PdfPhase5TableNode,
  PdfPhase5TableRow,
  PdfPhase5TableStyle,
} from "./phase5-types.js";
import type { PdfRenderableText, PdfRenderedPage } from "./pdf-renderer.js";
import { PdfError } from "./errors.js";

interface PreparedTextPlacement extends Omit<PdfRenderableText, "x" | "y"> {
  ascent: number;
  blockId?: string;
  height: number;
  kind?: "heading" | "paragraph" | "preformatted";
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  link?: PdfPhase3Link;
  top: number;
  x: number;
}

interface DetailedRenderedText extends PdfRenderableText {
  ascent?: number;
  blockId?: string;
  kind?: "heading" | "paragraph" | "preformatted";
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  lineHeight?: number;
  link?: PdfPhase3Link;
}

interface PreparedGraphicPlacement {
  bottom: number;
  graphic: PdfGraphic;
  top: number;
}

interface PreparedNodeContent {
  graphics: PreparedGraphicPlacement[];
  height: number;
  texts: PreparedTextPlacement[];
}

interface PreparedTableCell {
  colSpan: number;
  colStart: number;
  content: PreparedNodeContent;
  fullHeight: number;
  index: number;
  role: "td" | "th";
  rowIndex: number;
  rowSpan: number;
  style: RequiredCellStyle;
  width: number;
}

interface PreparedTableRow {
  cells: PreparedTableCell[];
  height: number;
  index: number;
  keepTogether: boolean;
  style?: PdfPhase5TableRow["style"];
}

interface PreparedTableLayout {
  bodyRows: PreparedTableRow[];
  cellMap: Map<string, PreparedTableCell>;
  columns: number[];
  footerRows: PreparedTableRow[];
  headerRows: PreparedTableRow[];
  height: number;
  id: string;
  logicalRows: PreparedTableRow[];
  rowTops: number[];
  style: RequiredTableStyle;
  width: number;
}

interface TableRowFragment {
  height: number;
  logicalRowIndex: number;
  rowSliceStart: number;
}

export interface Phase5TableFragmentAnalysis {
  bodyRowIndices: number[];
  headerRowCount: number;
  pageIndex: number;
  rowFragments: Array<{ bodyRowIndex: number; height: number; rowSliceStart: number }>;
  tableId: string;
  tableTop: number;
}

interface TablePageRenderResult {
  analysis: Phase5TableFragmentAnalysis;
  consumedHeight: number;
  graphics: PdfGraphic[];
  texts: DetailedRenderedText[];
}

interface Phase5TablePaginationResult {
  consumedHeight: number;
  fragments: TablePageRenderResult[];
}

export interface Phase5DocumentAnalysis {
  meta: NonNullable<PdfDocumentPhase3["meta"]>;
  page: {
    height: number;
    margins: PdfPhase3Margins;
    width: number;
  };
  pages: PdfRenderedPage[];
  tables: Array<{
    columnWidths: number[];
    fragments: Phase5TableFragmentAnalysis[];
    id: string;
    totalBodyRows: number;
  }>;
}

export interface Phase5DetailedDocumentAnalysis extends Phase5DocumentAnalysis {
  anchors: Phase3AnchorPlacement[];
  linePlacements: Phase3LinePlacement[];
}

export interface TablePaginationQualityDecision {
  adjacentHeadingFits: boolean;
  adjacentHeadingPageIndex?: number;
  balancedSplitAllowed?: boolean;
  documentPageStartIndex: number;
  firstFragmentTableTop?: number;
  fitsOnFreshPage: boolean;
  fragmentPageIndices: number[];
  wouldSplitOnCurrentPage: boolean;
}

export function assertTablePaginationQualityGate(
  decision: TablePaginationQualityDecision,
): void {
  decision.fragmentPageIndices.forEach((pageIndex, fragmentIndex) => {
    const expected = decision.documentPageStartIndex + fragmentIndex;
    if (pageIndex !== expected) {
      throw new Error(
        `Table fragment page indices must be document-relative and contiguous: expected ${expected}, received ${pageIndex}.`,
      );
    }
  });

  if (
    decision.fitsOnFreshPage
    && decision.wouldSplitOnCurrentPage
    && !decision.balancedSplitAllowed
  ) {
    const startsAtFreshPageTop = decision.adjacentHeadingFits
      ? (decision.firstFragmentTableTop ?? -1) >= 0
      : decision.firstFragmentTableTop === 0;
    if (decision.fragmentPageIndices.length !== 1 || !startsAtFreshPageTop) {
      throw new Error(
        "A fresh-page-sized table must be deferred intact; splitting it leaves needless terminal-page slack.",
      );
    }
    if (
      decision.adjacentHeadingFits
      && decision.adjacentHeadingPageIndex !== decision.fragmentPageIndices[0]
    ) {
      throw new Error("An adjacent heading that fits with a deferred table must move to the table page.");
    }
  }
}

export function assertHeadingRelocationCoordinates<T extends { y: number }>(
  before: T[],
  after: T[],
  topDownOffset: number,
): void {
  if (before.length !== after.length || before.some(
    (text, index) => Math.abs((after[index]?.y ?? Number.NaN) - (text.y + topDownOffset)) > 1e-9,
  )) {
    throw new Error("Adjacent heading relocation must translate bottom-up PDF y coordinates by cursorBefore.");
  }
}

export function relocateAdjacentHeadingTexts<T extends { y: number }>(
  texts: T[],
  topDownOffset: number,
): T[] {
  const relocated = texts.map((text) => ({ ...text, y: text.y + topDownOffset }));
  assertHeadingRelocationCoordinates(texts, relocated, topDownOffset);
  return relocated;
}

interface RequiredBorder {
  color: PdfPhase5Border["color"];
  style: NonNullable<PdfPhase5Border["style"]>;
  width: number;
}

interface RequiredCellStyle {
  backgroundColor?: PdfPhase5CellStyle["backgroundColor"];
  borderBottom?: RequiredBorder;
  borderLeft?: RequiredBorder;
  borderRight?: RequiredBorder;
  borderTop?: RequiredBorder;
  minHeight: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  verticalAlign: NonNullable<PdfPhase5CellStyle["verticalAlign"]>;
}

interface RequiredTableStyle {
  backgroundColor?: PdfPhase5TableStyle["backgroundColor"];
  borderBottom?: RequiredBorder;
  borderCollapse: "collapse";
  borderLeft?: RequiredBorder;
  borderRight?: RequiredBorder;
  borderTop?: RequiredBorder;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  maxWidth?: number | string;
  width?: number | string;
}

const DEFAULT_FONT = "Helvetica";
const DEFAULT_CELL_MIN_HEIGHT = 24;
const DEFAULT_CELL_PADDING = 6;
const DEFAULT_LINE_HEIGHT = 1.2;
const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const A4_WIDTH = 595.276;
const A4_HEIGHT = 841.89;
const MIN_COLUMN_WIDTH = 36;
const TERMINAL_PAGE_MINIMUM_USAGE = 0.4;
const DOCUMENT_COMPACTION_SCALES = [0.96, 0.92, 0.88] as const;
const SHORT_DOCUMENT_RHYTHM_SCALES = [1.04, 1.08, 1.12] as const;
const TERMINAL_PAGE_RHYTHM_SCALES = [1.12, 1.2, 1.3, 1.4] as const;
const SINGLE_PAGE_TARGET_USAGE = 0.82;
const TWO_PAGE_TERMINAL_TARGET_USAGE = 0.78;
const TWO_PAGE_MAXIMUM_IMBALANCE = 0.22;
const TWO_PAGE_MINIMUM_ACCEPTED_USAGE = 0.55;
const MINIMUM_USAGE_IMPROVEMENT = 0.08;
const MINIMUM_IMBALANCE_IMPROVEMENT = 0.12;
const MINIMUM_COMPACTED_FONT_SIZE = 8;

function schemaError(message: string, path: string, extra?: Record<string, unknown>): PdfError {
  return new PdfError("SCHEMA_REJECTED", message, { path, ...extra });
}

function layoutError(message: string, path: string, extra?: Record<string, unknown>): PdfError {
  return new PdfError("LAYOUT_IMPOSSIBLE", message, {
    path,
    phase: "phase5-table-layout",
    capability: "tables",
    ...extra,
  });
}

function isEmbeddedFont(font: PdfFontInput | undefined): font is PdfEmbeddedFontInput {
  return typeof font === "object" && font !== null;
}

function isTextNode(node: PdfDocumentLayoutNode | PdfPhase5CellContentNode): node is PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode {
  return node.type === "heading" || node.type === "paragraph" || node.type === "preformatted";
}

function isContainerNode(node: PdfDocumentLayoutNode | PdfPhase5CellContentNode): node is PdfPhase3ContainerNode {
  return node.type === "container";
}

function isTableNode(node: PdfDocumentLayoutNode | PdfPhase5CellContentNode): node is PdfPhase5TableNode {
  return node.type === "table";
}

function getStyleSpacing(style: PdfPhase3Style | undefined, key: "margin" | "padding", edge: "Top" | "Right" | "Bottom" | "Left"): number {
  const direct = style?.[`${key}${edge}` as keyof PdfPhase3Style];
  if (typeof direct === "number") {
    return direct;
  }
  return typeof style?.[key] === "number" ? (style[key] as number) : 0;
}

function resolveNumericDimension(value: number | string | undefined, availableSpace: number): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.endsWith("%")) {
    const percent = Number.parseFloat(value.slice(0, -1));
    if (Number.isFinite(percent)) {
      return (availableSpace * percent) / 100;
    }
  }
  return undefined;
}

function normalizeMargins(margin?: number | Partial<PdfPhase3Margins>): PdfPhase3Margins {
  if (typeof margin === "number") {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }

  return {
    top: margin?.top ?? 72,
    right: margin?.right ?? 72,
    bottom: margin?.bottom ?? 72,
    left: margin?.left ?? 72,
  };
}

function normalizePageSize(size?: PdfDocumentPhase3["page"] extends infer T ? T extends { size?: infer U } ? U : never : never): { height: number; width: number } {
  if (!size || size === "Letter" || size === "letter") {
    return { width: LETTER_WIDTH, height: LETTER_HEIGHT };
  }
  if (size === "A4" || size === "a4") {
    return { width: A4_WIDTH, height: A4_HEIGHT };
  }
  return { width: size.width, height: size.height };
}

function normalizePhase5Document(document: PdfDocumentPhase3): {
  children: PdfDocumentLayoutNode[];
  meta: NonNullable<PdfDocumentPhase3["meta"]>;
  page: {
    height: number;
    margins: PdfPhase3Margins;
    width: number;
  };
} {
  if (!document || typeof document !== "object") {
    throw new TypeError("PdfEngine.render requires a PDF document object");
  }

  const hasChildren = Array.isArray(document.children);
  const hasContent = Array.isArray(document.content);
  if (hasChildren && hasContent) {
    throw new TypeError('Phase 5 documents must use either "children" or "content", not both');
  }

  const children = (hasChildren ? document.children : document.content) ?? [];
  if (children.length === 0) {
    throw new TypeError("Phase 5 documents must provide a non-empty children array");
  }

  const size = normalizePageSize(document.page?.size);
  return {
    children: [...children],
    meta: {
      author: document.meta?.author,
      creator: document.meta?.creator,
      producer: document.meta?.producer,
      title: document.meta?.title,
    },
    page: {
      width: size.width,
      height: size.height,
      margins: normalizeMargins(document.page?.margin),
    },
  };
}

function clampBorder(border: PdfPhase5Border | undefined): RequiredBorder | undefined {
  if (!border || border.style === "none") {
    return undefined;
  }
  return {
    color: border.color,
    style: border.style ?? "solid",
    width: border.width ?? 1,
  };
}

function resolveCellStyle(
  cell: PdfPhase5TableCell,
  row: PdfPhase5TableRow,
  table: PdfPhase5TableNode,
): RequiredCellStyle {
  return {
    backgroundColor: cell.style?.backgroundColor ?? row.style?.backgroundColor ?? table.style?.backgroundColor,
    borderBottom: clampBorder(cell.style?.borderBottom ?? table.style?.borderBottom),
    borderLeft: clampBorder(cell.style?.borderLeft ?? table.style?.borderLeft),
    borderRight: clampBorder(cell.style?.borderRight ?? table.style?.borderRight),
    borderTop: clampBorder(cell.style?.borderTop ?? table.style?.borderTop),
    minHeight: cell.style?.minHeight ?? DEFAULT_CELL_MIN_HEIGHT,
    paddingBottom: cell.style?.paddingBottom ?? cell.style?.padding ?? DEFAULT_CELL_PADDING,
    paddingLeft: cell.style?.paddingLeft ?? cell.style?.padding ?? DEFAULT_CELL_PADDING,
    paddingRight: cell.style?.paddingRight ?? cell.style?.padding ?? DEFAULT_CELL_PADDING,
    paddingTop: cell.style?.paddingTop ?? cell.style?.padding ?? DEFAULT_CELL_PADDING,
    verticalAlign: cell.style?.verticalAlign ?? "top",
  };
}

function resolveTableStyle(style: PdfPhase5TableStyle | undefined): RequiredTableStyle {
  return {
    backgroundColor: style?.backgroundColor,
    borderBottom: clampBorder(style?.borderBottom),
    borderCollapse: style?.borderCollapse ?? "collapse",
    borderLeft: clampBorder(style?.borderLeft),
    borderRight: clampBorder(style?.borderRight),
    borderTop: clampBorder(style?.borderTop),
    marginBottom: getStyleSpacing(style, "margin", "Bottom"),
    marginLeft: getStyleSpacing(style, "margin", "Left"),
    marginRight: getStyleSpacing(style, "margin", "Right"),
    marginTop: getStyleSpacing(style, "margin", "Top"),
    maxWidth: style?.maxWidth,
    width: style?.width,
  };
}

function getNodeText(node: PdfPhase3TextBase, label: string): string {
  const candidates = [node.value, node.text].filter((value): value is string => typeof value === "string");
  if (candidates.length === 0) {
    throw new TypeError(`${label} must provide text or value`);
  }

  const resolved = candidates[0] as string;
  if (resolved.trim().length === 0) {
    return "";
  }

  return resolved;
}

async function preparePhase5Fonts(document: PdfDocumentPhase3): Promise<PreparedPhase3Fonts> {
  const fontGroups = new Map<string, { alias: string; font: PdfEmbeddedFontInput; samples: string[] }>();
  let counter = 2;

  const visit = (node: PdfDocumentLayoutNode | PdfPhase5CellContentNode): void => {
    if (isContainerNode(node)) {
      if (node.children.some(isTableNode)) {
        throw schemaError(
          "Phase 5 does not support table nodes nested inside container nodes",
          "children",
          { nodeType: "container", reason: "nested-table-in-container" },
        );
      }
      node.children.forEach(visit);
      return;
    }

    if (isTableNode(node)) {
      node.header?.forEach((row) => row.cells.forEach((cell) => cell.children.forEach(visit)));
      node.body.forEach((row) => row.cells.forEach((cell) => cell.children.forEach(visit)));
      node.footer?.forEach((row) => row.cells.forEach((cell) => cell.children.forEach(visit)));
      return;
    }

    if (!isTextNode(node)) {
      return;
    }

    const font = node.font ?? DEFAULT_FONT;
    if (!isEmbeddedFont(font)) {
      return;
    }

    const key = `${font.family}::${typeof font.source === "string" ? font.source : "buffer"}::${font.postscriptName ?? ""}`;
    const text = getNodeText(node, `${node.type}.value`);
    const existing = fontGroups.get(key);
    if (existing) {
      existing.samples.push(text);
      return;
    }

    fontGroups.set(key, {
      alias: `F${counter}`,
      font,
      samples: [text],
    });
    counter += 1;
  };

  const children = (document.children ?? document.content ?? []);
  children.forEach(visit);

  return {
    embedded: await prepareEmbeddedFonts([...fontGroups.values()]),
    measureCache: new Map<string, number>(),
  };
}

function getPreparedFont(fonts: PreparedPhase3Fonts, font: PdfFontInput | undefined): PreparedEmbeddedFont | undefined {
  if (!isEmbeddedFont(font)) {
    return undefined;
  }
  for (const prepared of fonts.embedded.values()) {
    if (prepared.family === font.family && prepared.postscriptName === (font.postscriptName ?? prepared.postscriptName)) {
      return prepared;
    }
  }
  return undefined;
}

async function measureTextWidth(
  fonts: PreparedPhase3Fonts,
  font: PdfFontInput | undefined,
  text: string,
  fontSize: number,
  direction: "auto" | "ltr" | "rtl" = "auto",
): Promise<number> {
  const resolvedFont = font ?? DEFAULT_FONT;
  const cacheKey = `${typeof resolvedFont === "string" ? resolvedFont : `${resolvedFont.family}:${resolvedFont.postscriptName ?? ""}`}:${fontSize}:${direction}:${text}`;
  const cached = fonts.measureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let width: number;
  const prepared = getPreparedFont(fonts, resolvedFont);
  if (prepared) {
    const shaped = await shapeEmbeddedText(prepared, text, fontSize, 0, 0, direction);
    width = shaped.totalAdvancePoints;
  } else {
    width = measureHelveticaText(text, fontSize);
  }

  fonts.measureCache.set(cacheKey, width);
  return width;
}

async function tokenizeText(fonts: PreparedPhase3Fonts, node: PdfPhase3TextBase, label: string): Promise<PdfLineToken[]> {
  const fontSize = node.fontSize ?? 12;
  const direction = node.direction ?? "auto";
  const text = getNodeText(node, label)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[\u200B\u200D]/gu, "");
  const parts = text.match(/(\n|[ ]+|[^ \n]+)/g) ?? [text];
  const tokens: PdfLineToken[] = [];

  for (const part of parts) {
    if (part === "\n") {
      tokens.push({ text: part, width: 0, isSpace: false, mandatory: true });
      continue;
    }
    tokens.push({
      text: part,
      width: await measureTextWidth(fonts, node.font, part, fontSize, direction),
      isSpace: /^[ ]+$/u.test(part),
      mandatory: false,
    });
  }

  return tokens;
}

async function measureNodeMinWidth(node: PdfPhase5CellContentNode, fonts: PreparedPhase3Fonts): Promise<number> {
  if (isTableNode(node)) {
    return 96;
  }
  if (isContainerNode(node)) {
    const childWidths = await Promise.all(node.children.map((child) => measureNodeMinWidth(child as PdfPhase5CellContentNode, fonts)));
    return childWidths.length === 0 ? MIN_COLUMN_WIDTH : Math.max(...childWidths);
  }
  if (node.type === "preformatted") {
    const fontSize = node.fontSize ?? 12;
    const direction = node.direction ?? "auto";
    const text = getNodeText(node, `${node.type}.value`);
    const lines = text.replace(/\t/g, "    ").split(/\r?\n/);
    const lineWidths = await Promise.all(lines.map((line) => measureTextWidth(fonts, node.font, line, fontSize, direction)));
    return Math.max(MIN_COLUMN_WIDTH, ...lineWidths);
  }

  const tokens = await tokenizeText(fonts, node, `${node.type}.value`);
  const longest = tokens.reduce((max, token) => {
    if (token.isSpace || token.mandatory) {
      return max;
    }
    return Math.max(max, token.width);
  }, 0);
  return Math.max(longest, MIN_COLUMN_WIDTH);
}

async function measureCellMinWidth(cell: PdfPhase5TableCell, fonts: PreparedPhase3Fonts, style: RequiredCellStyle): Promise<number> {
  const childWidths = await Promise.all(cell.children.map((child) => measureNodeMinWidth(child, fonts)));
  const contentWidth = childWidths.length === 0 ? MIN_COLUMN_WIDTH : Math.max(...childWidths);
  const borderWidth = (style.borderLeft?.width ?? 0) + (style.borderRight?.width ?? 0);
  return contentWidth + style.paddingLeft + style.paddingRight + borderWidth;
}

function sumWidths(widths: number[]): number {
  return widths.reduce((sum, value) => sum + value, 0);
}

function distributeWidth(total: number, weights: number[]): number[] {
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (weightTotal <= 0) {
    const even = total / Math.max(1, weights.length);
    return weights.map(() => even);
  }
  return weights.map((weight) => (total * Math.max(0, weight)) / weightTotal);
}

function buildRowsWithColumns(rows: PdfPhase5TableRow[], table: PdfPhase5TableNode): Array<PreparedTableRow & { source: PdfPhase5TableRow }> {
  const activeSpans: number[] = [];
  const built: Array<PreparedTableRow & { source: PdfPhase5TableRow }> = [];
  const declaredColumns = table.columns?.length ?? 0;

  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < activeSpans.length; column += 1) {
      activeSpans[column] = Math.max(0, (activeSpans[column] ?? 0) - 1);
    }

    let colCursor = 0;
    const cells: PreparedTableCell[] = row.cells.map((cell, cellIndex) => {
      while ((activeSpans[colCursor] ?? 0) > 0) {
        colCursor += 1;
      }

      const colSpan = Math.max(cell.colSpan ?? 1, 1);
      const rowSpan = Math.max(cell.rowSpan ?? 1, 1);
      if (declaredColumns > 0 && colCursor + colSpan > declaredColumns) {
        throw schemaError(
          `Table cell at row ${rowIndex + 1}, column ${cellIndex + 1} spans beyond declared columns (${declaredColumns})`,
          `table.rows[${rowIndex}].cells[${cellIndex}].colSpan`,
          {
            columnIndex: cellIndex,
            declaredColumns,
            rowIndex,
            rule: "table-colspan-within-declared-columns",
          },
        );
      }
      for (let offset = 0; offset < colSpan; offset += 1) {
        activeSpans[colCursor + offset] = Math.max(activeSpans[colCursor + offset] ?? 0, rowSpan);
      }

      const prepared: PreparedTableCell = {
        colSpan,
        colStart: colCursor,
        content: { graphics: [], height: 0, texts: [] },
        fullHeight: 0,
        index: cellIndex,
        role: cell.role ?? "td",
        rowIndex,
        rowSpan,
        style: resolveCellStyle(cell, row, table),
        width: 0,
      };

      colCursor += colSpan;
      return prepared;
    });

    built.push({
      cells,
      height: 0,
      index: rowIndex,
      keepTogether: row.keepTogether ?? false,
      source: row,
      style: row.style,
    });
  });

  return built;
}

function validateTableCoverage(rows: PdfPhase5TableRow[], totalColumns: number): void {
  const activeSpans = new Array<number>(totalColumns).fill(0);

  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < totalColumns; column += 1) {
      activeSpans[column] = Math.max(0, activeSpans[column] - 1);
    }

    const coveredColumns = new Array<boolean>(totalColumns).fill(false);
    activeSpans.forEach((remainingSpan, columnIndex) => {
      if (remainingSpan > 0) {
        coveredColumns[columnIndex] = true;
      }
    });

    let colCursor = 0;
    row.cells.forEach((cell, cellIndex) => {
      while (coveredColumns[colCursor]) {
        colCursor += 1;
      }

      const colSpan = Math.max(cell.colSpan ?? 1, 1);
      const rowSpan = Math.max(cell.rowSpan ?? 1, 1);

      if (colCursor + colSpan > totalColumns) {
        throw schemaError(
          `Table cell at row ${rowIndex + 1}, column ${cellIndex + 1} spans beyond column count (${totalColumns})`,
          `table.rows[${rowIndex}].cells[${cellIndex}].colSpan`,
          {
            columnCount: totalColumns,
            columnIndex: cellIndex,
            rowIndex,
            rule: "table-colspan-within-column-count",
          },
        );
      }

      for (let offset = 0; offset < colSpan; offset += 1) {
        const columnIndex = colCursor + offset;
        if (coveredColumns[columnIndex]) {
          throw schemaError(
            `Table row ${rowIndex + 1} overlaps column ${columnIndex + 1}; verify rowSpan/colSpan placeholders`,
            `table.rows[${rowIndex}].cells[${cellIndex}]`,
            {
              columnIndex,
              rowIndex,
              rule: "table-overlapping-span-placeholder",
            },
          );
        }
        coveredColumns[columnIndex] = true;
        activeSpans[columnIndex] = Math.max(activeSpans[columnIndex], rowSpan);
      }

      colCursor += colSpan;
    });

    const gapIndex = coveredColumns.findIndex((covered) => !covered);
    if (gapIndex >= 0) {
      throw schemaError(
        `Table row ${rowIndex + 1} does not cover column ${gapIndex + 1}; add placeholder cells for spanning rows`,
        `table.rows[${rowIndex}].cells`,
        {
          columnIndex: gapIndex,
          rowIndex,
          rule: "table-missing-placeholder-cell",
        },
      );
    }
  });
}

async function resolveColumnWidths(
  table: PdfPhase5TableNode,
  tableWidth: number,
  totalColumns: number,
  rows: Array<PreparedTableRow & { source: PdfPhase5TableRow }>,
  fonts: PreparedPhase3Fonts,
): Promise<number[]> {
  const columns = Array.from({ length: totalColumns }, (_, index) => table.columns?.[index] ?? ({} as PdfPhase5TableColumn));
  const hintWidths = columns.map((column) => resolveNumericDimension(column.width, tableWidth));
  const columnMinimums = columns.map((column) => column.minWidth ?? MIN_COLUMN_WIDTH);
  const contentMinimums = new Array<number>(totalColumns).fill(MIN_COLUMN_WIDTH);

  for (const row of rows) {
    for (const preparedCell of row.cells) {
      const sourceCell = row.source.cells[preparedCell.index] as PdfPhase5TableCell;
      const minWidth = await measureCellMinWidth(sourceCell, fonts, preparedCell.style);
      const spanIndices = Array.from({ length: preparedCell.colSpan }, (_, offset) => preparedCell.colStart + offset);
      const spanWeights = spanIndices.map((columnIndex) => Math.max(hintWidths[columnIndex] ?? 0, contentMinimums[columnIndex], columnMinimums[columnIndex]));
      const distributed = distributeWidth(minWidth, spanWeights);
      spanIndices.forEach((columnIndex, offset) => {
        contentMinimums[columnIndex] = Math.max(contentMinimums[columnIndex], distributed[offset] ?? 0, columnMinimums[columnIndex]);
      });
    }
  }

  const widths = columns.map((column, index) => Math.max(hintWidths[index] ?? 0, contentMinimums[index], columnMinimums[index]));
  const flexIndices = hintWidths
    .map((value, index) => (value === undefined ? index : -1))
    .filter((index) => index >= 0);
  const currentTotal = sumWidths(widths);

  if (currentTotal < tableWidth) {
    const growIndices = flexIndices.length > 0 ? flexIndices : widths.map((_, index) => index);
    const growWeights = growIndices.map((index) => Math.max(widths[index] ?? 0, contentMinimums[index], columnMinimums[index]));
    const extraWidths = distributeWidth(tableWidth - currentTotal, growWeights);
    growIndices.forEach((index, growIndex) => {
      widths[index] += extraWidths[growIndex] ?? 0;
    });
  } else if (currentTotal > tableWidth && tableWidth > 0) {
    // Preserve compact, unbroken identifiers (SKUs, codes, dates, short
    // numeric values) while descriptions absorb the table's compression.
    // Scaling every column uniformly made exact identifiers wrap mid-token
    // even when neighboring prose columns had ample break opportunities.
    const compactContentCeiling = Math.max(96, tableWidth * 0.18);
    const protectedMinimums = widths.map((_width, index) => (
      contentMinimums[index] <= compactContentCeiling
        ? Math.max(columnMinimums[index], contentMinimums[index])
        : columnMinimums[index]
    ));
    const protectedTotal = sumWidths(protectedMinimums);
    if (protectedTotal <= tableWidth) {
      const excess = currentTotal - tableWidth;
      const reducible = widths.map((width, index) => Math.max(0, width - protectedMinimums[index]));
      const reducibleTotal = sumWidths(reducible);
      widths.forEach((width, index) => {
        widths[index] = Math.max(
          protectedMinimums[index],
          width - (reducibleTotal > 0 ? excess * (reducible[index] / reducibleTotal) : 0),
        );
      });
    } else {
      const scale = tableWidth / currentTotal;
      widths.forEach((width, index) => {
        widths[index] = Math.max(columnMinimums[index], width * scale);
      });
    }
  }

  return widths.map((width, index) => {
    const column = columns[index] as PdfPhase5TableColumn;
    const maxWidth = column.maxWidth;
    const clamped = Math.max(columnMinimums[index], width);
    return maxWidth !== undefined ? Math.min(clamped, maxWidth) : clamped;
  });
}

async function prepareChildContent(
  node: PdfPhase5CellContentNode,
  availableWidth: number,
  fonts: PreparedPhase3Fonts,
  nestedCounter: { value: number },
): Promise<PreparedNodeContent> {
  if (isTableNode(node)) {
    const nestedId = `nested-${nestedCounter.value}`;
    nestedCounter.value += 1;
    const nested = await prepareTableLayout(node, availableWidth, fonts, nestedCounter, nestedId);
    const rendered = renderPreparedTableLocally(nested);
    return rendered;
  }

  if (isContainerNode(node)) {
    if (node.children.some(isTableNode)) {
      throw schemaError(
        "Phase 5 does not support tables nested inside container nodes",
        "children",
        { nodeType: "container", reason: "nested-table-in-container" },
      );
    }
    const layout = await layoutContainerNode(node, availableWidth, fonts);
    return {
      graphics: layout.graphics.map((graphic) => ({
        bottom: graphic.bottom,
        graphic: graphic.graphic,
        top: graphic.top,
      })),
      height: layout.height,
      texts: layout.texts.map((text) => ({
        ascent: text.ascent,
        blockId: text.id,
        direction: text.direction,
        font: text.font,
        fontSize: text.fontSize,
        height: text.fontSize * DEFAULT_LINE_HEIGHT,
        kind: text.kind,
        level: text.level,
        link: text.link,
        spaceCount: text.spaceCount,
        top: text.top,
        value: text.value,
        width: text.width,
        wordSpacing: text.wordSpacing,
        x: text.x,
      })),
    };
  }

  const block = await layoutTopLevelTextNode(node, availableWidth, fonts);
  return {
    graphics: [],
    height: block.height,
    texts: block.lines.map((line, lineIndex) => ({
      ascent: line.ascent,
      blockId: node.id,
      direction: line.direction,
      font: line.font,
      fontSize: line.fontSize,
      height: line.height,
      kind: node.type,
      level: node.type === "heading" ? node.level : undefined,
      link: node.link,
      spaceCount: line.spaceCount,
      top: block.marginTop + block.paddingTop + (lineIndex * line.height),
      value: line.text,
      width: line.width,
      wordSpacing: line.wordSpacing,
      x: block.marginLeft + line.x,
    })),
  };
}

function mergeContentBlocks(blocks: PreparedNodeContent[]): PreparedNodeContent {
  const texts: PreparedTextPlacement[] = [];
  const graphics: PreparedGraphicPlacement[] = [];
  let cursor = 0;

  blocks.forEach((block) => {
    block.texts.forEach((text) => {
      texts.push({ ...text, top: text.top + cursor });
    });
    block.graphics.forEach((graphic) => {
      graphics.push({
        bottom: graphic.bottom + cursor,
        graphic: graphic.graphic,
        top: graphic.top + cursor,
      });
    });
    cursor += block.height;
  });

  return {
    graphics,
    height: cursor,
    texts,
  };
}

async function prepareCellContent(
  cell: PdfPhase5TableCell,
  style: RequiredCellStyle,
  width: number,
  fonts: PreparedPhase3Fonts,
  nestedCounter: { value: number },
): Promise<PreparedNodeContent> {
  const innerWidth = Math.max(
    1,
    width -
      style.paddingLeft -
      style.paddingRight -
      (style.borderLeft?.width ?? 0) -
      (style.borderRight?.width ?? 0),
  );
  const blocks = await Promise.all(cell.children.map((child) => prepareChildContent(child, innerWidth, fonts, nestedCounter)));
  return mergeContentBlocks(blocks);
}

function sumColumns(columns: number[], start: number, span: number): number {
  return columns.slice(start, start + span).reduce((sum, value) => sum + value, 0);
}

function computeRowHeights(rows: Array<PreparedTableRow & { source: PdfPhase5TableRow }>): void {
  rows.forEach((row) => {
    row.height = Math.max(
      row.height,
      ...row.cells
        .filter((cell) => cell.rowSpan === 1)
        .map((cell) =>
          Math.max(
            cell.style.minHeight,
            cell.content.height +
              cell.style.paddingTop +
              cell.style.paddingBottom +
              (cell.style.borderTop?.width ?? 0) +
              (cell.style.borderBottom?.width ?? 0),
          ),
        ),
      DEFAULT_CELL_MIN_HEIGHT,
    );
  });

  for (let iteration = 0; iteration < 8; iteration += 1) {
    let updated = false;
    for (const row of rows) {
      for (const cell of row.cells.filter((candidate) => candidate.rowSpan > 1)) {
        const current = rows.slice(cell.rowIndex, cell.rowIndex + cell.rowSpan).reduce((sum, entry) => sum + entry.height, 0);
        const required = Math.max(
          cell.style.minHeight,
          cell.content.height +
            cell.style.paddingTop +
            cell.style.paddingBottom +
            (cell.style.borderTop?.width ?? 0) +
            (cell.style.borderBottom?.width ?? 0),
        );
        if (current < required) {
          rows[cell.rowIndex + cell.rowSpan - 1].height += required - current;
          updated = true;
        }
      }
    }
    if (!updated) {
      break;
    }
  }

  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      cell.fullHeight = rows.slice(cell.rowIndex, cell.rowIndex + cell.rowSpan).reduce((sum, entry) => sum + entry.height, 0);
    });
  });
}

function buildCellMap(rows: PreparedTableRow[]): Map<string, PreparedTableCell> {
  const cellMap = new Map<string, PreparedTableCell>();
  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      for (let rowOffset = 0; rowOffset < cell.rowSpan; rowOffset += 1) {
        for (let colOffset = 0; colOffset < cell.colSpan; colOffset += 1) {
          cellMap.set(`${cell.rowIndex + rowOffset}:${cell.colStart + colOffset}`, cell);
        }
      }
    });
  });
  return cellMap;
}

async function prepareRows(
  rows: PdfPhase5TableRow[],
  table: PdfPhase5TableNode,
  columns: number[],
  fonts: PreparedPhase3Fonts,
  nestedCounter: { value: number },
): Promise<PreparedTableRow[]> {
  const withColumns = buildRowsWithColumns(rows, table);
  for (const row of withColumns) {
    for (const cell of row.cells) {
      const source = row.source.cells[cell.index] as PdfPhase5TableCell;
      cell.width = sumColumns(columns, cell.colStart, cell.colSpan);
      cell.content = await prepareCellContent(source, cell.style, cell.width, fonts, nestedCounter);
    }
  }
  computeRowHeights(withColumns);
  return withColumns;
}

function offsetPreparedRows(rows: PreparedTableRow[], offset: number): PreparedTableRow[] {
  rows.forEach((row, rowIndex) => {
    row.index = offset + rowIndex;
    row.cells.forEach((cell) => {
      cell.rowIndex += offset;
    });
  });
  return rows;
}

async function prepareTableLayout(
  table: PdfPhase5TableNode,
  availableWidth: number,
  fonts: PreparedPhase3Fonts,
  nestedCounter: { value: number },
  id: string,
): Promise<PreparedTableLayout> {
  const style = resolveTableStyle(table.style);
  const unconstrainedWidth = resolveNumericDimension(style.width, availableWidth) ?? Math.max(0, availableWidth - style.marginLeft - style.marginRight);
  const maxWidth = resolveNumericDimension(style.maxWidth, availableWidth);
  const width = maxWidth === undefined ? unconstrainedWidth : Math.min(unconstrainedWidth, maxWidth);
  const headerWithColumns = buildRowsWithColumns(table.header ?? [], table);
  const bodyWithColumns = buildRowsWithColumns(table.body, table);
  const footerWithColumns = buildRowsWithColumns(table.footer ?? [], table);
  const totalColumns = Math.max(
    1,
    ...[...headerWithColumns, ...bodyWithColumns, ...footerWithColumns].map((row) =>
      row.cells.reduce((sum, cell) => Math.max(sum, cell.colStart + cell.colSpan), 0),
    ),
  );
  validateTableCoverage(table.header ?? [], totalColumns);
  validateTableCoverage(table.body, totalColumns);
  validateTableCoverage(table.footer ?? [], totalColumns);
  const columns = await resolveColumnWidths(table, width, totalColumns, [...headerWithColumns, ...bodyWithColumns, ...footerWithColumns], fonts);
  const headerRows = offsetPreparedRows(await prepareRows(table.header ?? [], table, columns, fonts, nestedCounter), 0);
  const bodyRows = offsetPreparedRows(await prepareRows(table.body, table, columns, fonts, nestedCounter), headerRows.length);
  const footerRows = offsetPreparedRows(await prepareRows(table.footer ?? [], table, columns, fonts, nestedCounter), headerRows.length + bodyRows.length);
  const logicalRows = [...headerRows, ...bodyRows, ...footerRows];
  const rowTops: number[] = [];
  let cursor = 0;
  logicalRows.forEach((row, index) => {
    rowTops[index] = cursor;
    cursor += row.height;
  });

  return {
    bodyRows,
    cellMap: buildCellMap(logicalRows),
    columns,
    footerRows,
    headerRows,
    height: cursor,
    id,
    logicalRows,
    rowTops,
    style,
    width,
  };
}

function borderPriority(border: RequiredBorder | undefined): number {
  if (!border) {
    return 0;
  }
  const stylePriority = border.style === "double" ? 4 : border.style === "solid" ? 3 : border.style === "dashed" ? 2 : border.style === "dotted" ? 1 : 0;
  return (Math.round(border.width * 100) * 10) + stylePriority;
}

function pickWinningBorder(a: RequiredBorder | undefined, b: RequiredBorder | undefined): RequiredBorder | undefined {
  if (!a) return b;
  if (!b) return a;
  return borderPriority(a) >= borderPriority(b) ? a : b;
}

function shouldDrawCurrentBorder(
  current: RequiredBorder | undefined,
  neighbor: RequiredBorder | undefined,
  preferCurrentOnTie: boolean,
): boolean {
  if (!current) {
    return false;
  }
  if (!neighbor) {
    return true;
  }
  const currentPriority = borderPriority(current);
  const neighborPriority = borderPriority(neighbor);
  if (currentPriority === neighborPriority) {
    return preferCurrentOnTie;
  }
  return currentPriority > neighborPriority;
}

function columnX(columns: number[], column: number): number {
  return columns.slice(0, column).reduce((sum, value) => sum + value, 0);
}

function rowTop(rows: PreparedTableRow[], rowIndex: number): number {
  return rows.slice(0, rowIndex).reduce((sum, row) => sum + row.height, 0);
}

function rowHeight(rows: PreparedTableRow[], rowIndex: number, span: number): number {
  return rows.slice(rowIndex, rowIndex + span).reduce((sum, row) => sum + row.height, 0);
}

function renderBorderLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  border: RequiredBorder | undefined,
): PdfGraphic[] {
  if (!border || border.style === "none" || border.width <= 0) {
    return [];
  }

  if (border.style === "double") {
    const offset = Math.max(border.width, 1);
    if (x1 === x2) {
      return [
        {
          type: "line",
          x1: x1 - offset,
          y1,
          x2: x2 - offset,
          y2,
          stroke: { color: border.color, style: "solid", width: Math.max(0.5, border.width / 3) },
        } satisfies PdfLineGraphic,
        {
          type: "line",
          x1: x1 + offset,
          y1,
          x2: x2 + offset,
          y2,
          stroke: { color: border.color, style: "solid", width: Math.max(0.5, border.width / 3) },
        } satisfies PdfLineGraphic,
      ];
    }
    return [
      {
        type: "line",
        x1,
        y1: y1 - offset,
        x2,
        y2: y2 - offset,
        stroke: { color: border.color, style: "solid", width: Math.max(0.5, border.width / 3) },
      } satisfies PdfLineGraphic,
      {
        type: "line",
        x1,
        y1: y1 + offset,
        x2,
        y2: y2 + offset,
        stroke: { color: border.color, style: "solid", width: Math.max(0.5, border.width / 3) },
      } satisfies PdfLineGraphic,
    ];
  }

  return [
    {
      type: "line",
      x1,
      y1,
      x2,
      y2,
      stroke: {
        color: border.color,
        style: border.style === "dashed" || border.style === "dotted" ? border.style : "solid",
        width: border.width,
      },
    } satisfies PdfLineGraphic,
  ];
}

function buildCellTextsForSlice(
  cell: PreparedTableCell,
  visibleStart: number,
  visibleHeight: number,
  cellX: number,
  cellY: number,
): DetailedRenderedText[] {
  const innerTop = cellY + (cell.style.borderTop?.width ?? 0) + cell.style.paddingTop;
  const innerLeft = cellX + (cell.style.borderLeft?.width ?? 0) + cell.style.paddingLeft;
  const verticalInset = cell.fullHeight - cell.content.height - cell.style.paddingTop - cell.style.paddingBottom;
  const contentOffset = cell.style.verticalAlign === "middle"
    ? Math.max(0, verticalInset / 2)
    : cell.style.verticalAlign === "bottom"
      ? Math.max(0, verticalInset)
      : 0;
  const sliceTop = visibleStart;
  const sliceBottom = visibleStart + visibleHeight;

  return cell.content.texts
    .filter((text) => {
      const top = contentOffset + text.top;
      // Assign each line to exactly one page slice by its top edge. Testing
      // rectangle intersection here duplicates a line that straddles the
      // split boundary on both pages, which corrupts extracted cell text.
      return top >= sliceTop && top < sliceBottom;
    })
    .map((text) => {
      const localTop = contentOffset + text.top - sliceTop;
      return {
        ascent: text.ascent,
        blockId: text.blockId,
        direction: text.direction,
        font: text.font,
        fontSize: text.fontSize,
        kind: text.kind,
        level: text.level,
        lineHeight: text.height,
        link: text.link,
        spaceCount: text.spaceCount,
        value: text.value,
        width: text.width,
        wordSpacing: text.wordSpacing,
        x: innerLeft + text.x,
        y: cellY + visibleHeight - localTop - text.ascent - (cell.style.borderBottom?.width ?? 0) - cell.style.paddingBottom,
      };
    });
}

function buildCellGraphicsForSlice(
  cell: PreparedTableCell,
  visibleStart: number,
  visibleHeight: number,
  cellX: number,
  cellY: number,
): PdfGraphic[] {
  const innerLeft = cellX + (cell.style.borderLeft?.width ?? 0) + cell.style.paddingLeft;
  const verticalInset = cell.fullHeight - cell.content.height - cell.style.paddingTop - cell.style.paddingBottom;
  const contentOffset = cell.style.verticalAlign === "middle"
    ? Math.max(0, verticalInset / 2)
    : cell.style.verticalAlign === "bottom"
      ? Math.max(0, verticalInset)
      : 0;
  const sliceTop = visibleStart;
  const sliceBottom = visibleStart + visibleHeight;

  return cell.content.graphics
    .filter((graphic) => graphic.bottom + contentOffset > sliceTop && graphic.top + contentOffset < sliceBottom)
    .map((graphic) => {
      const translated = structuredClone(graphic.graphic) as PdfGraphic;
      if (translated.type === "rect") {
        translated.x += innerLeft;
        translated.y += cellY + visibleHeight - (graphic.top + contentOffset - sliceTop) - translated.height;
      } else if (translated.type === "line") {
        translated.x1 += innerLeft;
        translated.x2 += innerLeft;
        translated.y1 += cellY + visibleHeight - (graphic.top + contentOffset - sliceTop) - (graphic.bottom - graphic.top);
        translated.y2 += cellY + visibleHeight - (graphic.top + contentOffset - sliceTop) - (graphic.bottom - graphic.top);
      } else if (translated.type === "path") {
        translated.x = (translated.x ?? 0) + innerLeft;
        translated.y = (translated.y ?? 0) + cellY + visibleHeight - (graphic.top + contentOffset - sliceTop);
      } else if (translated.type === "image" || translated.type === "svg") {
        translated.x += innerLeft;
        translated.y += cellY + visibleHeight - (graphic.top + contentOffset - sliceTop) - translated.height;
      }
      return translated;
    });
}

function renderCellFragment(
  cell: PreparedTableCell,
  fullRows: PreparedTableRow[],
  fragmentTop: number,
  fragmentHeight: number,
  pageX: number,
  pageY: number,
  columns: number[],
  cellMap: Map<string, PreparedTableCell>,
): { graphics: PdfGraphic[]; texts: PdfRenderableText[] } {
  const cellTop = rowTop(fullRows, cell.rowIndex);
  const cellHeight = rowHeight(fullRows, cell.rowIndex, cell.rowSpan);
  const cellBottom = cellTop + cellHeight;
  const fragmentBottom = fragmentTop + fragmentHeight;
  const visibleTop = Math.max(cellTop, fragmentTop);
  const visibleBottom = Math.min(cellBottom, fragmentBottom);
  if (visibleBottom <= visibleTop) {
    return { graphics: [], texts: [] };
  }

  const cellX = pageX + columnX(columns, cell.colStart);
  const cellWidth = sumColumns(columns, cell.colStart, cell.colSpan);
  const visibleHeight = visibleBottom - visibleTop;
  const cellY = pageY + fragmentHeight - (visibleTop - fragmentTop) - visibleHeight;
  const visibleSliceStart = visibleTop - cellTop;
  const visibleSliceHeight = visibleHeight;
  const graphics: PdfGraphic[] = [];

  if (cell.style.backgroundColor) {
    graphics.push({
      type: "rect",
      x: cellX,
      y: cellY,
      width: cellWidth,
      height: visibleHeight,
      fill: { color: cell.style.backgroundColor, space: "solid" },
    } satisfies PdfRectGraphic);
  }

  const hasTopEdge = visibleTop === cellTop;
  const hasBottomEdge = visibleBottom === cellBottom;
  const leftNeighbor = cellMap.get(`${cell.rowIndex}:${cell.colStart - 1}`);
  const rightNeighbor = cellMap.get(`${cell.rowIndex}:${cell.colStart + cell.colSpan}`);
  const topNeighbor = cellMap.get(`${cell.rowIndex - 1}:${cell.colStart}`);
  const bottomNeighbor = cellMap.get(`${cell.rowIndex + cell.rowSpan}:${cell.colStart}`);
  const leftBorder = pickWinningBorder(cell.style.borderLeft, leftNeighbor?.style.borderRight);
  const rightBorder = pickWinningBorder(cell.style.borderRight, rightNeighbor?.style.borderLeft);
  const topBorder = pickWinningBorder(cell.style.borderTop, topNeighbor?.style.borderBottom);
  const bottomBorder = pickWinningBorder(cell.style.borderBottom, bottomNeighbor?.style.borderTop);

  if (hasTopEdge && topBorder && shouldDrawCurrentBorder(cell.style.borderTop, topNeighbor?.style.borderBottom, false)) {
    graphics.push(...renderBorderLine(cellX, cellY + visibleHeight, cellX + cellWidth, cellY + visibleHeight, topBorder));
  }
  if (hasBottomEdge && bottomBorder && shouldDrawCurrentBorder(cell.style.borderBottom, bottomNeighbor?.style.borderTop, true)) {
    graphics.push(...renderBorderLine(cellX, cellY, cellX + cellWidth, cellY, bottomBorder));
  }
  if (leftBorder && shouldDrawCurrentBorder(cell.style.borderLeft, leftNeighbor?.style.borderRight, false)) {
    graphics.push(...renderBorderLine(cellX, cellY, cellX, cellY + visibleHeight, leftBorder));
  }
  if (rightBorder && shouldDrawCurrentBorder(cell.style.borderRight, rightNeighbor?.style.borderLeft, true)) {
    graphics.push(...renderBorderLine(cellX + cellWidth, cellY, cellX + cellWidth, cellY + visibleHeight, rightBorder));
  }

  graphics.push(...buildCellGraphicsForSlice(cell, visibleSliceStart, visibleSliceHeight, cellX, cellY));

  return {
    graphics,
    texts: buildCellTextsForSlice(cell, visibleSliceStart, visibleSliceHeight, cellX, cellY),
  };
}

function renderPreparedTableLocally(table: PreparedTableLayout): PreparedNodeContent {
  const texts: PreparedTextPlacement[] = [];
  const graphics: PreparedGraphicPlacement[] = [];
  const pageY = 0;
  const renderedCells = new Set<PreparedTableCell>();

  table.logicalRows.forEach((row, rowIndex) => {
    const fragmentTop = table.rowTops[rowIndex] as number;
    const fragmentHeight = row.height;
    row.cells.forEach((cell) => {
      if (renderedCells.has(cell)) {
        return;
      }
      renderedCells.add(cell);
      const rendered = renderCellFragment(cell, table.logicalRows, fragmentTop, fragmentHeight, 0, pageY, table.columns, table.cellMap);
      rendered.texts.forEach((text) => {
        texts.push({
          ascent: text.fontSize * 0.8,
          direction: text.direction ?? "auto",
          font: text.font ?? DEFAULT_FONT,
          fontSize: text.fontSize,
          height: text.fontSize * DEFAULT_LINE_HEIGHT,
          spaceCount: text.spaceCount,
          top: fragmentTop + (pageY + fragmentHeight - text.y - (text.fontSize * 0.8)),
          value: text.value,
          width: text.width ?? 0,
          wordSpacing: text.wordSpacing,
          x: text.x,
        });
      });
      rendered.graphics.forEach((graphic) => {
        let top = 0;
        let bottom = 0;
        if (graphic.type === "rect") {
          top = graphic.y;
          bottom = graphic.y + graphic.height;
        } else if (graphic.type === "line") {
          top = Math.min(graphic.y1, graphic.y2);
          bottom = Math.max(graphic.y1, graphic.y2);
        } else if (graphic.type === "image" || graphic.type === "svg") {
          top = graphic.y;
          bottom = graphic.y + graphic.height;
        } else {
          top = 0;
          bottom = table.height;
        }
        graphics.push({ bottom, graphic, top });
      });
    });
  });

  return { graphics, height: table.height, texts };
}

function paginatePreparedTable(
  table: PreparedTableLayout,
  firstAvailableHeight: number,
  fullAvailableHeight: number,
  tableTop: number,
): Phase5TablePaginationResult {
  const headerHeight = table.headerRows.reduce((sum, row) => sum + row.height, 0);
  const footerHeight = table.footerRows.reduce((sum, row) => sum + row.height, 0);
  const fragments: TablePageRenderResult[] = [];
  const fullPageBodyCapacity = fullAvailableHeight - headerHeight;
  const pageMetrics = {
    firstAvailableHeight,
    fullAvailableHeight,
    fullPageBodyCapacity,
    headerHeight,
    tableTop,
  };
  if (table.headerRows.length > 0 && fullPageBodyCapacity <= 0) {
    throw layoutError(
      `Repeated table header for ${table.id} consumes all available page height.`,
      `${table.id}.header`,
      {
        offendingPath: `${table.id}.header`,
        pageMetrics,
        rowGroup: "header",
        tableId: table.id,
      },
    );
  }
  if (footerHeight > Math.max(0, fullPageBodyCapacity)) {
    throw layoutError(
      `Table footer for ${table.id} cannot fit with the repeated table header on a full page.`,
      `${table.id}.footer`,
      {
        footerHeight,
        footerRowCount: table.footerRows.length,
        offendingPath: `${table.id}.footer`,
        pageMetrics,
        rowGroup: "footer",
        tableId: table.id,
      },
    );
  }
  if (table.bodyRows.length === 0) {
    if (table.footerRows.length === 0) {
      const rendered = renderTablePageFragment(table, [], 0, tableTop, fullAvailableHeight);
      return {
        consumedHeight: rendered.consumedHeight,
        fragments: [{
          ...rendered,
          analysis: {
            bodyRowIndices: [],
            headerRowCount: table.headerRows.length,
            pageIndex: 0,
            rowFragments: [],
            tableId: table.id,
            tableTop,
          },
        }],
      };
    }
    const footerFragments = table.footerRows.map((row, footerRowIndex) => ({
      height: row.height,
      logicalRowIndex: table.headerRows.length + footerRowIndex,
      rowSliceStart: 0,
    }));
    const fitsOnFirstPage = headerHeight + footerHeight <= firstAvailableHeight;
    const pageIndex = fitsOnFirstPage ? 0 : 1;
    const rendered = renderTablePageFragment(
      table,
      footerFragments,
      pageIndex,
      fitsOnFirstPage ? tableTop : 0,
      fullAvailableHeight,
    );
    if (!fitsOnFirstPage) {
      fragments.push({
        analysis: {
          bodyRowIndices: [],
          headerRowCount: 0,
          pageIndex: 0,
          rowFragments: [],
          tableId: table.id,
          tableTop,
        },
        consumedHeight: 0,
        graphics: [],
        texts: [],
      });
    }
    fragments.push({
      ...rendered,
      analysis: {
        bodyRowIndices: [],
        headerRowCount: table.headerRows.length,
        pageIndex,
        rowFragments: [],
        tableId: table.id,
        tableTop: fitsOnFirstPage ? tableTop : 0,
      },
    });
    return {
      consumedHeight: rendered.consumedHeight,
      fragments,
    };
  }
  const firstImpossibleKeepTogether = table.bodyRows.find((row) => row.keepTogether && row.height > Math.max(1, fullPageBodyCapacity));
  if (firstImpossibleKeepTogether) {
    throw layoutError(
      `keepTogether body row ${firstImpossibleKeepTogether.index} in ${table.id} cannot fit with the repeated table header.`,
      `${table.id}.body[${firstImpossibleKeepTogether.index - table.headerRows.length}]`,
      {
        offendingPath: `${table.id}.body[${firstImpossibleKeepTogether.index - table.headerRows.length}]`,
        pageMetrics,
        rowGroup: "body",
        rowIndex: firstImpossibleKeepTogether.index - table.headerRows.length,
        tableId: table.id,
      },
    );
  }
  let bodyIndex = 0;
  let rowSliceStart = 0;
  let pageIndex = 0;
  let currentAvailable = firstAvailableHeight;
  let footerRendered = table.footerRows.length === 0;

  while (bodyIndex < table.bodyRows.length || !footerRendered) {
    const previousBodyIndex = bodyIndex;
    const previousRowSliceStart = rowSliceStart;
    const rowFragments: TableRowFragment[] = [];
    const bodyRowIndices: number[] = [];
    let remaining = pageIndex === 0 ? currentAvailable : fullAvailableHeight;
    const pageHeaderHeight = pageIndex > 0 ? headerHeight : table.headerRows.length > 0 ? headerHeight : 0;
    const pageBodyCapacity = Math.max(1, fullAvailableHeight - pageHeaderHeight);
    remaining -= pageHeaderHeight;
    if (remaining <= 0) {
      if (pageIndex > 0) {
        throw layoutError(
          `Table ${table.id} could not make progress because the repeated header leaves no body space.`,
          `${table.id}.header`,
          {
            offendingPath: `${table.id}.header`,
            pageIndex,
            pageMetrics,
            rowGroup: "header",
            tableId: table.id,
          },
        );
      }
      fragments.push({
        analysis: {
          bodyRowIndices: [],
          headerRowCount: table.headerRows.length,
          pageIndex,
          rowFragments: [],
          tableId: table.id,
          tableTop: pageIndex === 0 ? tableTop : 0,
        },
        consumedHeight: pageHeaderHeight,
        graphics: [],
        texts: [],
      });
      pageIndex += 1;
      continue;
    }

    while (bodyIndex < table.bodyRows.length) {
      const row = table.bodyRows[bodyIndex] as PreparedTableRow;
      const unslicedHeight = row.height - rowSliceStart;
      if (unslicedHeight <= remaining) {
        rowFragments.push({ height: unslicedHeight, logicalRowIndex: table.headerRows.length + bodyIndex, rowSliceStart });
        bodyRowIndices.push(bodyIndex);
        remaining -= unslicedHeight;
        bodyIndex += 1;
        rowSliceStart = 0;
        continue;
      }

      if (rowSliceStart === 0 && row.height <= pageBodyCapacity) {
        break;
      }

      if (row.height > pageBodyCapacity) {
        const fragmentHeight = Math.max(remaining, Math.min(row.height - rowSliceStart, pageBodyCapacity));
        rowFragments.push({ height: fragmentHeight, logicalRowIndex: table.headerRows.length + bodyIndex, rowSliceStart });
        bodyRowIndices.push(bodyIndex);
        rowSliceStart += fragmentHeight;
        if (rowSliceStart >= row.height) {
          bodyIndex += 1;
          rowSliceStart = 0;
        }
      } else if (row.keepTogether && rowFragments.length === 0) {
        break;
      } else if (rowFragments.length === 0) {
        break;
      }
      break;
    }

    if (bodyIndex >= table.bodyRows.length && !footerRendered && footerHeight <= remaining) {
      table.footerRows.forEach((row, footerRowIndex) => {
        rowFragments.push({
          height: row.height,
          logicalRowIndex: table.headerRows.length + table.bodyRows.length + footerRowIndex,
          rowSliceStart: 0,
        });
      });
      remaining -= footerHeight;
      footerRendered = true;
    }

    if (rowFragments.length === 0 && bodyIndex < table.bodyRows.length) {
      if (pageIndex > 0 || (bodyIndex === previousBodyIndex && rowSliceStart === previousRowSliceStart && currentAvailable === fullAvailableHeight)) {
        throw layoutError(
          `Table ${table.id} pagination could not advance body rows.`,
          `${table.id}.body[${bodyIndex}]`,
          {
            bodyIndex,
            offendingPath: `${table.id}.body[${bodyIndex}]`,
            pageIndex,
            pageMetrics,
            rowGroup: "body",
            rowSliceStart,
            tableId: table.id,
          },
        );
      }
      fragments.push({
        analysis: {
          bodyRowIndices: [],
          headerRowCount: 0,
          pageIndex,
          rowFragments: [],
          tableId: table.id,
          tableTop: pageIndex === 0 ? tableTop : 0,
        },
        consumedHeight: 0,
        graphics: [],
        texts: [],
      });
      pageIndex += 1;
      currentAvailable = fullAvailableHeight;
      continue;
    }

    const rendered = renderTablePageFragment(table, rowFragments, pageIndex, pageIndex === 0 ? tableTop : 0, fullAvailableHeight);
    fragments.push({
      ...rendered,
      analysis: {
        bodyRowIndices,
        headerRowCount: table.headerRows.length,
        pageIndex,
        rowFragments: rowFragments
          .filter((fragment) =>
            fragment.logicalRowIndex >= table.headerRows.length &&
            fragment.logicalRowIndex < table.headerRows.length + table.bodyRows.length
          )
          .map((fragment) => ({
            bodyRowIndex: fragment.logicalRowIndex - table.headerRows.length,
            height: fragment.height,
            rowSliceStart: fragment.rowSliceStart,
          })),
        tableId: table.id,
        tableTop: pageIndex === 0 ? tableTop : 0,
      },
    });

    pageIndex += 1;
    currentAvailable = fullAvailableHeight;
  }

  const consumedHeight = fragments.length === 0 ? 0 : fragments[0].consumedHeight;
  return { consumedHeight, fragments };
}

function renderTablePageFragment(
  table: PreparedTableLayout,
  rowFragments: TableRowFragment[],
  pageIndex: number,
  tableTop: number,
  availableHeight: number,
): Omit<TablePageRenderResult, "analysis"> {
  const texts: DetailedRenderedText[] = [];
  const graphics: PdfGraphic[] = [];
  const pageX = table.style.marginLeft;
  let consumedHeight = 0;

  const pushRenderedRows = (rows: PreparedTableRow[], fragments: TableRowFragment[]): void => {
    if (fragments.length === 0) {
      return;
    }

    const fragmentTop = rowTop(rows, fragments[0]!.logicalRowIndex) + fragments[0]!.rowSliceStart;
    const fragmentHeight = fragments.reduce((sum, fragment) => sum + fragment.height, 0);
    // Convert the top-down cursor to bottom-up PDF content-area coordinates.
    // renderCellFragment expects pageY as the bottom of the visible fragment block.
    const cellPageY = availableHeight - tableTop - consumedHeight - fragmentHeight;
    const visibleCells = new Set<PreparedTableCell>();
    fragments.forEach((fragment) => {
      for (let columnIndex = 0; columnIndex < table.columns.length; columnIndex += 1) {
        const cell = table.cellMap.get(`${fragment.logicalRowIndex}:${columnIndex}`);
        if (cell) {
          visibleCells.add(cell);
        }
      }
    });

    [...visibleCells]
      .sort((left, right) => left.rowIndex - right.rowIndex || left.colStart - right.colStart)
      .forEach((cell) => {
        const rendered = renderCellFragment(
          cell,
          rows,
          fragmentTop,
          fragmentHeight,
          pageX,
          cellPageY,
          table.columns,
          table.cellMap,
        );
        graphics.push(...rendered.graphics);
        texts.push(...rendered.texts);
      });
    consumedHeight += fragmentHeight;
  };

  if (table.headerRows.length > 0) {
    const headerFragments = table.headerRows.map((row, logicalRowIndex) => ({
      height: row.height,
      logicalRowIndex,
      rowSliceStart: 0,
    }));
    pushRenderedRows(table.logicalRows, headerFragments);
  }

  pushRenderedRows(table.logicalRows, rowFragments);
  return { consumedHeight, graphics, texts };
}

function buildTextPagesForPhase5(document: Phase5DocumentAnalysis): PdfRenderedPage[] {
  return document.pages;
}

function buildLineRect(
  x: number,
  y: number,
  width: number,
  ascent: number,
  lineHeight: number,
): [number, number, number, number] {
  const safeWidth = Math.max(0, width);
  const safeAscent = Math.max(0, ascent);
  const safeLineHeight = Math.max(safeAscent, lineHeight);
  return [x, y - (safeLineHeight - safeAscent), x + safeWidth, y + safeAscent];
}

function buildDetailedAnalysis(
  document: Phase5DocumentAnalysis,
  containerAnchors: Phase3AnchorPlacement[],
): Phase5DetailedDocumentAnalysis {
  const anchors: Phase3AnchorPlacement[] = [...containerAnchors];
  const linePlacements: Phase3LinePlacement[] = [];
  const seenAnchorIds = new Set(anchors.map((anchor) => anchor.id));

  document.pages.forEach((page, pageIndex) => {
    (page.texts as DetailedRenderedText[]).forEach((text) => {
      if (!text.kind) {
        return;
      }
      const width = (text.width ?? 0) + ((text.wordSpacing ?? 0) * (text.spaceCount ?? 0));
      const ascent = text.ascent ?? (text.fontSize * 0.8);
      const lineHeight = text.lineHeight ?? (text.fontSize * DEFAULT_LINE_HEIGHT);
      const rect = buildLineRect(text.x, text.y, width, ascent, lineHeight);
      linePlacements.push({
        blockId: text.blockId,
        kind: text.kind,
        level: text.level,
        link: text.link,
        pageIndex,
        rect,
        text: text.value,
      });
      if (text.blockId && !seenAnchorIds.has(text.blockId)) {
        anchors.push({
          id: text.blockId,
          kind: text.kind === "preformatted" ? "paragraph" : text.kind,
          level: text.level,
          pageIndex,
          rect: buildLineRect(text.x, text.y, Math.max(width, 1), ascent, lineHeight),
          title: text.value,
        });
        seenAnchorIds.add(text.blockId);
      }
    });
  });

  return {
    ...document,
    anchors,
    linePlacements,
  };
}

interface Phase5PaginationOptions {
  allowBalancedTableSplits?: boolean;
}

function balancedTableFirstAvailableHeight(
  table: PreparedTableLayout,
  cursorY: number,
  availableHeight: number,
): number | undefined {
  if (table.bodyRows.length < 4) {
    return undefined;
  }
  const headerHeight = table.headerRows.reduce((sum, row) => sum + row.height, 0);
  const footerHeight = table.footerRows.reduce((sum, row) => sum + row.height, 0);
  const actualAvailable = availableHeight - cursorY;
  let best: {
    firstHeight: number;
    imbalance: number;
    minimumUsage: number;
  } | undefined;

  for (let splitIndex = 2; splitIndex <= table.bodyRows.length - 2; splitIndex += 1) {
    const firstHeight = headerHeight + table.bodyRows
      .slice(0, splitIndex)
      .reduce((sum, row) => sum + row.height, 0);
    const secondHeight = headerHeight + footerHeight + table.bodyRows
      .slice(splitIndex)
      .reduce((sum, row) => sum + row.height, 0);
    if (firstHeight > actualAvailable || secondHeight > availableHeight) {
      continue;
    }
    const firstUsage = (cursorY + firstHeight) / availableHeight;
    const secondUsage = secondHeight / availableHeight;
    const candidate = {
      firstHeight,
      imbalance: Math.abs(firstUsage - secondUsage),
      minimumUsage: Math.min(firstUsage, secondUsage),
    };
    if (
      !best
      || candidate.minimumUsage > best.minimumUsage + 1e-9
      || (
        Math.abs(candidate.minimumUsage - best.minimumUsage) <= 1e-9
        && candidate.imbalance < best.imbalance
      )
    ) {
      best = candidate;
    }
  }

  return best ? best.firstHeight + 1e-6 : undefined;
}

async function paginatePhase5Document(
  document: PdfDocumentPhase3,
  normalized: ReturnType<typeof normalizePhase5Document>,
  options: Phase5PaginationOptions = {},
): Promise<Phase5DetailedDocumentAnalysis> {
  const fonts = await preparePhase5Fonts(document);
  const availableWidth = normalized.page.width - normalized.page.margins.left - normalized.page.margins.right;
  const availableHeight = normalized.page.height - normalized.page.margins.top - normalized.page.margins.bottom;
  const pages: PdfRenderedPage[] = [];
  const tables: Phase5DocumentAnalysis["tables"] = [];
  const containerAnchors: Phase3AnchorPlacement[] = [];
  let currentPage: PdfRenderedPage = { graphics: [], height: normalized.page.height, texts: [], width: normalized.page.width };
  let cursorY = 0;
  let tableCounter = 1;
  let immediatelyPrecedingHeading: {
    cursorBefore: number;
    cursorAfter: number;
    page: PdfRenderedPage;
    textStart: number;
  } | undefined;

  const pushPage = (): void => {
    pages.push(currentPage);
    currentPage = { graphics: [], height: normalized.page.height, texts: [], width: normalized.page.width };
    cursorY = 0;
  };

  const children = (document.children ?? document.content ?? []) as PdfDocumentLayoutNode[];
  const nestedCounter = { value: 1 };

  for (const node of children) {
    const precedingHeading = immediatelyPrecedingHeading;
    immediatelyPrecedingHeading = undefined;

    if (node.type === "page-break") {
      if (currentPage.texts.length > 0 || (currentPage.graphics?.length ?? 0) > 0) {
        pushPage();
      }
      continue;
    }

    if (node.type === "divider") {
      const divider = resolveDividerLayout(node, availableWidth);
      const requiredHeight = divider.marginTop + divider.boxHeight + divider.marginBottom;

      if (cursorY > 0 && cursorY + requiredHeight > availableHeight) {
        pushPage();
      }

      const startY = cursorY + divider.marginTop;
      const y = normalized.page.height
        - normalized.page.margins.top
        - startY
        - (divider.strokeWidth / 2);
      const x = normalized.page.margins.left + divider.marginLeft;
      currentPage.graphics?.push({
        type: "line",
        x1: x,
        x2: x + divider.width,
        y1: y,
        y2: y,
        stroke: {
          color: DEFAULT_DIVIDER_COLOR,
          width: divider.strokeWidth,
        },
      });
      cursorY = startY + divider.boxHeight + divider.marginBottom;
      continue;
    }

    if (isTableNode(node)) {
      if (cursorY > 0 && availableHeight - cursorY <= 0) {
        pushPage();
      }
      const table = await prepareTableLayout(node, availableWidth, fonts, nestedCounter, `T${tableCounter}`);
      const fitsOnFreshPage = table.height <= availableHeight;
      const wouldSplitOnCurrentPage = cursorY > 0 && table.height > availableHeight - cursorY;
      const balancedFirstAvailableHeight = (
        options.allowBalancedTableSplits
        && fitsOnFreshPage
        && wouldSplitOnCurrentPage
      )
        ? balancedTableFirstAvailableHeight(table, cursorY, availableHeight)
        : undefined;
      let adjacentHeadingFits = false;
      let adjacentHeadingPageIndex: number | undefined;
      if (
        fitsOnFreshPage
        && wouldSplitOnCurrentPage
        && balancedFirstAvailableHeight === undefined
      ) {
        const headingHeight = precedingHeading
          ? precedingHeading.cursorAfter - precedingHeading.cursorBefore
          : 0;
        const canKeepPrecedingHeading = precedingHeading?.page === currentPage &&
          headingHeight + table.height <= availableHeight;
        adjacentHeadingFits = canKeepPrecedingHeading === true;

        if (canKeepPrecedingHeading && precedingHeading) {
          const movedHeadingTexts = currentPage.texts.splice(precedingHeading.textStart);
          pushPage();
          currentPage.texts.push(...relocateAdjacentHeadingTexts(
            movedHeadingTexts,
            precedingHeading.cursorBefore,
          ));
          adjacentHeadingPageIndex = pages.length;
          cursorY = headingHeight;
        } else {
          pushPage();
        }
      }
      const tableStartY = cursorY;
      const tablePageStartIndex = pages.length;
      const pagination = paginatePreparedTable(
        table,
        balancedFirstAvailableHeight ?? (availableHeight - tableStartY),
        availableHeight,
        tableStartY,
      );
      pagination.fragments.forEach((fragment, fragmentIndex) => {
        if (fragmentIndex > 0) {
          pushPage();
        }
        currentPage.graphics?.push(
          ...fragment.graphics.map((graphic) => {
            const translated = structuredClone(graphic) as PdfGraphic;
            if (translated.type === "rect") {
              translated.x += normalized.page.margins.left;
              translated.y += normalized.page.margins.bottom;
            } else if (translated.type === "line") {
              translated.x1 += normalized.page.margins.left;
              translated.x2 += normalized.page.margins.left;
              translated.y1 += normalized.page.margins.bottom;
              translated.y2 += normalized.page.margins.bottom;
            } else if (translated.type === "image" || translated.type === "svg") {
              translated.x += normalized.page.margins.left;
              translated.y += normalized.page.margins.bottom;
            } else if (translated.type === "path") {
              translated.x = (translated.x ?? 0) + normalized.page.margins.left;
              translated.y = (translated.y ?? 0) + normalized.page.margins.bottom;
            }
            return translated;
          }),
        );
        currentPage.texts.push(
          ...fragment.texts.map((text) => ({
            ...text,
            x: text.x + normalized.page.margins.left,
            y: text.y + normalized.page.margins.bottom,
          })),
        );
        cursorY = (fragmentIndex === 0 ? tableStartY : 0) + fragment.consumedHeight;
      });
      const documentRelativeFragments = pagination.fragments.map((fragment) => ({
        ...fragment.analysis,
        pageIndex: tablePageStartIndex + fragment.analysis.pageIndex,
      }));
      assertTablePaginationQualityGate({
        adjacentHeadingFits,
        adjacentHeadingPageIndex,
        balancedSplitAllowed: balancedFirstAvailableHeight !== undefined,
        documentPageStartIndex: tablePageStartIndex,
        firstFragmentTableTop: documentRelativeFragments[0]?.tableTop,
        fitsOnFreshPage,
        fragmentPageIndices: documentRelativeFragments.map((fragment) => fragment.pageIndex),
        wouldSplitOnCurrentPage,
      });
      tables.push({
        columnWidths: table.columns,
        fragments: documentRelativeFragments,
        id: table.id,
        totalBodyRows: table.bodyRows.length,
      });
      tableCounter += 1;
      continue;
    }

    if (isContainerNode(node)) {
      const container = await layoutContainerNode(node, availableWidth, fonts);
      if (cursorY > 0 && cursorY + container.height > availableHeight) {
        pushPage();
      }
      const startY = cursorY + container.marginTop;
      if (node.id) {
        const topEdge = normalized.page.height - normalized.page.margins.top - startY;
        const bottomEdge = topEdge - Math.max(1, container.boxHeight);
        containerAnchors.push({
          id: node.id,
          kind: "container",
          pageIndex: pages.length,
          rect: [
            normalized.page.margins.left + container.marginLeft,
            bottomEdge,
            normalized.page.margins.left + container.marginLeft + Math.max(1, container.width),
            topEdge,
          ],
        });
      }
      currentPage.texts.push(
        ...container.texts.map((text) => ({
          ascent: text.ascent,
          blockId: text.id,
          direction: text.direction,
          font: text.font,
          fontSize: text.fontSize,
          kind: text.kind,
          level: text.level,
          lineHeight: text.fontSize * DEFAULT_LINE_HEIGHT,
          link: text.link,
          spaceCount: text.spaceCount,
          value: text.value,
          width: text.width,
          wordSpacing: text.wordSpacing,
          x: normalized.page.margins.left + container.marginLeft + text.x,
          y: normalized.page.height - normalized.page.margins.top - (startY + text.top) - text.ascent,
        })),
      );
      cursorY = startY + container.height;
      continue;
    }

    const textNode = node as PdfPhase3HeadingNode | PdfPhase3ParagraphNode;
    const block = await layoutTopLevelTextNode(textNode, availableWidth, fonts);
    let headingGroup = precedingHeading;
    if (cursorY > 0 && cursorY + block.height > availableHeight) {
      const headingHeight = precedingHeading
        ? precedingHeading.cursorAfter - precedingHeading.cursorBefore
        : 0;
      const canKeepPrecedingHeadings = precedingHeading?.page === currentPage
        && headingHeight + block.height <= availableHeight;
      if (canKeepPrecedingHeadings && precedingHeading) {
        const movedHeadingTexts = currentPage.texts.splice(precedingHeading.textStart);
        pushPage();
        currentPage.texts.push(...relocateAdjacentHeadingTexts(
          movedHeadingTexts,
          precedingHeading.cursorBefore,
        ));
        cursorY = headingHeight;
        headingGroup = {
          cursorAfter: headingHeight,
          cursorBefore: 0,
          page: currentPage,
          textStart: 0,
        };
      } else {
        pushPage();
        headingGroup = undefined;
      }
    }
    const cursorBefore = cursorY;
    const textStart = currentPage.texts.length;
    const startY = cursorY + block.marginTop + block.paddingTop;
    currentPage.texts.push(
      ...block.lines.map((line, lineIndex) => ({
        ascent: line.ascent,
        blockId: textNode.id,
        direction: line.direction,
        font: line.font,
        fontSize: line.fontSize,
        kind: textNode.type,
        level: textNode.type === "heading" ? textNode.level : undefined,
        lineHeight: line.height,
        link: textNode.link,
        spaceCount: line.spaceCount,
        value: line.text,
        width: line.width,
        wordSpacing: line.wordSpacing,
        x: normalized.page.margins.left + block.marginLeft + line.x,
        y: normalized.page.height - normalized.page.margins.top - (startY + (lineIndex * line.height)) - line.ascent,
      })),
    );
    cursorY += block.height;
    if (textNode.type === "heading") {
      immediatelyPrecedingHeading = {
        cursorAfter: cursorY,
        cursorBefore: headingGroup?.page === currentPage
          ? headingGroup.cursorBefore
          : cursorBefore,
        page: currentPage,
        textStart: headingGroup?.page === currentPage
          ? headingGroup.textStart
          : textStart,
      };
    }
  }

  pages.push(currentPage);

  return buildDetailedAnalysis({
    meta: normalized.meta,
    page: normalized.page,
    pages: buildTextPagesForPhase5({ meta: normalized.meta, page: normalized.page, pages, tables }),
    tables,
  }, containerAnchors);
}

export async function analyzePhase5Document(document: PdfDocumentPhase3): Promise<Phase5DocumentAnalysis> {
  return analyzePhase5DocumentDetailed(document);
}

function graphicBottom(graphic: PdfGraphic): number | undefined {
  if (graphic.type === "rect" || graphic.type === "image" || graphic.type === "svg") return graphic.y;
  if (graphic.type === "line") return Math.min(graphic.y1, graphic.y2);
  if (graphic.type === "path") return graphic.y;
  return undefined;
}

export function terminalPageUsage(analysis: Phase5DocumentAnalysis): number {
  return pageUsage(analysis, analysis.pages.length - 1);
}

export function pageUsage(
  analysis: Phase5DocumentAnalysis,
  pageIndex: number,
): number {
  const page = analysis.pages[pageIndex];
  if (!page) return 0;
  const contentTop = analysis.page.height - analysis.page.margins.top;
  const contentBottom = analysis.page.margins.bottom;
  const availableHeight = Math.max(1, contentTop - contentBottom);
  const bottoms = [
    ...page.texts.map((text) => text.y - (text.fontSize * 0.25)),
    ...(page.graphics ?? []).map(graphicBottom).filter((value): value is number => value !== undefined),
  ];
  if (bottoms.length === 0) return 0;
  return Math.min(1, Math.max(0, (contentTop - Math.min(...bottoms)) / availableHeight));
}

export function pageUsages(analysis: Phase5DocumentAnalysis): number[] {
  return analysis.pages.map((_page, pageIndex) => pageUsage(analysis, pageIndex));
}

function documentHasExplicitPageBreak(nodes: PdfDocumentLayoutNode[]): boolean {
  return nodes.some((node) => node.type === "page-break" || (
    node.type === "container" && documentHasExplicitPageBreak(node.children)
  ));
}

function scaledVerticalStyle(style: PdfPhase3Style | undefined, scale: number): PdfPhase3Style | undefined {
  if (!style) return undefined;
  const scaled = { ...style };
  for (const key of [
    "height", "minHeight", "maxHeight", "marginTop", "marginBottom",
    "paddingTop", "paddingBottom", "rowGap",
  ] as const) {
    const value = scaled[key];
    if (typeof value === "number") scaled[key] = value * scale;
  }
  if (typeof style.margin === "number") {
    scaled.marginTop = (style.marginTop ?? style.margin) * scale;
    scaled.marginBottom = (style.marginBottom ?? style.margin) * scale;
  }
  if (typeof style.padding === "number") {
    scaled.paddingTop = (style.paddingTop ?? style.padding) * scale;
    scaled.paddingBottom = (style.paddingBottom ?? style.padding) * scale;
  }
  return scaled;
}

function compactNodeForPagination(node: PdfDocumentLayoutNode, scale: number): PdfDocumentLayoutNode {
  const compacted = structuredClone(node) as PdfDocumentLayoutNode;
  if ("style" in compacted) compacted.style = scaledVerticalStyle(compacted.style, scale);
  if (compacted.type === "heading" || compacted.type === "paragraph" || compacted.type === "preformatted") {
    const authoredFontSize = compacted.fontSize ?? 12;
    const minimumFontSize = Math.min(MINIMUM_COMPACTED_FONT_SIZE, authoredFontSize);
    compacted.fontSize = Math.max(minimumFontSize, authoredFontSize * scale);
    return compacted;
  }
  if (compacted.type === "container") {
    compacted.children = compacted.children.map((child) => compactNodeForPagination(child, scale));
    return compacted;
  }
  if (compacted.type === "table") {
    const compactRows = (rows: PdfPhase5TableRow[] | undefined): PdfPhase5TableRow[] | undefined => rows?.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        children: cell.children.map((child) => compactNodeForPagination(child as PdfDocumentLayoutNode, scale) as PdfPhase5CellContentNode),
        style: cell.style ? {
          ...cell.style,
          minHeight: typeof cell.style.minHeight === "number" ? cell.style.minHeight * scale : cell.style.minHeight,
          paddingTop: (cell.style.paddingTop ?? cell.style.padding ?? DEFAULT_CELL_PADDING) * scale,
          paddingBottom: (cell.style.paddingBottom ?? cell.style.padding ?? DEFAULT_CELL_PADDING) * scale,
        } : {
          paddingTop: DEFAULT_CELL_PADDING * scale,
          paddingBottom: DEFAULT_CELL_PADDING * scale,
        },
      })),
    }));
    compacted.header = compactRows(compacted.header);
    compacted.body = compactRows(compacted.body) ?? [];
    compacted.footer = compactRows(compacted.footer);
  }
  return compacted;
}

function compactDocumentForPagination(document: PdfDocumentPhase3, scale: number): PdfDocumentPhase3 {
  const compacted = structuredClone(document) as PdfDocumentPhase3;
  if (compacted.children) compacted.children = compacted.children.map((node) => compactNodeForPagination(node, scale));
  if (compacted.content) compacted.content = compacted.content.map((node) => compactNodeForPagination(node, scale));
  return compacted;
}

function expandedVerticalStyle(
  style: PdfPhase3Style | undefined,
  scale: number,
): PdfPhase3Style | undefined {
  if (!style) return undefined;
  const expanded = { ...style };
  for (const key of [
    "gap", "marginTop", "marginBottom", "paddingTop", "paddingBottom", "rowGap",
  ] as const) {
    const value = expanded[key];
    if (typeof value === "number") expanded[key] = value * scale;
  }
  if (typeof style.margin === "number") {
    expanded.marginTop = (style.marginTop ?? style.margin) * scale;
    expanded.marginBottom = (style.marginBottom ?? style.margin) * scale;
  }
  if (typeof style.padding === "number") {
    expanded.paddingTop = (style.paddingTop ?? style.padding) * scale;
    expanded.paddingBottom = (style.paddingBottom ?? style.padding) * scale;
  }
  return expanded;
}

function expandNodeVerticalRhythm(
  node: PdfDocumentLayoutNode,
  scale: number,
): PdfDocumentLayoutNode {
  const expanded = structuredClone(node) as PdfDocumentLayoutNode;
  if ("style" in expanded) {
    expanded.style = expandedVerticalStyle(expanded.style, scale);
  }
  const expansionRatio = (scale - 1) / (SHORT_DOCUMENT_RHYTHM_SCALES.at(-1)! - 1);
  if (
    expanded.type === "paragraph"
    || expanded.type === "preformatted"
  ) {
    expanded.style = {
      ...(expanded.style ?? {}),
      marginBottom: expanded.style?.marginBottom
        ?? (expanded.style?.margin === undefined ? 4 * expansionRatio : undefined),
    };
    return expanded;
  }
  if (expanded.type === "heading") {
    expanded.style = {
      ...(expanded.style ?? {}),
      marginBottom: expanded.style?.marginBottom
        ?? (expanded.style?.margin === undefined ? 3 * expansionRatio : undefined),
      marginTop: expanded.style?.marginTop
        ?? (expanded.style?.margin === undefined ? 6 * expansionRatio : undefined),
    };
    return expanded;
  }
  if (expanded.type === "container") {
    expanded.children = expanded.children.map((child) => expandNodeVerticalRhythm(child, scale));
    return expanded;
  }
  if (expanded.type === "table") {
    const expandRows = (
      rows: PdfPhase5TableRow[] | undefined,
    ): PdfPhase5TableRow[] | undefined => rows?.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        children: cell.children.map((child) =>
          expandNodeVerticalRhythm(
            child as PdfDocumentLayoutNode,
            scale,
          ) as PdfPhase5CellContentNode
        ),
        style: {
          ...(cell.style ?? {}),
          paddingBottom:
            (cell.style?.paddingBottom ?? cell.style?.padding ?? DEFAULT_CELL_PADDING) * scale,
          paddingTop:
            (cell.style?.paddingTop ?? cell.style?.padding ?? DEFAULT_CELL_PADDING) * scale,
        },
      })),
    }));
    expanded.header = expandRows(expanded.header);
    expanded.body = expandRows(expanded.body) ?? [];
    expanded.footer = expandRows(expanded.footer);
  }
  return expanded;
}

function expandDocumentVerticalRhythm(
  document: PdfDocumentPhase3,
  scale: number,
): PdfDocumentPhase3 {
  const expanded = structuredClone(document) as PdfDocumentPhase3;
  if (expanded.children) {
    expanded.children = expanded.children.map((node) => expandNodeVerticalRhythm(node, scale));
  }
  if (expanded.content) {
    expanded.content = expanded.content.map((node) => expandNodeVerticalRhythm(node, scale));
  }
  return expanded;
}

function expandTerminalPageVerticalRhythm(
  document: PdfDocumentPhase3,
  scale: number,
): PdfDocumentPhase3 {
  const expanded = structuredClone(document) as PdfDocumentPhase3;
  const key = expanded.children ? "children" : "content";
  const children = [...(expanded[key] ?? [])] as PdfDocumentLayoutNode[];
  const pageBreakIndex = children.findIndex((node) => node.type === "page-break");
  if (pageBreakIndex < 0) return expanded;
  expanded[key] = children.map((node, index) => index > pageBreakIndex
    ? expandNodeVerticalRhythm(node, scale)
    : node);
  return expanded;
}

function withPageBreakBefore(
  document: PdfDocumentPhase3,
  index: number,
): PdfDocumentPhase3 {
  const candidate = structuredClone(document) as PdfDocumentPhase3;
  const key = candidate.children ? "children" : "content";
  const children = [...(candidate[key] ?? [])] as PdfDocumentLayoutNode[];
  children.splice(index, 0, { type: "page-break" });
  candidate[key] = children;
  return candidate;
}

function legalPageBreakIndices(document: PdfDocumentPhase3): number[] {
  const children = (document.children ?? document.content ?? []) as PdfDocumentLayoutNode[];
  const indices: number[] = [];
  for (let index = 1; index < children.length; index += 1) {
    const node = children[index];
    const previous = children[index - 1];
    if (
      !node
      || !previous
      || previous.type === "heading"
      || previous.type === "page-break"
      || node.type === "divider"
      || node.type === "page-break"
    ) {
      continue;
    }
    if (node.type === "heading" || node.type === "table" || node.type === "container") {
      indices.push(index);
    }
  }
  return indices;
}

function documentHasUnsafeBalancedTableSplit(
  nodes: PdfDocumentLayoutNode[],
): boolean {
  return nodes.some((node) => {
    if (node.type === "container") {
      return documentHasUnsafeBalancedTableSplit(node.children);
    }
    if (node.type !== "table") {
      return false;
    }
    return [node.header ?? [], node.body, node.footer ?? []]
      .flat()
      .some((row) =>
        row.keepTogether
        || row.cells.some((cell) => (cell.rowSpan ?? 1) > 1)
        || documentHasUnsafeBalancedTableSplit(
          row.cells.flatMap((cell) => cell.children) as PdfDocumentLayoutNode[],
        )
      );
  });
}

function hasLegalTableFragments(analysis: Phase5DocumentAnalysis): boolean {
  return analysis.tables.every((table) =>
    table.fragments.length <= 1
    || table.fragments.every((fragment) => new Set(fragment.bodyRowIndices).size >= 2)
  );
}

interface ShortDocumentCandidate {
  analysis: Phase5DetailedDocumentAnalysis;
  order: number;
  transformationAmount: number;
}

function candidateMetrics(candidate: ShortDocumentCandidate): {
  imbalance: number;
  minimumUsage: number;
} {
  const usages = pageUsages(candidate.analysis);
  return {
    imbalance: usages.length === 2 ? Math.abs((usages[0] ?? 0) - (usages[1] ?? 0)) : 0,
    minimumUsage: Math.min(...usages),
  };
}

function isBetterShortDocumentCandidate(
  left: ShortDocumentCandidate,
  right: ShortDocumentCandidate,
): boolean {
  const leftMetrics = candidateMetrics(left);
  const rightMetrics = candidateMetrics(right);
  if (Math.abs(leftMetrics.minimumUsage - rightMetrics.minimumUsage) > 1e-9) {
    return leftMetrics.minimumUsage > rightMetrics.minimumUsage;
  }
  if (Math.abs(leftMetrics.imbalance - rightMetrics.imbalance) > 1e-9) {
    return leftMetrics.imbalance < rightMetrics.imbalance;
  }
  if (Math.abs(left.transformationAmount - right.transformationAmount) > 1e-9) {
    return left.transformationAmount < right.transformationAmount;
  }
  return left.order < right.order;
}

function shouldApplyShortDocumentCandidate(
  initial: ShortDocumentCandidate,
  candidate: ShortDocumentCandidate,
): boolean {
  if (candidate.analysis.pages.length !== initial.analysis.pages.length) {
    return candidate.analysis.pages.length < initial.analysis.pages.length
      && candidate.analysis.pages.length === 1
      && (pageUsages(candidate.analysis)[0] ?? 0) >= SINGLE_PAGE_TARGET_USAGE;
  }
  const initialMetrics = candidateMetrics(initial);
  const candidateMetricsValue = candidateMetrics(candidate);
  if (candidate.analysis.pages.length === 1) {
    return candidateMetricsValue.minimumUsage - initialMetrics.minimumUsage
      >= MINIMUM_USAGE_IMPROVEMENT;
  }
  const usages = pageUsages(candidate.analysis);
  if (usages.some((usage) => usage < TWO_PAGE_MINIMUM_ACCEPTED_USAGE)) {
    return false;
  }
  return (
    candidateMetricsValue.minimumUsage - initialMetrics.minimumUsage
      >= MINIMUM_USAGE_IMPROVEMENT
    || initialMetrics.imbalance - candidateMetricsValue.imbalance
      >= MINIMUM_IMBALANCE_IMPROVEMENT
  );
}

async function optimizeShortDocumentComposition(
  document: PdfDocumentPhase3,
  normalized: ReturnType<typeof normalizePhase5Document>,
  initialAnalysis: Phase5DetailedDocumentAnalysis,
): Promise<Phase5DetailedDocumentAnalysis> {
  const initial: ShortDocumentCandidate = {
    analysis: initialAnalysis,
    order: 0,
    transformationAmount: 0,
  };
  const usages = pageUsages(initialAnalysis);
  const imbalance = usages.length === 2
    ? Math.abs((usages[0] ?? 0) - (usages[1] ?? 0))
    : 0;
  const needsOptimization = usages.length === 1
    ? (usages[0] ?? 0) < SINGLE_PAGE_TARGET_USAGE
    : usages.length === 2 && (
      (usages[1] ?? 0) < TWO_PAGE_TERMINAL_TARGET_USAGE
      || imbalance > TWO_PAGE_MAXIMUM_IMBALANCE
    );
  if (!needsOptimization) {
    return initialAnalysis;
  }

  const candidates: ShortDocumentCandidate[] = [initial];
  const rhythmBases: Array<{
    amount: number;
    document: PdfDocumentPhase3;
    options?: Phase5PaginationOptions;
    terminalOnly?: boolean;
  }> = [{ amount: 0, document }];
  let order = 1;
  if (
    !documentHasExplicitPageBreak(normalized.children)
    && !documentHasUnsafeBalancedTableSplit(normalized.children)
    && usages.length === 2
    && (usages[1] ?? 0) < 0.2
    && normalized.page.height >= 700
  ) {
    for (const scale of DOCUMENT_COMPACTION_SCALES) {
      const compacted = compactDocumentForPagination(document, scale);
      candidates.push({
        analysis: await paginatePhase5Document(compacted, normalizePhase5Document(compacted)),
        order: order++,
        transformationAmount: 1 + (1 - scale),
      });
    }
  }
  if (!documentHasExplicitPageBreak(normalized.children) && usages.length === 2) {
    for (const index of legalPageBreakIndices(document)) {
      const breakDocument = withPageBreakBefore(document, index);
      const analysis = await paginatePhase5Document(
        breakDocument,
        normalizePhase5Document(breakDocument),
      );
      candidates.push({
        analysis,
        order: order++,
        transformationAmount: 1,
      });
      if (analysis.pages.length === initialAnalysis.pages.length) {
        rhythmBases.push({ amount: 1, document: breakDocument, terminalOnly: true });
      }
    }
  }

  if (!documentHasUnsafeBalancedTableSplit(normalized.children)) {
    const splitAnalysis = await paginatePhase5Document(
      document,
      normalized,
      { allowBalancedTableSplits: true },
    );
    if (hasLegalTableFragments(splitAnalysis)) {
      candidates.push({
        analysis: splitAnalysis,
        order: order++,
        transformationAmount: 2,
      });
      rhythmBases.push({
        amount: 2,
        document,
        options: { allowBalancedTableSplits: true },
      });
    }
  }

  for (const base of rhythmBases) {
    const scales = base.terminalOnly ? TERMINAL_PAGE_RHYTHM_SCALES : SHORT_DOCUMENT_RHYTHM_SCALES;
    for (const scale of scales) {
      const expanded = base.terminalOnly
        ? expandTerminalPageVerticalRhythm(base.document, scale)
        : expandDocumentVerticalRhythm(base.document, scale);
      const analysis = await paginatePhase5Document(
        expanded,
        normalizePhase5Document(expanded),
        base.options,
      );
      if (base.options?.allowBalancedTableSplits && !hasLegalTableFragments(analysis)) {
        continue;
      }
      candidates.push({
        analysis,
        order: order++,
        transformationAmount: base.amount + 3 + (scale - 1),
      });
    }
  }

  const best = candidates.reduce((selected, candidate) =>
    isBetterShortDocumentCandidate(candidate, selected) ? candidate : selected
  );
  return best !== initial && shouldApplyShortDocumentCandidate(initial, best)
    ? best.analysis
    : initialAnalysis;
}

export async function analyzePhase5DocumentDetailed(document: PdfDocumentPhase3): Promise<Phase5DetailedDocumentAnalysis> {
  const normalized = normalizePhase5Document(document);
  const initial = await paginatePhase5Document(document, normalized);
  if (initial.pages.length <= 2) {
    return optimizeShortDocumentComposition(document, normalized, initial);
  }
  const initialMinimumUsage = Math.min(...pageUsages(initial));
  if (initialMinimumUsage >= TERMINAL_PAGE_MINIMUM_USAGE) return initial;

  if (documentHasExplicitPageBreak(normalized.children)) {
    let best = initial;
    let bestMinimumUsage = initialMinimumUsage;
    for (const index of legalPageBreakIndices(document)) {
      const candidateDocument = withPageBreakBefore(document, index);
      const candidate = await paginatePhase5Document(
        candidateDocument,
        normalizePhase5Document(candidateDocument),
      );
      const candidateMinimumUsage = Math.min(...pageUsages(candidate));
      if (
        candidate.pages.length === initial.pages.length
        && candidateMinimumUsage > bestMinimumUsage
      ) {
        best = candidate;
        bestMinimumUsage = candidateMinimumUsage;
      }
    }
    return bestMinimumUsage - initialMinimumUsage >= MINIMUM_USAGE_IMPROVEMENT
      ? best
      : initial;
  }

  if (
    initial.pages.length > 2
    && !documentHasUnsafeBalancedTableSplit(normalized.children)
  ) {
    const balanced = await paginatePhase5Document(
      document,
      normalized,
      { allowBalancedTableSplits: true },
    );
    const minimumUsageImprovement = Math.min(...pageUsages(balanced)) - Math.min(...pageUsages(initial));
    if (hasLegalTableFragments(balanced) && (
      balanced.pages.length < initial.pages.length
      || (
        balanced.pages.length === initial.pages.length
        && minimumUsageImprovement >= MINIMUM_USAGE_IMPROVEMENT
      )
    )) {
      return balanced;
    }
  }

  for (const scale of DOCUMENT_COMPACTION_SCALES) {
    const compacted = compactDocumentForPagination(document, scale);
    const compactedNormalized = normalizePhase5Document(compacted);
    const candidate = await paginatePhase5Document(compacted, compactedNormalized);
    if (candidate.pages.length < initial.pages.length) return candidate;
    if (
      initial.pages.length > 2
      && !documentHasUnsafeBalancedTableSplit(compactedNormalized.children)
    ) {
      const balanced = await paginatePhase5Document(
        compacted,
        compactedNormalized,
        { allowBalancedTableSplits: true },
      );
      const minimumUsageImprovement = Math.min(...pageUsages(balanced)) - Math.min(...pageUsages(initial));
      if (hasLegalTableFragments(balanced) && (
        balanced.pages.length < initial.pages.length
        || (
          balanced.pages.length === initial.pages.length
          && minimumUsageImprovement >= MINIMUM_USAGE_IMPROVEMENT
        )
      )) {
        return balanced;
      }
    }
  }
  return initial;
}
