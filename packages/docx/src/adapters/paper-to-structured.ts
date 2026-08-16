/**
 * PaperDocument → StructuredDocument Adapter
 *
 * Converts PaperDocument (the PPTX-oriented input format from @runstamp/pptx)
 * into StructuredDocument consumed by the DOCX serializer.
 *
 * Eliminates the React → DOM → Puppeteer pipeline:
 *   Before: PaperDocument → React → DOM → Puppeteer → StructuredDocument → DOCX
 *   After:  PaperDocument → paperToStructured() → StructuredDocument → DOCX
 *
 * No React. No DOM. No Puppeteer. No browser.
 */

import type {
  StructuredDocument,
  StructuredPage,
  StructuredElement,
  HeadingElement,
  ParagraphElement,
  TableElement,
  ImageElement,
  ChartElement,
  ShapeElement,
  ContainerElement,
  TextRun,
  TableRow,
  TableCell,
  TableColumn,
  CellReference,
  CellStyle,
  ComputedStyle,
  BoundingBox,
  PageDimensions,
  DocumentMetadata,
  AssetRegistry,
  StyleDefinitions,
  ExtractionStats,
  ElementType,
  SectionBreak,
  ChartType,
} from '../types.js';

import type {
  PaperDocumentInput,
  PaperNodeInput,
  PaperTextNode,
  PaperViewNode,
  PaperImageNode,
  PaperTableNode,
  PaperChartNode,
  PaperGroupNode,
  FlexStyleInput,
  TextStyleInput,
  ColorModifierInput,
  ParagraphInput,
  TextRunInput,
} from './paper-types.js';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_FONT = 'Calibri';
const DEFAULT_FONT_SIZE = 11;
const DEFAULT_COLOR = '#000000';
const DEFAULT_PAGE_WIDTH = 595;   // A4 at 72 DPI
const DEFAULT_PAGE_HEIGHT = 842;
const DEFAULT_MARGINS = { top: 72, right: 72, bottom: 72, left: 72 };

// =============================================================================
// COUNTER
// =============================================================================

let elementCounter = 0;

function nextId(): string {
  return `paper-el-${++elementCounter}`;
}

// =============================================================================
// MAIN CONVERSION
// =============================================================================

/**
 * Convert a PaperDocument to StructuredDocument.
 */
export function paperToStructured(doc: PaperDocumentInput): StructuredDocument {
  elementCounter = 0;
  // lint-allow-nondeterministic: perf timer only; value surfaces in stats, not output bytes
  const startTime = Date.now();
  const warnings: string[] = [];

  const dimensions = slideSizeToPageDimensions(doc.slideSize);
  const headingFont = doc.theme?.fonts?.heading ?? DEFAULT_FONT;
  const bodyFont = doc.theme?.fonts?.body ?? DEFAULT_FONT;

  const stats: ExtractionStats = {
    pageCount: doc.slides.length,
    elementCount: 0,
    elementsByType: {} as Record<ElementType, number>,
    imageCount: 0,
    tableCount: 0,
    chartCount: 0,
    extractionTimeMs: 0,
  };

  const assets = createEmptyAssets();
  const contentWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;

  const pages: StructuredPage[] = doc.slides.map((slide, index) => {
    const elements = slide.children.flatMap(child =>
      convertNode(child, bodyFont, headingFont, contentWidth, stats, warnings, doc, assets)
    );

    const page: StructuredPage = {
      pageNumber: index + 1,
      dimensions,
      elements,
    };

    // Add section breaks between slides (not before first)
    if (index > 0) {
      page.sectionBreak = { type: 'nextPage' } satisfies SectionBreak;
    }

    return page;
  });

  // lint-allow-nondeterministic: perf timer diff
  stats.extractionTimeMs = Date.now() - startTime;

  return {
    __kind: 'StructuredDocument',
    metadata: convertMetadata(doc),
    pages,
    styles: createEmptyStyles(),
    assets,
    stats,
    warnings,
  };
}

// =============================================================================
// NODE CONVERSION (DISPATCHER)
// =============================================================================

function convertNode(
  node: PaperNodeInput,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  warnings: string[],
  doc: PaperDocumentInput,
  assets: AssetRegistry,
): StructuredElement[] {
  stats.elementCount++;
  const type = nodeTypeToElementType(node.type);
  if (type) {
    stats.elementsByType[type] = (stats.elementsByType[type] ?? 0) + 1;
  }

  switch (node.type) {
    case 'Text':
      return [convertText(node, bodyFont, headingFont, doc)];
    case 'View':
      return [convertView(node, bodyFont, headingFont, pageWidth, stats, warnings, doc, assets)];
    case 'Image': {
      stats.imageCount++;
      return [convertImage(node, assets)];
    }
    case 'Table': {
      stats.tableCount++;
      return [convertTable(node, bodyFont, pageWidth, doc)];
    }
    case 'Chart': {
      stats.chartCount++;
      return [convertChart(node)];
    }
    case 'Group':
      return [convertGroup(node, bodyFont, headingFont, pageWidth, stats, warnings, doc, assets)];
    case 'Connector':
      warnings.push('Connector elements are not supported in DOCX output and will be skipped.');
      return [];
    case 'Video':
      warnings.push('Video elements are not supported in DOCX output and will be skipped.');
      return [];
    case 'Audio':
      warnings.push('Audio elements are not supported in DOCX output and will be skipped.');
      return [];
    default:
      return [];
  }
}

function nodeTypeToElementType(type: string): ElementType | null {
  switch (type) {
    case 'Text': return 'paragraph'; // or heading, but we count as paragraph
    case 'View': return 'container';
    case 'Image': return 'image';
    case 'Table': return 'table';
    case 'Chart': return 'chart';
    case 'Group': return 'container';
    default: return null;
  }
}

// =============================================================================
// ELEMENT CONVERTERS
// =============================================================================

function convertText(
  node: PaperTextNode,
  bodyFont: string,
  headingFont: string,
  doc: PaperDocumentInput,
): HeadingElement | ParagraphElement {
  const style = node.style as TextStyleInput | undefined;
  const fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE;
  const fontWeight = normalizeFontWeight(style?.fontWeight);
  const headingLevel = detectHeadingLevel(fontSize, fontWeight);

  // Extract text content
  let text = '';
  let runs: TextRun[] = [];

  if (typeof node.children === 'string') {
    text = node.children;
    runs = [makeTextRun(text, style, headingLevel ? headingFont : bodyFont, doc)];
  } else if (Array.isArray(node.children)) {
    // Array of ParagraphInput
    runs = convertPaperRuns(node.children, headingLevel ? headingFont : bodyFont, doc);
    text = runs.map(r => r.text).join('');
  } else if (node.value != null) {
    text = node.value;
    runs = [makeTextRun(text, style, headingLevel ? headingFont : bodyFont, doc)];
  }

  const computedStyle = textStyleToComputedStyle(style, headingLevel ? headingFont : bodyFont, doc);
  const position = flexStyleToBoundingBox(style);

  if (headingLevel) {
    return {
      ...makeBase('heading', `h${headingLevel}`),
      type: 'heading',
      level: headingLevel as 1 | 2 | 3 | 4 | 5 | 6,
      text,
      runs,
      style: computedStyle,
      position,
    } as HeadingElement;
  }

  return {
    ...makeBase('paragraph', 'p'),
    type: 'paragraph',
    text,
    runs,
    style: computedStyle,
    position,
  } as ParagraphElement;
}

function convertView(
  node: PaperViewNode,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  warnings: string[],
  doc: PaperDocumentInput,
  assets: AssetRegistry,
): ShapeElement | ContainerElement {
  const position = flexStyleToBoundingBox(node.style);

  if (node.shapeType) {
    // Shape element
    const runs = node.textContent
      ? [makeTextRun(node.textContent, undefined, bodyFont, doc)]
      : undefined;
    return {
      ...makeBase('shape', 'div'),
      type: 'shape',
      shapeType: normalizeShapeType(node.shapeType),
      text: node.textContent,
      runs,
      position,
      style: flexStyleToComputedStyle(node.style, bodyFont),
    } as ShapeElement;
  }

  // Container element with children
  const children = (node.children ?? []).flatMap(child =>
    convertNode(child, bodyFont, headingFont, pageWidth, stats, warnings, doc, assets)
  );

  return {
    ...makeBase('container', 'div'),
    type: 'container',
    children,
    position,
    style: flexStyleToComputedStyle(node.style, bodyFont),
  } as ContainerElement;
}

function convertImage(node: PaperImageNode, assets: AssetRegistry): ImageElement {
  const position = flexStyleToBoundingBox(node.style);
  const width = parseNumericDimension(node.style?.width) ?? 400;
  const height = parseNumericDimension(node.style?.height) ?? 300;
  position.width = width;
  position.height = height;

  // Register in asset registry
  const assetId = `paper-img-${nextId()}`;
  assets.images.set(assetId, {
    id: assetId,
    src: node.src,
    mimeType: guessMimeType(node.src),
    width,
    height,
  });

  return {
    ...makeBase('image', 'img'),
    type: 'image',
    src: node.src,
    alt: node.alt ?? '',
    naturalWidth: width,
    naturalHeight: height,
    assetId,
    position,
  } as ImageElement;
}

function convertTable(
  node: PaperTableNode,
  bodyFont: string,
  pageWidth: number,
  doc: PaperDocumentInput,
): TableElement {
  const rows: TableRow[] = node.rows.map((row, rowIdx) => {
    const cells: TableCell[] = row.cells.map((cell, colIdx) => {
      const text = cell.text ?? cell.runs?.map(r => r.text).join('') ?? '';
      const content = cell.runs
        ? cell.runs.map(r => makeTextRunFromInput(r, bodyFont, doc))
        : text ? [makeTextRun(text, undefined, bodyFont, doc)] : [];

      const padding = normalizePadding(cell.style?.padding);
      const cellStyle: CellStyle = {
        backgroundColor: cell.style?.backgroundColor,
        color: cell.style?.color,
        fontFamily: cell.style?.fontFamily,
        fontSize: cell.style?.fontSize,
        fontWeight: cell.style?.fontWeight,
        padding,
        verticalAlign: normalizeVerticalAlign(cell.style?.verticalAlign),
        textAlign: normalizeTextAlign(cell.style?.textAlign),
      };

      return {
        row: rowIdx,
        col: colIdx,
        rowSpan: cell.rowSpan ?? 1,
        colSpan: cell.colSpan ?? 1,
        text,
        content,
        style: cellStyle,
        isHeader: row.isHeader ?? false,
      } satisfies TableCell;
    });

    return {
      index: rowIdx,
      height: 20,
      cells,
      isHeader: row.isHeader ?? false,
      isFooter: false,
    } satisfies TableRow;
  });

  const maxCols = Math.max(...rows.map(r => r.cells.reduce((s, c) => s + (c.colSpan ?? 1), 0)), 1);
  const columns: TableColumn[] = (node.columns ?? []).map(c => ({
    width: c.width ?? pageWidth / maxCols,
  }));
  while (columns.length < maxCols) {
    columns.push({ width: pageWidth / maxCols });
  }

  const headerRowCount = rows.filter(r => r.isHeader).length;
  const cellMatrix = buildCellMatrix(rows, maxCols);

  return {
    ...makeBase('table', 'table'),
    type: 'table',
    columns,
    rows,
    headerRowCount,
    footerRowCount: 0,
    repeatHeaders: true,
    cellMatrix,
    position: flexStyleToBoundingBox(node.style),
  } as TableElement;
}

function convertChart(node: PaperChartNode): ChartElement {
  const position = flexStyleToBoundingBox(node.style);
  const width = parseNumericDimension(node.style?.width) ?? 500;
  const height = parseNumericDimension(node.style?.height) ?? 300;
  position.width = width;
  position.height = height;

  return {
    ...makeBase('chart', 'div'),
    type: 'chart',
    chartType: normalizeChartType(node.chartType),
    title: node.title,
    series: (node.series ?? []).map(s => ({
      name: s.name ?? '',
      values: s.data,
      color: s.color,
    })),
    categories: node.categories,
    axes: node.axes ? { xAxis: node.axes.x, yAxis: node.axes.y } : undefined,
    embedData: true,
    position,
  } as ChartElement;
}

function convertGroup(
  node: PaperGroupNode,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  warnings: string[],
  doc: PaperDocumentInput,
  assets: AssetRegistry,
): ContainerElement {
  const children = node.children.flatMap(child =>
    convertNode(child, bodyFont, headingFont, pageWidth, stats, warnings, doc, assets)
  );

  return {
    ...makeBase('container', 'div'),
    type: 'container',
    children,
    position: flexStyleToBoundingBox(node.style),
    style: flexStyleToComputedStyle(node.style, bodyFont),
  } as ContainerElement;
}

// =============================================================================
// BASE ELEMENT FACTORY
// =============================================================================

function makeBase(type: ElementType, tagName: string) {
  return {
    id: nextId(),
    type,
    position: { x: 0, y: 0, width: 0, height: 0 } as BoundingBox,
    zIndex: 0,
    opacity: 1,
    style: defaultComputedStyle(),
    tagName,
    dataAttributes: {} as Record<string, string>,
  };
}

function defaultComputedStyle(): ComputedStyle {
  return {
    borderTopWidth: 0, borderTopColor: '#000', borderTopStyle: 'none',
    borderRightWidth: 0, borderRightColor: '#000', borderRightStyle: 'none',
    borderBottomWidth: 0, borderBottomColor: '#000', borderBottomStyle: 'none',
    borderLeftWidth: 0, borderLeftColor: '#000', borderLeftStyle: 'none',
    borderRadius: 0,
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
    fontFamily: DEFAULT_FONT, fontSize: DEFAULT_FONT_SIZE,
    fontWeight: 'normal', fontStyle: 'normal',
    lineHeight: 1.15, letterSpacing: 0,
    textAlign: 'left', textDecoration: 'none', color: DEFAULT_COLOR,
    display: 'block', visibility: 'visible', overflow: 'visible',
    opacity: 1,
  };
}

// =============================================================================
// STYLE CONVERTERS
// =============================================================================

function flexStyleToBoundingBox(style?: FlexStyleInput): BoundingBox {
  return {
    x: parseNumericDimension(style?.left) ?? 0,
    y: parseNumericDimension(style?.top) ?? 0,
    width: parseNumericDimension(style?.width) ?? 0,
    height: parseNumericDimension(style?.height) ?? 0,
  };
}

function textStyleToComputedStyle(
  style: TextStyleInput | undefined,
  defaultFont: string,
  doc: PaperDocumentInput,
): ComputedStyle {
  const base = defaultComputedStyle();
  if (!style) return { ...base, fontFamily: defaultFont };

  return {
    ...base,
    fontFamily: style.fontFamily ?? defaultFont,
    fontSize: style.fontSize ?? DEFAULT_FONT_SIZE,
    fontWeight: normalizeFontWeight(style.fontWeight),
    fontStyle: style.fontStyle ?? 'normal',
    textAlign: (style.textAlign as ComputedStyle['textAlign']) ?? 'left',
    lineHeight: style.lineHeight ?? 1.15,
    textDecoration: style.textDecoration ?? 'none',
    color: resolveColor(style.color, doc) ?? DEFAULT_COLOR,
    backgroundColor: resolveColor(style.backgroundColor, doc),
    opacity: style.opacity ?? 1,
    paddingTop: style.paddingTop ?? style.padding ?? 0,
    paddingRight: style.paddingRight ?? style.padding ?? 0,
    paddingBottom: style.paddingBottom ?? style.padding ?? 0,
    paddingLeft: style.paddingLeft ?? style.padding ?? 0,
    marginTop: style.marginTop ?? style.margin ?? 0,
    marginRight: style.marginRight ?? style.margin ?? 0,
    marginBottom: style.marginBottom ?? style.margin ?? 0,
    marginLeft: style.marginLeft ?? style.margin ?? 0,
  };
}

function flexStyleToComputedStyle(
  style: FlexStyleInput | undefined,
  defaultFont: string,
): ComputedStyle {
  const base = defaultComputedStyle();
  if (!style) return { ...base, fontFamily: defaultFont };

  return {
    ...base,
    fontFamily: defaultFont,
    backgroundColor: typeof style.backgroundColor === 'string' ? style.backgroundColor : undefined,
    opacity: style.opacity ?? 1,
    paddingTop: style.paddingTop ?? style.padding ?? 0,
    paddingRight: style.paddingRight ?? style.padding ?? 0,
    paddingBottom: style.paddingBottom ?? style.padding ?? 0,
    paddingLeft: style.paddingLeft ?? style.padding ?? 0,
    marginTop: style.marginTop ?? style.margin ?? 0,
    marginRight: style.marginRight ?? style.margin ?? 0,
    marginBottom: style.marginBottom ?? style.margin ?? 0,
    marginLeft: style.marginLeft ?? style.margin ?? 0,
  };
}

// =============================================================================
// TEXT RUN HELPERS
// =============================================================================

function makeTextRun(
  text: string,
  style: TextStyleInput | undefined,
  defaultFont: string,
  doc: PaperDocumentInput,
): TextRun {
  return {
    text,
    fontFamily: style?.fontFamily ?? defaultFont,
    fontSize: style?.fontSize ?? DEFAULT_FONT_SIZE,
    fontWeight: normalizeFontWeight(style?.fontWeight),
    fontStyle: (style?.fontStyle === 'italic' ? 'italic' : 'normal') as TextRun['fontStyle'],
    textDecoration: (style?.textDecoration ?? 'none') as TextRun['textDecoration'],
    color: resolveColor(style?.color, doc) ?? DEFAULT_COLOR,
    backgroundColor: typeof style?.backgroundColor === 'string' ? style.backgroundColor : undefined,
  };
}

function makeTextRunFromInput(
  run: TextRunInput,
  defaultFont: string,
  doc: PaperDocumentInput,
): TextRun {
  return {
    text: run.text,
    fontFamily: run.style?.fontFamily ?? defaultFont,
    fontSize: run.style?.fontSize ?? DEFAULT_FONT_SIZE,
    fontWeight: normalizeFontWeight(run.style?.fontWeight),
    fontStyle: (run.style?.fontStyle === 'italic' ? 'italic' : 'normal') as TextRun['fontStyle'],
    textDecoration: (run.style?.textDecoration ?? 'none') as TextRun['textDecoration'],
    color: resolveColor(run.style?.color, doc) ?? DEFAULT_COLOR,
    backgroundColor: run.style?.backgroundColor,
    link: run.style?.link,
    superscript: run.style?.superscript,
    subscript: run.style?.subscript,
  };
}

function convertPaperRuns(
  paragraphs: ParagraphInput[],
  defaultFont: string,
  doc: PaperDocumentInput,
): TextRun[] {
  return paragraphs.flatMap(p =>
    p.runs.map(r => makeTextRunFromInput(r, defaultFont, doc))
  );
}

// =============================================================================
// HEADING DETECTION
// =============================================================================

/**
 * Heuristic heading detection based on font size and weight.
 *
 * Returns heading level 1-6, or null if not a heading.
 */
function detectHeadingLevel(fontSize: number, fontWeight: string): number | null {
  if (fontSize >= 28) return 1;
  if (fontSize >= 22) return 2;
  if (fontSize >= 18) return 3;
  const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === '800' || fontWeight === '900';
  if (isBold && fontSize >= 16) return 4;
  if (isBold && fontSize >= 14) return 5;
  if (isBold && fontSize >= 12) return 6;
  return null;
}

// =============================================================================
// DIMENSION & COLOR HELPERS
// =============================================================================

function slideSizeToPageDimensions(slideSize?: { width: number; height: number }): PageDimensions {
  return {
    width: slideSize?.width ?? DEFAULT_PAGE_WIDTH,
    height: slideSize?.height ?? DEFAULT_PAGE_HEIGHT,
    margins: { ...DEFAULT_MARGINS },
  };
}

function parseNumericDimension(value: number | string | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  // Percentage or other string values can't be resolved without container context
  const parsed = parseFloat(value);
  if (!isNaN(parsed) && !value.includes('%')) return parsed;
  return null;
}

function resolveColor(
  color: string | ColorModifierInput | undefined,
  doc: PaperDocumentInput,
): string | undefined {
  if (color == null) return undefined;
  if (typeof color === 'string') return color;

  // ColorModifier object
  if (color.value) return color.value;

  // Try to resolve token from theme
  if (color.token && doc.theme?.colorScheme) {
    return doc.theme.colorScheme[color.token] ?? DEFAULT_COLOR;
  }

  return DEFAULT_COLOR;
}

function normalizeFontWeight(weight: string | number | undefined): 'normal' | 'bold' {
  if (weight == null) return 'normal';
  if (typeof weight === 'number') return weight >= 700 ? 'bold' : 'normal';
  if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') return 'bold';
  return 'normal';
}

function normalizeShapeType(value: string | undefined): ShapeElement['shapeType'] {
  switch (value) {
    case 'ellipse':
    case 'triangle':
    case 'diamond':
    case 'pentagon':
    case 'hexagon':
    case 'star':
    case 'arrow':
    case 'line':
    case 'custom':
      return value;
    case 'rectangle':
    default:
      return 'rectangle';
  }
}

function normalizeTextAlign(value: string | undefined): CellStyle['textAlign'] {
  switch (value) {
    case 'center':
    case 'right':
    case 'justify':
      return value;
    case 'left':
    default:
      return 'left';
  }
}

function normalizeVerticalAlign(value: string | undefined): CellStyle['verticalAlign'] {
  switch (value) {
    case 'middle':
    case 'bottom':
      return value;
    case 'top':
    default:
      return 'top';
  }
}

function normalizeChartType(value: string): ChartType {
  switch (value) {
    case 'column':
    case 'line':
    case 'area':
    case 'pie':
    case 'doughnut':
    case 'scatter':
    case 'bubble':
    case 'radar':
      return value;
    case 'bar':
    default:
      return 'bar';
  }
}

function guessMimeType(src: string): string {
  if (src.startsWith('data:')) {
    const match = src.match(/^data:([^;,]+)/);
    return match?.[1] ?? 'image/png';
  }
  const ext = src.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
}

function normalizePadding(
  padding: number | { top?: number; right?: number; bottom?: number; left?: number } | undefined,
): { top: number; right: number; bottom: number; left: number } {
  if (padding == null) return { top: 2, right: 5, bottom: 2, left: 5 };
  if (typeof padding === 'number') return { top: padding, right: padding, bottom: padding, left: padding };
  return {
    top: padding.top ?? 2,
    right: padding.right ?? 5,
    bottom: padding.bottom ?? 2,
    left: padding.left ?? 5,
  };
}

// =============================================================================
// TABLE HELPERS
// =============================================================================

function buildCellMatrix(rows: TableRow[], maxCols: number): CellReference[][] {
  if (rows.length === 0) return [];
  const matrix: CellReference[][] = rows.map(() => new Array(maxCols));

  for (const row of rows) {
    let col = 0;
    for (const cell of row.cells) {
      while (col < maxCols && matrix[row.index]?.[col]) col++;
      for (let r = 0; r < cell.rowSpan; r++) {
        for (let c = 0; c < cell.colSpan; c++) {
          const ri = row.index + r;
          const ci = col + c;
          if (ri < rows.length && ci < maxCols) {
            matrix[ri][ci] = {
              originRow: row.index,
              originCol: col,
              isOrigin: r === 0 && c === 0,
              cell,
            };
          }
        }
      }
      col += cell.colSpan;
    }
  }

  return matrix;
}

// =============================================================================
// METADATA & EMPTY STRUCTURES
// =============================================================================

function convertMetadata(doc: PaperDocumentInput): DocumentMetadata {
  return {
    title: doc.meta?.title,
    author: doc.meta?.author,
    subject: doc.meta?.subject,
    keywords: doc.meta?.keywords,
    creator: doc.meta?.creator ?? '@runstamp/docx (paper adapter)',
  };
}

function createEmptyStyles(): StyleDefinitions {
  return {
    paragraphStyles: new Map(),
    characterStyles: new Map(),
    tableStyles: new Map(),
  };
}

function createEmptyAssets(): AssetRegistry {
  return {
    images: new Map(),
    fonts: new Map(),
    embeddedFiles: new Map(),
  };
}
