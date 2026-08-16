/**
 * HTML → StructuredDocument Adapter
 *
 * Converts an HTML string into the StructuredDocument format consumed by the
 * DOCX serializer. Follows the same patterns as docx-to-structured.ts.
 *
 * No React, no DOM, no browser APIs.
 */

import type {
  StructuredDocument,
  StructuredPage,
  StructuredElement,
  HeadingElement,
  ParagraphElement,
  CodeBlockElement,
  DividerElement,
  TableElement,
  ImageElement,
  ListElement,
  TextRun,
  TableRow,
  TableCell,
  TableColumn,
  CellReference,
  CellStyle,
  ComputedStyle,
  PageDimensions,
  AssetRegistry,
  StyleDefinitions,
  ExtractionStats,
  ElementType,
  ListItem,
  DOCXHints,
} from '../types.js';

import { parseHtml, isTextNode, isElementNode, type HTMLElement, type Node } from './html-parser.js';
import { parseCssProperties, type CssResolvedProperties } from './css-resolver.js';

// =============================================================================
// OPTIONS & CONTEXT
// =============================================================================

export interface HtmlConversionOptions {
  /** @deprecated Ignored. Inline CSS is always resolved; removed at the next major. */
  proEnabled?: boolean;
  cssMode?: 'inline' | 'ignore';
  baseUrl?: string;
}

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  highlight?: string;
  link?: string;
  superscript?: boolean;
  subscript?: boolean;
}

interface HtmlConversionContext {
  listDepth: number;
  listType: ('bullet' | 'number')[];
  runStyle: RunStyle;
  warnings: string[];
  elementCounter: number;
  cssMode: 'inline' | 'ignore';
  baseUrl?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_FONT = 'Calibri';
const DEFAULT_FONT_SIZE = 11;
const DEFAULT_COLOR = '#000000';
const DEFAULT_PAGE: PageDimensions = {
  width: 595,
  height: 842,
  margins: { top: 72, right: 72, bottom: 72, left: 72 },
};

const HEADING_FONT_SIZES: Record<number, number> = {
  1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 11,
};

/** Tags whose content should be completely skipped (not preserved). */
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'template',
]);

/** Tags that are structural pass-through (walk children). */
const PASSTHROUGH_TAGS = new Set([
  'div', 'section', 'article', 'main', 'header', 'footer',
  'nav', 'aside', 'figure', 'figcaption',
]);

/** Tags treated as inline formatting. */
const INLINE_TAGS = new Set([
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'strike',
  'a', 'code', 'span', 'sup', 'sub', 'br', 'mark',
]);

// CSS resolver is statically imported but only invoked when Pro is enabled.

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Convert an HTML string to a StructuredDocument.
 */
export function convertHtmlToStructured(
  html: string,
  options?: HtmlConversionOptions,
): { document: StructuredDocument; warnings: string[] } {
  const ctx: HtmlConversionContext = {
    listDepth: 0,
    listType: [],
    runStyle: {},
    warnings: [],
    elementCounter: 0,
    cssMode: options?.cssMode ?? 'inline',
    baseUrl: options?.baseUrl,
  };

  // lint-allow-nondeterministic: perf timer only; value surfaces in stats, not output bytes
  const startTime = Date.now();

  const root = parseHtml(html);
  const elements = walkChildren(root, ctx);

  const stats: ExtractionStats = {
    pageCount: 1,
    elementCount: elements.length,
    elementsByType: {} as Record<ElementType, number>,
    imageCount: 0,
    tableCount: 0,
    chartCount: 0,
    // lint-allow-nondeterministic: perf timer diff
    extractionTimeMs: Date.now() - startTime,
  };

  // Count element types
  for (const el of elements) {
    stats.elementsByType[el.type] = (stats.elementsByType[el.type] ?? 0) + 1;
    if (el.type === 'table') stats.tableCount++;
    if (el.type === 'image') stats.imageCount++;
  }

  const page: StructuredPage = {
    pageNumber: 1,
    dimensions: { ...DEFAULT_PAGE },
    elements,
  };

  const document: StructuredDocument = {
    __kind: 'StructuredDocument',
    metadata: { creator: '@runstamp/docx' },
    pages: [page],
    styles: createEmptyStyles(),
    assets: createEmptyAssets(),
    stats,
    warnings: ctx.warnings,
  };

  return { document, warnings: ctx.warnings };
}

// =============================================================================
// BASE ELEMENT FACTORY
// =============================================================================

function nextId(ctx: HtmlConversionContext): string {
  return `el-${++ctx.elementCounter}`;
}

function makeBase(
  type: ElementType,
  tagName: string,
  ctx: HtmlConversionContext,
  docxHints?: DOCXHints,
): { id: string; type: ElementType; position: { x: number; y: number; width: number; height: number }; zIndex: number; opacity: number; style: ComputedStyle; tagName: string; dataAttributes: Record<string, string>; docx?: DOCXHints } {
  return {
    id: nextId(ctx),
    type,
    position: { x: 0, y: 0, width: 0, height: 0 },
    zIndex: 0,
    opacity: 1,
    style: defaultComputedStyle(),
    tagName,
    dataAttributes: {},
    docx: docxHints,
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

// =============================================================================
// ELEMENT TREE WALKING
// =============================================================================

/**
 * Walk all children of a node, dispatching each to processElement.
 */
function walkChildren(node: HTMLElement, ctx: HtmlConversionContext): StructuredElement[] {
  const results: StructuredElement[] = [];
  for (const child of node.childNodes) {
    if (isTextNode(child)) {
      // Top-level text nodes outside inline context become paragraphs
      const text = child.text;
      if (text.trim()) {
        results.push({
          ...makeBase('paragraph', 'p', ctx),
          type: 'paragraph',
          text,
          runs: [makeTextRun(text, {})],
        } as ParagraphElement);
      }
    } else if (isElementNode(child)) {
      results.push(...processElement(child, ctx));
    }
  }
  return results;
}

/**
 * Main dispatcher — convert an HTMLElement to StructuredElement(s).
 */
function processElement(el: HTMLElement, ctx: HtmlConversionContext): StructuredElement[] {
  const tag = el.tagName?.toLowerCase();

  // Skip tags whose content should not appear in document output
  if (SKIP_TAGS.has(tag)) {
    return [];
  }

  // Headings
  if (/^h[1-6]$/.test(tag)) {
    return [convertHeading(el, ctx)];
  }

  switch (tag) {
    case 'p':
      return [convertParagraph(el, ctx)];
    case 'ul':
      return [convertList(el, 'bullet', ctx)];
    case 'ol':
      return [convertList(el, 'number', ctx)];
    case 'blockquote':
      return convertBlockquote(el, ctx);
    case 'pre':
      return [convertCodeBlock(el, ctx)];
    case 'hr':
      return [convertDivider(ctx)];
    case 'table':
      return [convertTable(el, ctx)];
    case 'img':
      return convertImage(el, ctx);
    case 'br':
      // Top-level <br> — empty paragraph
      return [{
        ...makeBase('paragraph', 'p', ctx),
        type: 'paragraph',
        text: '',
        runs: [],
      } as ParagraphElement];
    default:
      break;
  }

  // Structural pass-through
  if (PASSTHROUGH_TAGS.has(tag)) {
    return walkChildren(el, ctx);
  }

  // Inline tags at block level — wrap in paragraph
  if (INLINE_TAGS.has(tag)) {
    const runs = processInlineContent(el, ctx, {});
    if (runs.length === 0) return [];
    const text = runs.map(r => r.text).join('');
    return [{
      ...makeBase('paragraph', 'p', ctx),
      type: 'paragraph',
      text,
      runs,
    } as ParagraphElement];
  }

  // Unknown — warn, walk children to preserve content
  if (tag) {
    ctx.warnings.push(`Unsupported element <${tag}> — content preserved`);
  }
  return walkChildren(el, ctx);
}

// =============================================================================
// BLOCK ELEMENT CONVERTERS
// =============================================================================

function convertHeading(el: HTMLElement, ctx: HtmlConversionContext): HeadingElement {
  const level = parseInt(el.tagName[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
  const fontSize = HEADING_FONT_SIZES[level] ?? DEFAULT_FONT_SIZE;

  const parentStyle: RunStyle = { bold: true, fontSize };
  const cssProps = resolveInlineCss(el, ctx);
  if (cssProps) applyRunCss(parentStyle, cssProps);

  const runs = processInlineContent(el, ctx, parentStyle);
  const text = runs.map(r => r.text).join('');

  const docxHints: DOCXHints = {
    outlineLevel: level - 1,
    keepNext: true,
  };

  const base = makeBase('heading', `h${level}`, ctx, docxHints);
  const style = { ...base.style };
  if (cssProps?.textAlign) style.textAlign = cssProps.textAlign;

  return {
    ...base,
    type: 'heading',
    level,
    text,
    runs,
    style,
  } as HeadingElement;
}

function convertParagraph(el: HTMLElement, ctx: HtmlConversionContext): ParagraphElement {
  const parentStyle: RunStyle = {};
  const cssProps = resolveInlineCss(el, ctx);
  if (cssProps) applyRunCss(parentStyle, cssProps);

  const runs = processInlineContent(el, ctx, parentStyle);
  const text = runs.map(r => r.text).join('');

  const base = makeBase('paragraph', 'p', ctx);
  const style = { ...base.style };
  if (cssProps) applyCssToParagraphStyle(style, cssProps);

  return {
    ...base,
    type: 'paragraph',
    text,
    runs,
    style,
  } as ParagraphElement;
}

function convertBlockquote(el: HTMLElement, ctx: HtmlConversionContext): StructuredElement[] {
  // Check if blockquote has block-level children
  const children = walkChildren(el, ctx);
  if (children.length > 0) {
    // Apply indent to all block children
    for (const child of children) {
      if ('style' in child) {
        (child.style as ComputedStyle).marginLeft = 40;
      }
    }
    return children;
  }

  // Inline-only content — wrap as indented paragraph
  const parentStyle: RunStyle = { italic: true };
  const runs = processInlineContent(el, ctx, parentStyle);
  const text = runs.map(r => r.text).join('');

  const base = makeBase('paragraph', 'blockquote', ctx);
  return [{
    ...base,
    type: 'paragraph',
    text,
    runs,
    style: {
      ...base.style,
      marginLeft: 40,
      fontStyle: 'italic',
    },
  } as ParagraphElement];
}

function convertCodeBlock(el: HTMLElement, ctx: HtmlConversionContext): CodeBlockElement {
  const code = el.textContent ?? '';
  const className = el.getAttribute('class') ?? '';
  const language = className.match(/(?:lang|language)-([\w-]+)/i)?.[1] ?? undefined;

  return {
    ...makeBase('code-block', 'pre', ctx),
    type: 'code-block',
    code,
    language,
    style: {
      ...defaultComputedStyle(),
      fontFamily: 'Consolas',
      fontSize: 10,
      backgroundColor: '#f5f5f5',
    },
  } as CodeBlockElement;
}

function convertDivider(ctx: HtmlConversionContext): DividerElement {
  return {
    ...makeBase('divider', 'hr', ctx),
    type: 'divider',
    styleType: 'solid',
    color: '#cccccc',
    thickness: 1,
    style: {
      ...defaultComputedStyle(),
      borderBottomWidth: 1,
      borderBottomColor: '#cccccc',
      borderBottomStyle: 'solid',
    },
  } as DividerElement;
}

// =============================================================================
// LIST CONVERSION
// =============================================================================

function convertList(
  el: HTMLElement,
  listType: 'bullet' | 'number',
  ctx: HtmlConversionContext,
): ListElement {
  const depth = Math.min(ctx.listDepth, 8); // Clamp to Word 9-level limit (0-indexed)
  const start = listType === 'number' ? parseInt(el.getAttribute('start') ?? '1', 10) : 1;

  ctx.listDepth++;
  ctx.listType.push(listType);

  const items: ListItem[] = [];
  for (const child of el.childNodes) {
    if (isElementNode(child) && child.tagName?.toLowerCase() === 'li') {
      items.push(convertListItem(child, ctx));
    }
  }

  ctx.listDepth--;
  ctx.listType.pop();

  return {
    ...makeBase('list', listType === 'bullet' ? 'ul' : 'ol', ctx),
    type: 'list',
    listType,
    start,
    items,
    level: depth,
  } as ListElement;
}

function convertListItem(el: HTMLElement, ctx: HtmlConversionContext): ListItem {
  // Separate inline content from nested lists
  let nestedList: ListElement | undefined;
  const inlineNodes: Node[] = [];

  for (const child of el.childNodes) {
    if (isElementNode(child)) {
      const tag = child.tagName?.toLowerCase();
      if (tag === 'ul') {
        nestedList = convertList(child, 'bullet', ctx);
        continue;
      }
      if (tag === 'ol') {
        nestedList = convertList(child, 'number', ctx);
        continue;
      }
    }
    inlineNodes.push(child);
  }

  // Process inline content from the collected nodes
  const runs = processInlineNodes(inlineNodes, ctx, {});
  const text = runs.map(r => r.text).join('');

  return { text, content: runs, nestedList };
}

// =============================================================================
// TABLE CONVERSION
// =============================================================================

function convertTable(el: HTMLElement, ctx: HtmlConversionContext): TableElement | ParagraphElement {
  const rows: TableRow[] = [];
  let rowIdx = 0;

  // Collect rows from thead, tbody, tfoot, or direct tr children
  const collectRows = (parent: HTMLElement, isHeader: boolean) => {
    for (const child of parent.childNodes) {
      if (!isElementNode(child)) continue;
      const tag = child.tagName?.toLowerCase();
      if (tag === 'tr') {
        rows.push(convertTableRow(child, rowIdx, isHeader, ctx));
        rowIdx++;
      }
    }
  };

  // Walk top-level children
  for (const child of el.childNodes) {
    if (!isElementNode(child)) continue;
    const tag = child.tagName?.toLowerCase();
    switch (tag) {
      case 'thead':
        collectRows(child, true);
        break;
      case 'tbody':
        collectRows(child, false);
        break;
      case 'tfoot':
        collectRows(child, false);
        break;
      case 'tr':
        // Direct tr — detect header from th presence
        rows.push(convertTableRow(child, rowIdx, false, ctx));
        rowIdx++;
        break;
      case 'caption':
        // Handled below
        break;
    }
  }

  // Caption
  const captionEl = el.querySelector('caption');
  const caption = captionEl?.textContent?.trim() || undefined;

  // Compute columns
  const pageWidth = DEFAULT_PAGE.width - DEFAULT_PAGE.margins.left - DEFAULT_PAGE.margins.right;
  const maxCols = Math.max(
    ...rows.map(r => r.cells.reduce((s, c) => s + (c.colSpan ?? 1), 0)),
    1,
  );
  const columns: TableColumn[] = [];
  for (let c = 0; c < maxCols; c++) {
    columns.push({ width: pageWidth / maxCols });
  }

  const headerRowCount = rows.filter(r => r.isHeader).length;
  const cellMatrix = buildCellMatrix(rows);

  return {
    ...makeBase('table', 'table', ctx),
    type: 'table',
    columns,
    rows,
    headerRowCount,
    footerRowCount: 0,
    repeatHeaders: true,
    cellMatrix,
    caption,
  } as TableElement;
}

function convertTableRow(
  el: HTMLElement,
  rowIdx: number,
  forceHeader: boolean,
  ctx: HtmlConversionContext,
): TableRow {
  const cells: TableCell[] = [];
  let colIdx = 0;
  let hasThOnly = true;

  for (const child of el.childNodes) {
    if (!isElementNode(child)) continue;
    const tag = child.tagName?.toLowerCase();
    if (tag !== 'td' && tag !== 'th') continue;

    const isHeader = forceHeader || tag === 'th';
    if (tag !== 'th') hasThOnly = false;

    const rowSpan = parseInt(child.getAttribute('rowspan') ?? '1', 10);
    const colSpan = parseInt(child.getAttribute('colspan') ?? '1', 10);

    const runs = processInlineContent(child, ctx, {});
    const text = runs.map(r => r.text).join('');

    const cellStyle: CellStyle = {
      padding: { top: 2, right: 5, bottom: 2, left: 5 },
      verticalAlign: 'top',
      textAlign: 'left',
    };

    cells.push({
      row: rowIdx,
      col: colIdx,
      rowSpan,
      colSpan,
      text,
      content: runs,
      style: cellStyle,
      isHeader,
    });
    colIdx += colSpan;
  }

  return {
    index: rowIdx,
    height: 20,
    cells,
    isHeader: forceHeader || hasThOnly,
    isFooter: false,
  };
}

function buildCellMatrix(rows: TableRow[]): CellReference[][] {
  if (rows.length === 0) return [];
  const maxCols = Math.max(...rows.map(r => r.cells.reduce((s, c) => s + c.colSpan, 0)));
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
// IMAGE CONVERSION (Pro)
// =============================================================================

function convertImage(el: HTMLElement, ctx: HtmlConversionContext): StructuredElement[] {
  const src = el.getAttribute('src') ?? '';
  if (!src) {
    ctx.warnings.push('Image src is empty — skipped');
    return [];
  }

  const alt = el.getAttribute('alt') ?? '';
  const width = parseDimension(el.getAttribute('width'));
  const height = parseDimension(el.getAttribute('height'));

  // Resolve relative URLs
  let resolvedSrc = src;
  if (ctx.baseUrl && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
    try {
      resolvedSrc = new URL(src, ctx.baseUrl).href;
    } catch {
      // Keep original src
    }
  }

  // Validate URL scheme — only allow data:, http:, https:
  if (!resolvedSrc.startsWith('data:')) {
    try {
      const parsed = new URL(resolvedSrc);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        ctx.warnings.push(`Image URL scheme "${parsed.protocol}" not allowed — skipped`);
        return [];
      }
    } catch {
      ctx.warnings.push(`Image URL "${resolvedSrc.slice(0, 100)}" could not be parsed — skipped`);
      return [];
    }
  }

  return [{
    ...makeBase('image', 'img', ctx),
    type: 'image',
    src: resolvedSrc,
    alt,
    naturalWidth: width,
    naturalHeight: height,
    position: { x: 0, y: 0, width: width ?? 400, height: height ?? 300 },
  } as ImageElement];
}

function parseDimension(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  // Strip "px" suffix if present
  const cleaned = value.replace(/px$/i, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

// =============================================================================
// INLINE CONTENT PROCESSING
// =============================================================================

/**
 * Process the inline content of an element, producing TextRun[].
 * This is the core function that walks inline children recursively,
 * building text runs with accumulated formatting.
 */
function processInlineContent(
  el: HTMLElement,
  ctx: HtmlConversionContext,
  parentStyle: RunStyle,
): TextRun[] {
  return processInlineNodes(el.childNodes, ctx, parentStyle);
}

/**
 * Process a list of nodes as inline content.
 */
function processInlineNodes(
  nodes: readonly Node[],
  ctx: HtmlConversionContext,
  parentStyle: RunStyle,
): TextRun[] {
  const runs: TextRun[] = [];

  for (const child of nodes) {
    if (isTextNode(child)) {
      const text = child.text;
      if (text) {
        runs.push(makeTextRun(text, parentStyle));
      }
      continue;
    }

    if (!isElementNode(child)) continue;

    const tag = child.tagName?.toLowerCase();

    // <br> → newline character
    if (tag === 'br') {
      runs.push(makeTextRun('\n', parentStyle));
      continue;
    }

    // Compute child's run style by merging parent + tag effects + CSS
    const childStyle = resolveInlineStyle(child, parentStyle, ctx);

    // If this tag is inline, recurse into its children
    if (INLINE_TAGS.has(tag) || tag === 'mark') {
      const childRuns = processInlineContent(child, ctx, childStyle);
      runs.push(...childRuns);
      continue;
    }

    // Block-level inside inline context — treat children as inline (best effort)
    const childRuns = processInlineContent(child, ctx, childStyle);
    runs.push(...childRuns);
  }

  return runs;
}

/**
 * Resolve inline formatting for a tag, combining parent style + tag semantics + CSS.
 */
function resolveInlineStyle(
  el: HTMLElement,
  parentStyle: RunStyle,
  ctx: HtmlConversionContext,
): RunStyle {
  const style: RunStyle = { ...parentStyle };
  const tag = el.tagName?.toLowerCase();

  // Tag-based formatting (always applied, Free tier)
  switch (tag) {
    case 'strong':
    case 'b':
      style.bold = true;
      break;
    case 'em':
    case 'i':
      style.italic = true;
      break;
    case 'u':
      style.underline = true;
      break;
    case 's':
    case 'del':
    case 'strike':
      style.strikethrough = true;
      break;
    case 'a': {
      const href = el.getAttribute('href');
      if (href) style.link = href;
      break;
    }
    case 'code':
      style.code = true;
      style.fontFamily = 'Consolas';
      break;
    case 'sup':
      style.superscript = true;
      style.subscript = undefined;
      break;
    case 'sub':
      style.subscript = true;
      style.superscript = undefined;
      break;
    case 'mark':
      style.highlight = style.highlight ?? '#FFFF00';
      break;
  }

  // CSS-based formatting (Pro only, when cssMode === 'inline')
  const cssProps = resolveInlineCss(el, ctx);
  if (cssProps) {
    applyRunCss(style, cssProps);
  }

  return style;
}

/**
 * Resolve inline CSS properties from an element's style attribute.
 * Returns undefined when cssMode is not 'inline'.
 */
function resolveInlineCss(
  el: HTMLElement,
  ctx: HtmlConversionContext,
): CssResolvedProperties | undefined {
  if (ctx.cssMode !== 'inline') return undefined;

  const styleAttr = el.getAttribute('style');
  if (!styleAttr) return undefined;

  try {
    return parseCssProperties(styleAttr);
  } catch {
    return undefined;
  }
}

/**
 * Apply CSS-resolved properties to a RunStyle.
 */
function applyRunCss(style: RunStyle, css: CssResolvedProperties): void {
  if (css.bold !== undefined) style.bold = css.bold;
  if (css.italic !== undefined) style.italic = css.italic;
  if (css.underline !== undefined) style.underline = css.underline;
  if (css.strikethrough !== undefined) style.strikethrough = css.strikethrough;
  if (css.color) style.color = css.color;
  if (css.fontSize) style.fontSize = css.fontSize;
  if (css.fontFamily) style.fontFamily = css.fontFamily;
  if (css.highlight) style.highlight = css.highlight;
}

/**
 * Apply CSS-resolved properties to a paragraph-level ComputedStyle.
 */
function applyCssToParagraphStyle(style: ComputedStyle, css: CssResolvedProperties): void {
  if (css.textAlign) style.textAlign = css.textAlign;
  if (css.marginLeft) style.marginLeft = css.marginLeft;
  if (css.spaceBefore) style.marginTop = css.spaceBefore;
  if (css.spaceAfter) style.marginBottom = css.spaceAfter;
  if (css.fontFamily) style.fontFamily = css.fontFamily;
  if (css.fontSize) style.fontSize = css.fontSize;
  if (css.color) style.color = css.color;
}

// =============================================================================
// TEXT RUN FACTORY
// =============================================================================

/**
 * Create a TextRun from text and accumulated RunStyle.
 */
function makeTextRun(text: string, style: RunStyle): TextRun {
  const fontWeight: 'normal' | 'bold' | number = style.bold ? 'bold' : 'normal';
  const fontStyle: 'normal' | 'italic' = style.italic ? 'italic' : 'normal';

  // Compute textDecoration
  let textDecoration: 'none' | 'underline' | 'line-through' | 'underline line-through' = 'none';
  if (style.underline && style.strikethrough) {
    textDecoration = 'underline line-through';
  } else if (style.underline) {
    textDecoration = 'underline';
  } else if (style.strikethrough) {
    textDecoration = 'line-through';
  }

  return {
    text,
    fontFamily: style.fontFamily ?? DEFAULT_FONT,
    fontSize: style.fontSize ?? DEFAULT_FONT_SIZE,
    fontWeight,
    fontStyle,
    textDecoration,
    color: style.color ?? DEFAULT_COLOR,
    backgroundColor: style.highlight,
    link: style.link,
    superscript: style.superscript,
    subscript: style.subscript,
  };
}
