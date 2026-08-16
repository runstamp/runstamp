/**
 * DocxDocument → StructuredDocument Adapter
 *
 * Converts the AI-friendly DocxDocument JSON schema into the StructuredDocument
 * format consumed by the DOCX serializer. This is the primary input path for
 * the JSON-first architecture.
 *
 * No React, no DOM, no browser APIs.
 */

import type {
  BaseElement,
  StructuredDocument,
  StructuredPage,
  StructuredElement,
  HeadingElement,
  ParagraphElement,
  CodeBlockElement,
  PageBreakElement,
  DividerElement,
  TableElement,
  ImageElement,
  ChartElement,
  ShapeElement,
  ListElement,
  ContainerElement,
  TextRun,
  TableRow,
  TableCell,
  TableColumn,
  CellReference,
  CellStyle,
  ComputedStyle,
  PageDimensions,
  DocumentMetadata,
  AssetRegistry,
  StyleDefinitions,
  ExtractionStats,
  ElementType,
  HeaderFooterContent,
  DOCXHints,
  ListItem,
  RevisionInfo,
  ParagraphRevision,
  TableRevision,
  TableCellRevision,
  TableRowRevision,
} from '../types.js';

import type { z } from 'zod';
import type {
  ChartElementSchema,
  CodeBlockElementSchema,
  DividerElementSchema,
  DocxDocument,
  DocxElement,
  DocxPage,
  DocxTextRun,
  HeaderFooterDef,
  HeadingElementSchema,
  ImageElementSchema,
  ParagraphElementSchema,
  ShapeElementSchema,
  TableElementSchema,
} from '../schema.js';
import { pointsToPx } from '../utils/units.js';

type DocxHeadingInput = z.infer<typeof HeadingElementSchema> & {
  indent?: DOCXHints['indent'];
};
type DocxParagraphInput = z.infer<typeof ParagraphElementSchema> & {
  pageBreakBefore?: boolean;
  indent?: DOCXHints['indent'];
};
type DocxListInput = DocxNestedListInput & {
  style?: unknown;
};
type DocxListItemInput = {
  text?: string;
  runs?: DocxTextRun[];
  nestedList?: DocxNestedListInput;
};
type DocxNestedListInput = {
  type: 'list';
  listType?: 'bullet' | 'number' | 'letter' | 'roman';
  start?: number;
  items: DocxListItemInput[];
};
type DocxTableInput = z.infer<typeof TableElementSchema>;
type DocxImageInput = z.infer<typeof ImageElementSchema>;
type DocxChartInput = z.infer<typeof ChartElementSchema>;
type DocxShapeInput = z.infer<typeof ShapeElementSchema>;
type DocxCodeBlockInput = z.infer<typeof CodeBlockElementSchema>;
type DocxDividerInput = z.infer<typeof DividerElementSchema>;
type DocxContainerInput = {
  type: 'container';
  layout?: 'vertical' | 'horizontal' | 'grid';
  columns?: number;
  gap?: number;
  keepTogether?: boolean;
  children: DocxElement[];
};
// =============================================================================
// PAGE SIZE LOOKUP
// =============================================================================

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 794, height: 1123 },     // 210mm × 297mm at 96 CSS px/in
  letter: { width: 816, height: 1056 }, // 8.5" × 11" at 96 CSS px/in
  legal: { width: 816, height: 1344 },  // 8.5" × 14" at 96 CSS px/in
  a3: { width: 1123, height: 1587 },    // 297mm × 420mm at 96 CSS px/in
  a5: { width: 560, height: 794 },      // 148mm × 210mm at 96 CSS px/in
};

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_FONT = 'Calibri';
const DEFAULT_FONT_SIZE = 11;
const DEFAULT_COLOR = '000000';
const DEFAULT_MARGINS = { top: 72, right: 72, bottom: 72, left: 72 };
const AUTO_REFLOW_TEXT_THRESHOLD = 8_000;
const COMPACT_TYPOGRAPHY_TEXT_THRESHOLD = 9_000;

interface ConversionTheme {
  bodyFont: string;
  bodyFontSize: number;
  bodyLineHeight: number;
  chartDefaultHeight: number;
  headingFont: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  defaultTableStyle: DocxTableInput['tableStyle'];
  signatureParagraphSpacing: number;
  signatureRowHeight: number;
}

function textualPayloadLength(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + textualPayloadLength(item), 0);
  if (value === null || typeof value !== 'object') return 0;
  return Object.entries(value as Record<string, unknown>).reduce(
    (sum, [key, item]) => sum + (key === 'text' ? (typeof item === 'string' ? item.length : 0) : textualPayloadLength(item)),
    0,
  );
}

function pageMarginsToPx(margins: typeof DEFAULT_MARGINS): typeof DEFAULT_MARGINS {
  return {
    top: pointsToPx(margins.top),
    right: pointsToPx(margins.right),
    bottom: pointsToPx(margins.bottom),
    left: pointsToPx(margins.left),
  };
}

// =============================================================================
// MAIN CONVERSION
// =============================================================================

let elementCounter = 0;

function nextId(): string {
  return `el-${++elementCounter}`;
}

function docxElementText(element: DocxElement | undefined): string {
  if (!element) return '';
  const text = 'text' in element && typeof element.text === 'string' ? element.text : undefined;
  if (text !== undefined) return text;
  const runs = 'runs' in element && Array.isArray(element.runs)
    ? element.runs as DocxTextRun[]
    : [];
  return runs.map((run) => run.text).join('');
}

function addReflowContinuationHints(pages: DocxPage[]): DocxPage[] {
  return pages.map((page) => ({
    ...page,
    elements: page.elements.map((element, index) => {
      const terminalDoubleTableStart = page.elements.length - 5;
      const terminalDoubleTable = terminalDoubleTableStart >= 0
        && page.elements[terminalDoubleTableStart]?.type === 'heading'
        && page.elements[terminalDoubleTableStart + 1]?.type === 'paragraph'
        && page.elements[terminalDoubleTableStart + 2]?.type === 'table'
        && page.elements[terminalDoubleTableStart + 3]?.type === 'heading'
        && page.elements[terminalDoubleTableStart + 4]?.type === 'table';
      const terminalTableSummary = terminalDoubleTableStart >= 0
        && page.elements[terminalDoubleTableStart]?.type === 'table'
        && page.elements[terminalDoubleTableStart + 1]?.type === 'heading'
        && page.elements[terminalDoubleTableStart + 2]?.type === 'table'
        && page.elements[terminalDoubleTableStart + 3]?.type === 'heading'
        && page.elements[terminalDoubleTableStart + 4]?.type === 'list';
      if (terminalDoubleTable && index === terminalDoubleTableStart && element.style === undefined) {
        return { ...element, style: { margin: { top: 80, bottom: 20 } } };
      }
      if (terminalDoubleTable && index === terminalDoubleTableStart + 1 && element.style === undefined) {
        return { ...element, style: { lineHeight: 1.5, margin: { bottom: 80 } } };
      }
      const next = page.elements[index + 1];
      if (
        terminalTableSummary
        && index === terminalDoubleTableStart
        && element.type === 'table'
        && element.keepWithNext === undefined
      ) {
        // Carry the final row of a repeated-period table into the closing
        // escalation/summary section so the terminal page has useful context.
        return { ...element, keepWithNext: true };
      }
      if (
        element.type === 'list'
        && next?.type === 'paragraph'
        && index + 1 === page.elements.length - 1
        && /^(?:limitations|methodology(?: note)?)[.:]/i.test(docxElementText(next))
      ) {
        return {
          ...element,
          __keepLastWithNext: true,
        } as DocxElement;
      }
      if (
        element.type === 'table'
        && element.keepWithNext === undefined
        && next?.type === 'container'
        && next.keepTogether === true
      ) {
        // Keep the final table-row pair with the continuation block. This lets
        // Word balance a late table across pages instead of leaving the
        // following headed section stranded on a sparse final page.
        return { ...element, keepWithNext: true };
      }
      if (
        element.type === 'heading'
        && element.style === undefined
        && page.elements[index - 1]?.type === 'table'
        && index + 2 === page.elements.length - 1
      ) {
        return { ...element, style: { margin: { top: 100, bottom: 16 } } };
      }
      if (
        element.type === 'paragraph'
        && element.style === undefined
        && index === page.elements.length - 1
        && /signed as a true record/i.test(docxElementText(element))
      ) {
        return { ...element, style: { margin: { top: 150 } } };
      }
      if (
        element.type === 'table'
        && element.keepWithNext === undefined
        && next?.type === 'heading'
        && index + 2 === page.elements.length - 1
        && page.elements[index + 2]?.type === 'table'
      ) {
        // Keep the last substantive row with a terminal history/approval
        // table so the final page retains the context it closes out.
        return { ...element, keepWithNext: true };
      }
      if (
        element.type === 'table'
        && element.keepWithNext === undefined
        && next?.type === 'heading'
        && index + 3 === page.elements.length - 1
        && page.elements[index + 2]?.type === 'paragraph'
        && page.elements[index + 3]?.type === 'paragraph'
      ) {
        // Carry the terminal table row into a compact closing/sign-off block
        // so action registers do not leave the close stranded by itself.
        return { ...element, keepWithNext: true };
      }
      if (
        element.type === 'table'
        && element.keepWithNext === undefined
        && next?.type === 'heading'
        && index + 3 === page.elements.length - 1
        && page.elements[index + 2]?.type === 'list'
        && page.elements[index + 3]?.type === 'paragraph'
      ) {
        // Keep the final row of a long digest table with its short next-steps
        // section instead of leaving that section alone on a sparse last page.
        return { ...element, keepWithNext: true };
      }
      if (
        element.type === 'table'
        && element.keepTogether === undefined
        && Array.isArray(element.rows)
        && element.rows.length <= 8
        && next?.type === 'divider'
        && page.elements[index + 2]?.type === 'paragraph'
        && page.elements[index + 3]?.type === 'table'
        && index + 3 === page.elements.length - 1
      ) {
        // A compact terminal decision log belongs with the certification and
        // signature block that follows it. Keeping the table intact prevents
        // Word from placing only its final rows on an otherwise sparse page.
        return { ...element, keepTogether: true };
      }
      const sectionHeading = page.elements[index - 1];
      const sectionTail = page.elements[index + 1];
      if (
        element.type === 'paragraph'
        && element.keepNext === undefined
        && sectionHeading?.type === 'heading'
        && sectionTail?.type === 'paragraph'
        && index + 1 === page.elements.length - 1
      ) {
        const currentRuns = Array.isArray(element.runs) ? element.runs as DocxTextRun[] : [];
        const tailRuns = Array.isArray(sectionTail.runs) ? sectionTail.runs as DocxTextRun[] : [];
        const currentText = typeof element.text === 'string'
          ? element.text
          : currentRuns.map((run) => run.text).join('');
        const tailText = typeof sectionTail.text === 'string'
          ? sectionTail.text
          : tailRuns.map((run) => run.text).join('');
        if (currentText.length + tailText.length <= 1_200) {
          // Keep a compact two-paragraph closing section intact so its final
          // attribution or limitations paragraph cannot become an orphan.
          return { ...element, keepNext: true };
        }
      }
      return element;
    }),
  }));
}

function normalizePages(doc: DocxDocument): DocxPage[] {
  const pagination = doc.options?.pagination;
  const denseDocument = textualPayloadLength(doc.pages) >= AUTO_REFLOW_TEXT_THRESHOLD;
  if (pagination === 'preserve' || (pagination !== 'reflow' && !denseDocument)) {
    return pagination === 'preserve' ? doc.pages : addReflowContinuationHints(doc.pages);
  }

  const normalized: DocxPage[] = [];
  for (const [index, sourcePage] of doc.pages.entries()) {
    const softenHeadingBreaks = pagination === undefined && denseDocument;
    const formalSignoffIndex = sourcePage.elements.findIndex((element) => {
      if (element.type !== 'paragraph') return false;
      const text = docxElementText(element);
      return /^(?:sincerely|respectfully|very truly yours)[,:]?$/i.test(text.trim());
    });
    const balanceClosingSection = index === doc.pages.length - 1
      && sourcePage.elements.length <= 4
      && sourcePage.elements.some((element) => element.type === 'list');
    const page: DocxPage = {
      ...sourcePage,
      elements: sourcePage.elements.map((element, elementIndex) => {
        const softened = softenHeadingBreaks && element.pageBreakBefore === true
          ? { ...element, pageBreakBefore: undefined }
          : element;
        if (formalSignoffIndex >= 0
          && elementIndex >= formalSignoffIndex
          && softened.type === 'paragraph'
          && softened.style === undefined) {
          return {
            ...softened,
            style: {
              lineHeight: 1.3,
              margin: { bottom: elementIndex === formalSignoffIndex ? 120 : 50 },
            },
          };
        }
        if (balanceClosingSection && softened.type === 'list' && softened.style === undefined) {
          return { ...softened, style: { lineHeight: 1.5, margin: { bottom: 30 } } };
        }
        if (balanceClosingSection && softened.type === 'paragraph' && softened.style === undefined) {
          return { ...softened, style: { lineHeight: 1.3 } };
        }
        return softened;
      }),
    };
    const previous = normalized.at(-1);
    const pageStartsSection = !!(
      page.sectionBreak
      || page.dimensions
      || page.header
      || page.footer
      || page.headerFooter
      || (
        index === 1
        && typeof doc.tableOfContents === 'object'
        && doc.tableOfContents.position === 'after-cover'
      )
    );
    const previousHasSectionOverrides = !!(
      previous?.dimensions
      || previous?.header
      || previous?.footer
      || previous?.headerFooter
    );

    if (!previous || pageStartsSection || previousHasSectionOverrides) {
      normalized.push(page);
    } else {
      previous.elements.push(...page.elements);
    }
  }
  return addReflowContinuationHints(normalized);
}

function defaultTableStyleForTheme(
  preset: NonNullable<DocxDocument['theme']>['preset'],
): DocxTableInput['tableStyle'] {
  switch (preset) {
    case 'corporate':
      return 'corporate';
    case 'modern':
    case 'dark':
      return 'modern';
    case 'minimal':
    case 'academic':
      return 'minimal';
    case 'classic':
      return 'bordered';
    default:
      return undefined;
  }
}

/**
 * Convert a DocxDocument to StructuredDocument.
 */
export function docxToStructured(doc: DocxDocument): StructuredDocument {
  elementCounter = 0;
  // lint-allow-nondeterministic: perf timer — value lives in stats.extractionTimeMs, never in output bytes
  const startTime = Date.now();

  const pageSize = PAGE_SIZES[doc.pageSize ?? 'a4'] ?? PAGE_SIZES.a4;
  const isLandscape = doc.orientation === 'landscape';
  const dimensions: PageDimensions = {
    width: isLandscape ? pageSize.height : pageSize.width,
    height: isLandscape ? pageSize.width : pageSize.height,
    margins: pageMarginsToPx(doc.margins
      ? { top: doc.margins.top ?? 72, right: doc.margins.right ?? 72, bottom: doc.margins.bottom ?? 72, left: doc.margins.left ?? 72 }
      : DEFAULT_MARGINS),
  };

  // Resolve theme fonts
  const headingFont = doc.theme?.fonts?.heading ?? DEFAULT_FONT;
  const bodyFont = doc.theme?.fonts?.body ?? DEFAULT_FONT;
  const payloadLength = textualPayloadLength(doc.pages);
  const documentSource = JSON.stringify(doc.pages);
  const containsSignatureForm = /signature block|acknowledg(?:e)?ment signature|signed for and on behalf|in witness whereof/i.test(documentSource)
    || (
      /"text":"(?:by|signature):/i.test(documentSource)
      && /"text":"(?:title|its):/i.test(documentSource)
      && /"text":"date:/i.test(documentSource)
    );
  const containsFormalSignoff = /"text":"(?:sincerely|respectfully|very truly yours)[,:]?"/i.test(documentSource);
  if (
    doc.options?.pagination !== 'preserve'
    && doc.margins === undefined
    && payloadLength >= 4_000
    && !containsFormalSignoff
  ) {
    dimensions.margins = pageMarginsToPx({ top: 54, right: 54, bottom: 54, left: 54 });
  }
  const compactTypography = payloadLength >= COMPACT_TYPOGRAPHY_TEXT_THRESHOLD
    || ((containsSignatureForm || containsFormalSignoff) && payloadLength >= AUTO_REFLOW_TEXT_THRESHOLD);
  const conversionTheme: ConversionTheme = {
    bodyFont,
    // Dense reports need compact leading to avoid orphan continuation pages;
    // shorter reports can use a more generous reading rhythm.
    bodyFontSize: compactTypography || payloadLength <= 7_000 ? 10.5 : DEFAULT_FONT_SIZE,
    bodyLineHeight: compactTypography || (!containsFormalSignoff && payloadLength >= 6_000)
      ? 1
      : payloadLength >= 4_000 ? 1.1 : payloadLength <= 7_000 ? 1.25 : 1.15,
    chartDefaultHeight: payloadLength >= AUTO_REFLOW_TEXT_THRESHOLD ? 240 : 320,
    headingFont,
    primaryColor: doc.theme?.colors?.primary,
    secondaryColor: doc.theme?.colors?.secondary,
    accentColor: doc.theme?.colors?.accent,
    defaultTableStyle: defaultTableStyleForTheme(doc.theme?.preset),
    signatureParagraphSpacing: payloadLength >= COMPACT_TYPOGRAPHY_TEXT_THRESHOLD ? 12 : 0,
    signatureRowHeight: payloadLength < 5_000
      ? 130
      : payloadLength >= COMPACT_TYPOGRAPHY_TEXT_THRESHOLD ? 64 : 20,
  };
  const normalizedPages = normalizePages(doc);

  const stats: ExtractionStats = {
    pageCount: normalizedPages.length,
    elementCount: 0,
    elementsByType: {} as Record<ElementType, number>,
    imageCount: 0,
    tableCount: 0,
    chartCount: 0,
    extractionTimeMs: 0,
  };

  const pages: StructuredPage[] = normalizedPages.map((page, index) => {
    // Allow per-page dimension overrides
    let pageDimensions = dimensions;
    if (page.dimensions) {
      const pw = page.dimensions.width === undefined
        ? dimensions.width
        : pointsToPx(page.dimensions.width);
      const ph = page.dimensions.height === undefined
        ? dimensions.height
        : pointsToPx(page.dimensions.height);
      const isLandscapePage = page.dimensions.orientation === 'landscape';
      pageDimensions = {
        width: isLandscapePage ? Math.max(pw, ph) : Math.min(pw, ph),
        height: isLandscapePage ? Math.min(pw, ph) : Math.max(pw, ph),
        margins: dimensions.margins,
      };
    }
    const pageContentWidth = pageDimensions.width - pageDimensions.margins.left - pageDimensions.margins.right;

    const elements = page.elements.flatMap(el =>
      convertElement(el, bodyFont, headingFont, pageContentWidth, stats, conversionTheme)
    );

    const structuredPage: StructuredPage = {
      pageNumber: index + 1,
      dimensions: pageDimensions,
      elements,
    };

    // Section break
    if (page.sectionBreak) {
      structuredPage.sectionBreak = { type: page.sectionBreak };
    }

    const pageHeader = page.header ?? page.headerFooter?.header;
    const pageFooter = page.footer ?? page.headerFooter?.footer;

    // The `firstPageHeader`/`firstPageFooter` schema fields describe the
    // FIRST PAGE OF THE DOCUMENT, not the first page of every section. Each
    // page becomes its own section in the OOXML output, so wiring these
    // unconditionally would make every page render with the title-page
    // header (because every section would have titlePage=true).
    const isFirstDocPage = index === 0;
    const header = convertSectionHeaderFooter(
      pageHeader ?? doc.oddPageHeader ?? doc.header,
      isFirstDocPage && doc.differentFirstPage ? doc.firstPageHeader : undefined,
      doc.evenPageHeader,
      bodyFont,
      headingFont,
      pageContentWidth,
      stats,
      conversionTheme,
    );
    const footer = convertSectionHeaderFooter(
      pageFooter ?? doc.oddPageFooter ?? doc.footer,
      isFirstDocPage && doc.differentFirstPage ? doc.firstPageFooter : undefined,
      doc.evenPageFooter,
      bodyFont,
      headingFont,
      pageContentWidth,
      stats,
      conversionTheme,
    );
    if (header) {
      structuredPage.header = header;
    }
    if (footer) {
      structuredPage.footer = footer;
    }

    return structuredPage;
  });

  // lint-allow-nondeterministic: perf timer — diff against startTime, not written to output
  stats.extractionTimeMs = Date.now() - startTime;

  return {
    __kind: 'StructuredDocument',
    metadata: convertMetadata(doc),
    revisionInfo: doc.revisionInfo as RevisionInfo | undefined,
    pages,
    styles: createEmptyStyles(),
    assets: createEmptyAssets(),
    stats,
    warnings: [],
    toc: doc.tableOfContents || documentHasTocHeading(doc)
      ? (typeof doc.tableOfContents === 'boolean'
        ? { levels: 3 }
        : {
            title: typeof doc.tableOfContents === 'object' ? doc.tableOfContents.title : undefined,
            levels: typeof doc.tableOfContents === 'object' ? doc.tableOfContents.maxLevel ?? 3 : 3,
            showPageNumbers: typeof doc.tableOfContents === 'object' ? doc.tableOfContents.showPageNumbers : undefined,
            hyperlinks: typeof doc.tableOfContents === 'object' ? doc.tableOfContents.hyperlinks : undefined,
            leader: typeof doc.tableOfContents === 'object' ? doc.tableOfContents.leader : undefined,
            position: typeof doc.tableOfContents === 'object' ? doc.tableOfContents.position : undefined,
          })
      : undefined,
  };
}

function documentHasTocHeading(doc: DocxDocument): boolean {
  return doc.pages.some((page) => page.elements.some((element) => {
    if (element.type !== 'heading') {
      return false;
    }
    const heading = element as DocxHeadingInput;
    return typeof heading.text === 'string'
      && heading.text.trim().toLowerCase() === 'table of contents';
  }));
}

// =============================================================================
// ELEMENT CONVERSION
// =============================================================================

function convertElement(
  el: DocxElement,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  theme: ConversionTheme,
): StructuredElement[] {
  stats.elementCount++;
  const type = el.type as ElementType;
  stats.elementsByType[type] = (stats.elementsByType[type] ?? 0) + 1;

  switch (el.type) {
    case 'heading':
      return [convertHeading(el as DocxHeadingInput, headingFont, theme.bodyLineHeight)];
    case 'paragraph':
      return [convertParagraph(el as DocxParagraphInput, bodyFont, theme.bodyFontSize, theme.bodyLineHeight)];
    case 'list':
      return [convertList(el as DocxListInput, bodyFont, theme.bodyFontSize, theme.bodyLineHeight)];
    case 'table':
      stats.tableCount++;
      return [convertTable(el as DocxTableInput, bodyFont, headingFont, pageWidth, stats, theme)];
    case 'image':
      stats.imageCount++;
      return [convertImage(el as DocxImageInput)];
    case 'chart':
      stats.chartCount++;
      return [convertChart(el as DocxChartInput, theme)];
    case 'shape':
      return [convertShape(el as DocxShapeInput)];
    case 'code-block':
      return [convertCodeBlock(el as DocxCodeBlockInput)];
    case 'page-break':
      return [convertPageBreak()];
    case 'divider':
      return [convertDivider(el as DocxDividerInput)];
    case 'container':
      return [convertContainer(el as DocxContainerInput, bodyFont, headingFont, pageWidth, stats, theme)];
    default:
      return [];
  }
}

// =============================================================================
// BASE ELEMENT FACTORY
// =============================================================================

function makeBase(type: ElementType, tagName: string, docxHints?: DOCXHints): BaseElement {
  return {
    id: nextId(),
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
    borderTopWidth: 0, borderTopColor: '000000', borderTopStyle: 'none',
    borderRightWidth: 0, borderRightColor: '000000', borderRightStyle: 'none',
    borderBottomWidth: 0, borderBottomColor: '000000', borderBottomStyle: 'none',
    borderLeftWidth: 0, borderLeftColor: '000000', borderLeftStyle: 'none',
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

function applyBaseStyle(
  base: ComputedStyle,
  style: DocxParagraphInput['style'],
): ComputedStyle {
  if (!style) return base;
  const border = style.border;
  return {
    ...base,
    backgroundColor: style.backgroundColor,
    borderTopWidth: border?.width ?? base.borderTopWidth,
    borderTopColor: border?.color ?? base.borderTopColor,
    borderTopStyle: border?.style ?? base.borderTopStyle,
    borderRightWidth: border?.width ?? base.borderRightWidth,
    borderRightColor: border?.color ?? base.borderRightColor,
    borderRightStyle: border?.style ?? base.borderRightStyle,
    borderBottomWidth: border?.width ?? base.borderBottomWidth,
    borderBottomColor: border?.color ?? base.borderBottomColor,
    borderBottomStyle: border?.style ?? base.borderBottomStyle,
    borderLeftWidth: border?.width ?? base.borderLeftWidth,
    borderLeftColor: border?.color ?? base.borderLeftColor,
    borderLeftStyle: border?.style ?? base.borderLeftStyle,
    paddingTop: style.padding?.top ?? base.paddingTop,
    paddingRight: style.padding?.right ?? base.paddingRight,
    paddingBottom: style.padding?.bottom ?? base.paddingBottom,
    paddingLeft: style.padding?.left ?? base.paddingLeft,
    marginTop: style.margin?.top ?? base.marginTop,
    marginRight: style.margin?.right ?? base.marginRight,
    marginBottom: style.margin?.bottom ?? base.marginBottom,
    marginLeft: style.margin?.left ?? base.marginLeft,
    textAlign: style.textAlign ?? base.textAlign,
    lineHeight: style.lineHeight ?? base.lineHeight,
    opacity: style.opacity ?? base.opacity,
  };
}

// =============================================================================
// INDIVIDUAL ELEMENT CONVERTERS
// =============================================================================

function convertHeading(el: DocxHeadingInput, headingFont: string, bodyLineHeight: number): HeadingElement {
  const text = el.text ?? el.runs?.map((r) => r.text).join('') ?? '';
  const level = normalizeHeadingLevel(el.level);
  const runs = convertRuns(el.runs, el.text, headingFont, headingFontSize(el.level));

  const docxHints: DOCXHints = {
    outlineLevel: level - 1,
    bookmarkId: el.bookmarkId,
    keepNext: el.keepNext ?? true,
    pageBreakBefore: el.pageBreakBefore,
    indent: el.indent,
    footnote: el.footnote,
    endnote: el.endnote,
    comment: el.comment ?? el.style?.comment,
  };

  const base = makeBase('heading', `h${el.level}`, docxHints);
  return {
    ...base,
    style: applyBaseStyle({ ...base.style, lineHeight: bodyLineHeight }, el.style),
    type: 'heading',
    level,
    text,
    runs,
    revision: el.revision ? { ...el.revision } as ParagraphRevision : undefined,
  } as HeadingElement;
}

function convertParagraph(
  el: DocxParagraphInput,
  bodyFont: string,
  bodyFontSize: number,
  bodyLineHeight: number,
): ParagraphElement {
  const text = el.text ?? el.runs?.map((r) => r.text).join('') ?? '';
  const runs = convertRuns(el.runs, el.text, bodyFont, bodyFontSize);

  const docxHints: DOCXHints = {
    keepLines: el.keepLines,
    keepNext: el.keepNext,
    pageBreakBefore: el.pageBreakBefore,
    indent: el.indent,
    footnote: el.footnote,
    endnote: el.endnote,
    comment: el.comment ?? el.style?.comment,
  };

  const base = makeBase('paragraph', 'p', docxHints);
  return {
    ...base,
    style: applyBaseStyle({ ...base.style, lineHeight: bodyLineHeight }, el.style),
    type: 'paragraph',
    text,
    runs,
    revision: el.revision ? { ...el.revision } as ParagraphRevision : undefined,
  } as ParagraphElement;
}

function convertList(
  el: DocxListInput,
  bodyFont: string,
  bodyFontSize: number,
  bodyLineHeight: number,
): ListElement {
  const items: ListItem[] = (el.items ?? []).map((item) => convertListItem(item, bodyFont, bodyFontSize, bodyLineHeight));
  const listType = normalizeListType(el.listType);
  const base = makeBase('list', listType === 'bullet' ? 'ul' : 'ol');
  const rhythmicBase: ComputedStyle = {
    ...base.style,
    lineHeight: bodyLineHeight,
    marginBottom: 0,
  };
  return {
    ...base,
    style: applyBaseStyle(rhythmicBase, el.style as DocxParagraphInput['style']),
    type: 'list',
    dataAttributes: {
      ...base.dataAttributes,
      ...((el as DocxListInput & { __keepLastWithNext?: boolean }).__keepLastWithNext
        ? { 'docx-keep-last-next': 'true' }
        : {}),
    },
    listType,
    start: el.start ?? 1,
    items,
    level: 0,
  } as ListElement;
}

function convertListItem(item: DocxListItemInput, bodyFont: string, bodyFontSize: number, bodyLineHeight: number): ListItem {
  const text = item.text ?? item.runs?.map((r) => r.text).join('') ?? '';
  const content = convertRuns(item.runs, item.text, bodyFont, bodyFontSize);
  return {
    text,
    content,
    nestedList: item.nestedList ? convertList(item.nestedList, bodyFont, bodyFontSize, bodyLineHeight) : undefined,
  };
}

function convertTable(
  el: DocxTableInput,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  theme: ConversionTheme,
): TableElement {
  const tableStyle = el.tableStyle ?? theme.defaultTableStyle;
  const tableSource = JSON.stringify(el);
  const signatureTable = /signature block|acceptance signature/i.test(tableSource)
    || (
      /"text":"by:/i.test(tableSource)
      && /"text":"(?:title|its):/i.test(tableSource)
      && /"text":"date:/i.test(tableSource)
    );
  const documentHistoryTable = /(?:document|revision) history/i.test(el.caption ?? el.tableCaption ?? '');
  // Track per-row column occupancy so that cells in rows shadowed by a prior
  // rowSpan get assigned the correct grid column. Without this, `cell.col`
  // would be the array index (e.g. 1) instead of the post-rowSpan grid
  // position (e.g. 2), and the OOXML serializer's column lookup would drop
  // the cell entirely.
  const occupancy: boolean[][] = [];
  const explicitAlignments = new Set<string>();
  const rows: TableRow[] = (el.rows ?? []).map((row, rowIdx) => {
    if (!occupancy[rowIdx]) occupancy[rowIdx] = [];
    let cursor = 0;
    const cells: TableCell[] = (row.cells ?? []).map((cell) => {
      const rowSpan = cell.rowSpan ?? 1;
      const colSpan = cell.colSpan ?? 1;
      while (occupancy[rowIdx][cursor]) cursor += 1;
      const startCol = cursor;
      for (let r = 0; r < rowSpan; r += 1) {
        const ri = rowIdx + r;
        if (!occupancy[ri]) occupancy[ri] = [];
        for (let c = 0; c < colSpan; c += 1) {
          occupancy[ri][startCol + c] = true;
        }
      }
      cursor += colSpan;
      if (cell.style?.textAlign !== undefined) {
        explicitAlignments.add(`${rowIdx}:${startCol}`);
      }

      const text = cell.text ?? cell.runs?.map((r) => r.text).join('') ?? '';
      const content = convertRuns(cell.runs, cell.text, bodyFont, theme.bodyFontSize);
      const cellStyle: CellStyle = applyTablePreset({
        backgroundColor: cell.style?.backgroundColor,
        color: cell.style?.color,
        fontFamily: cell.style?.fontFamily,
        fontSize: cell.style?.fontSize,
        fontWeight: normalizeFontWeightValue(cell.style?.fontWeight),
        borderTop: cell.style?.borderTop ?? cell.style?.border,
        borderRight: cell.style?.borderRight ?? cell.style?.border,
        borderBottom: cell.style?.borderBottom ?? cell.style?.border,
        borderLeft: cell.style?.borderLeft ?? cell.style?.border,
        padding: cell.style?.padding ?? { top: 2, right: 5, bottom: 2, left: 5 },
        verticalAlign: cell.style?.verticalAlign ?? 'top',
        textAlign: cell.style?.textAlign ?? 'left',
      }, tableStyle, rowIdx, row.isHeader ?? false, theme);
      return {
        row: rowIdx,
        col: startCol,
        rowSpan,
        colSpan,
        text,
        content,
        elements: cell.elements
          ? cell.elements.flatMap((child: DocxElement) => convertElement(child, bodyFont, headingFont, pageWidth, stats, theme))
            .map((nested) => signatureTable
              && theme.signatureParagraphSpacing > 0
              && nested.type === 'paragraph' ? {
              ...nested,
              style: { ...nested.style, lineHeight: 1.2, marginBottom: theme.signatureParagraphSpacing },
            } : nested)
          : undefined,
        style: signatureTable ? {
          ...cellStyle,
          borderBottom: { width: 0.75, color: 'B7B7B7', style: 'solid' },
          verticalAlign: 'middle',
        } : cellStyle,
        isHeader: row.isHeader ?? false,
        revision: cell.revision ? { ...cell.revision } as TableCellRevision : undefined,
      } satisfies TableCell;
    });
    return {
      index: rowIdx,
      height: signatureTable
        ? (row.isHeader ? 30 : theme.signatureRowHeight)
        : documentHistoryTable ? 60 : 20,
      cells,
      isHeader: row.isHeader ?? false,
      isFooter: false,
      revision: row.revision ? { ...row.revision } as TableRowRevision : undefined,
    } satisfies TableRow;
  });

  // Compute content-aware columns. Public DOCX widths are points; the
  // structured layout model stores CSS px.
  const maxCols = Math.max(...rows.map(r => r.cells.reduce(
    (max, cell) => Math.max(max, cell.col + (cell.colSpan ?? 1)),
    0,
  )), 1);
  const columnProfiles = buildColumnProfiles(rows, maxCols);
  const columns = buildTableColumns(el, columnProfiles, pageWidth);
  alignNumericColumns(rows, columnProfiles, explicitAlignments);

  // Build cell matrix for rowspan/colspan tracking
  const headerRowCount = rows.filter(r => r.isHeader).length;
  const cellMatrix = buildCellMatrix(rows);

  return {
    ...makeBase('table', 'table'),
    type: 'table',
    tableStyle,
    columns,
    rows,
    headerRowCount,
    footerRowCount: 0,
    repeatHeaders: el.repeatHeaders ?? true,
    keepTogether: el.keepTogether ?? (documentHistoryTable ? true : undefined),
    keepWithNext: el.keepWithNext,
    cellMatrix,
    caption: el.caption,
    tableDescription: el.tableDescription,
    tableCaption: el.tableCaption,
    revision: el.revision ? { ...el.revision } as TableRevision : undefined,
  } as TableElement;
}

const PRESET_BORDER = { width: 0.5, color: 'B7C9D6', style: 'solid' as const };
const MINIMAL_RULE = { width: 1, color: '7F8C8D', style: 'solid' as const };

function applyTablePreset(
  style: CellStyle,
  preset: DocxTableInput['tableStyle'],
  rowIndex: number,
  isHeader: boolean,
  theme: ConversionTheme,
): CellStyle {
  if (!preset || preset === 'bordered') return style;

  const result = { ...style };
  if (preset === 'striped') {
    if (isHeader) result.backgroundColor ??= 'D9EAF7';
    else if (rowIndex % 2 === 0) result.backgroundColor ??= 'F2F6F8';
  } else if (preset === 'modern') {
    if (isHeader) {
      result.backgroundColor ??= theme.primaryColor ?? '1F4E79';
      result.color ??= 'FFFFFF';
      result.fontWeight ??= 'bold';
    }
    result.borderBottom ??= PRESET_BORDER;
  } else if (preset === 'minimal') {
    if (isHeader) {
      result.fontWeight ??= 'bold';
      result.borderBottom ??= MINIMAL_RULE;
    }
  } else if (preset === 'corporate') {
    if (isHeader) {
      result.backgroundColor ??= theme.primaryColor ?? '2F5597';
      result.color ??= 'FFFFFF';
      result.fontWeight ??= 'bold';
    } else if (rowIndex % 2 === 0) {
      result.backgroundColor ??= tintColor(
        theme.secondaryColor ?? theme.accentColor ?? theme.primaryColor ?? '2F5597',
        0.82,
      );
    }
  }
  return result;
}

interface ColumnProfile {
  numeric: boolean;
  compact: boolean;
  weight: number;
}

function buildColumnProfiles(rows: TableRow[], columnCount: number): ColumnProfile[] {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const bodyTexts = rows
      .filter((row) => !row.isHeader)
      .flatMap((row) => row.cells
        .filter((cell) => cell.colSpan === 1 && cell.col === columnIndex)
        .map((cell) => cell.text.trim()))
      .filter(Boolean);
    const allTexts = rows.flatMap((row) => row.cells
      .filter((cell) => cell.colSpan === 1 && cell.col === columnIndex)
      .map((cell) => cell.text.trim()))
      .filter(Boolean);
    const numericCount = bodyTexts.filter(isNumericText).length;
    const numeric = bodyTexts.length > 0 && numericCount / bodyTexts.length >= 0.6;
    const maxLength = Math.max(1, ...allTexts.map((text) => text.length));
    const compact = numeric || (maxLength <= 16 && allTexts.every((text) => !text.includes('\n')));
    const weight = numeric
      ? Math.min(1.15, 0.72 + maxLength / 45)
      : compact
        ? Math.min(1.35, 0.85 + maxLength / 35)
        : Math.min(4, 1.15 + Math.sqrt(maxLength) / 3);
    return { numeric, compact, weight };
  });
}

function buildTableColumns(
  el: DocxTableInput,
  profiles: ColumnProfile[],
  pageWidth: number,
): TableColumn[] {
  if ((el.columns?.length ?? 0) > 0) {
    const explicit = el.columns ?? [];
    return profiles.map((_, index) => ({
      width: explicit[index]?.width !== undefined
        ? explicit[index].width / 0.75
        : pageWidth / profiles.length,
    }));
  }

  const minWidths = profiles.map((profile) => profile.numeric ? 54 : profile.compact ? 64 : 84);
  const minTotal = minWidths.reduce((sum, width) => sum + width, 0);
  if (minTotal >= pageWidth) {
    return minWidths.map((width) => ({ width: width * pageWidth / minTotal }));
  }
  const remaining = pageWidth - minTotal;
  const weightTotal = profiles.reduce((sum, profile) => sum + profile.weight, 0) || 1;
  return profiles.map((profile, index) => ({
    width: minWidths[index] + remaining * profile.weight / weightTotal,
  }));
}

function alignNumericColumns(
  rows: TableRow[],
  profiles: ColumnProfile[],
  explicitAlignments: Set<string>,
): void {
  for (const row of rows) {
    for (const cell of row.cells) {
      if (
        cell.colSpan === 1
        && profiles[cell.col]?.numeric
        && !explicitAlignments.has(`${row.index}:${cell.col}`)
      ) {
        cell.style = { ...cell.style, textAlign: 'right' };
      }
    }
  }
}

function isNumericText(value: string): boolean {
  const normalized = value
    .trim()
    .replace(/[,$€£¥₩\s]/g, '')
    .replace(/^\((.*)\)$/, '-$1')
    .replace(/%$/, '');
  return normalized !== '' && /^[-+]?\d+(?:\.\d+)?(?:[KMB])?$/i.test(normalized);
}

function tintColor(color: string, whiteRatio: number): string {
  const normalized = color.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return 'DCE6F1';
  const ratio = Math.max(0, Math.min(1, whiteRatio));
  return [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * ratio).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

function convertImage(el: DocxImageInput): ImageElement {
  const dataAttributes: Record<string, string> = {};
  if (el.floating) {
    dataAttributes['docx-position'] = 'floating';
    if (el.floating.wrap) dataAttributes['docx-wrap'] = el.floating.wrap;
    if (el.floating.position) dataAttributes['docx-horizontal'] = el.floating.position;
    if (el.floating.horizontalPosition !== undefined) dataAttributes['docx-horizontal'] = String(el.floating.horizontalPosition);
    if (el.floating.verticalPosition !== undefined) dataAttributes['docx-vertical'] = String(el.floating.verticalPosition);
  }

  return {
    ...makeBase('image', 'img'),
    type: 'image',
    src: Buffer.isBuffer(el.src) ? 'buffer-image' : el.src,
    binaryData: Buffer.isBuffer(el.src) ? Buffer.from(el.src) : undefined,
    alt: el.alt ?? '',
    naturalWidth: el.width === undefined ? undefined : pointsToPx(el.width),
    naturalHeight: el.height === undefined ? undefined : pointsToPx(el.height),
    decorative: el.decorative,
    position: {
      x: 0,
      y: 0,
      width: el.width === undefined ? 400 : pointsToPx(el.width),
      height: el.height === undefined ? 300 : pointsToPx(el.height),
    },
    dataAttributes,
  } as ImageElement;
}

function convertChart(el: DocxChartInput, theme: ConversionTheme): ChartElement {
  const base = makeBase('chart', 'div');
  return {
    ...base,
    type: 'chart',
    chartType: el.chartType,
    title: el.title,
    series: el.series ?? [],
    categories: el.categories,
    legend: el.legend,
    axes: el.axes ? { xAxis: el.axes.x, yAxis: el.axes.y } : undefined,
    embedData: true,
    position: {
      x: 0,
      y: 0,
      width: el.width === undefined ? 500 : pointsToPx(el.width),
      height: el.height === undefined ? theme.chartDefaultHeight : pointsToPx(el.height),
    },
    style: {
      ...base.style,
      fontFamily: theme.bodyFont,
    },
  } as ChartElement;
}

function convertShape(el: DocxShapeInput): ShapeElement {
  return {
    ...makeBase('shape', 'div'),
    type: 'shape',
    shapeType: el.shapeType,
    fill: el.fill,
    stroke: el.stroke,
    text: el.text,
    runs: el.runs ? convertRuns(el.runs, undefined, DEFAULT_FONT, DEFAULT_FONT_SIZE) : undefined,
    position: {
      x: 0,
      y: 0,
      width: pointsToPx(el.width),
      height: pointsToPx(el.height),
    },
  } as ShapeElement;
}

function convertCodeBlock(el: DocxCodeBlockInput): CodeBlockElement {
  return {
    ...makeBase('code-block', 'pre'),
    type: 'code-block',
    code: el.code ?? '',
    language: el.language,
    showLineNumbers: el.showLineNumbers,
    style: {
      ...defaultComputedStyle(),
      fontFamily: 'Consolas',
      fontSize: 9,
      lineHeight: 1,
      backgroundColor: 'F5F5F5',
    },
  } as CodeBlockElement;
}

function convertPageBreak(): PageBreakElement {
  return {
    ...makeBase('page-break', 'div', { pageBreakBefore: true }),
    type: 'page-break',
  } as PageBreakElement;
}

function convertDivider(el: DocxDividerInput): DividerElement {
  return {
    ...makeBase('divider', 'hr'),
    type: 'divider',
    styleType: el.style ?? 'solid',
    color: el.color ?? 'CCCCCC',
    thickness: el.thickness ?? 1,
    style: {
      ...defaultComputedStyle(),
      borderBottomWidth: el.thickness ?? 1,
      borderBottomColor: el.color ?? 'CCCCCC',
      borderBottomStyle: el.style ?? 'solid',
    },
  } as DividerElement;
}

function convertContainer(
  el: DocxContainerInput,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  theme: ConversionTheme,
): ContainerElement {
  const containerSource = JSON.stringify(el.children ?? []);
  const signatureBlock = el.keepTogether === true
    && (
      /signed for and on behalf|in witness whereof/i.test(containerSource)
      || (
        /"text":"by:/i.test(containerSource)
        && /"text":"title:/i.test(containerSource)
        && /"text":"date:/i.test(containerSource)
      )
    );
  const children = (el.children ?? []).flatMap((child: DocxElement) => {
    const converted = convertElement(child, bodyFont, headingFont, pageWidth, stats, theme);
    if (signatureBlock && child.type === 'divider') {
      return converted.map((element) => element.type === 'divider' ? {
        ...element,
        // Legal execution blocks conventionally sit in the lower signing zone.
        // Reserve that visual pause before the rule instead of leaving one
        // accidental void after the signatures at the bottom of the page.
        style: { ...element.style, marginTop: 130, marginBottom: 16 },
      } : element);
    }
    if (signatureBlock && child.type === 'table') {
      return converted.map((element) => element.type === 'table' ? {
        ...element,
        rows: element.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            elements: cell.elements?.map((nested) => nested.type === 'paragraph' ? {
              ...nested,
              style: { ...nested.style, lineHeight: 1.2, marginBottom: 48 },
            } : nested),
          })),
        })),
      } : element);
    }
    return converted;
  });
  return {
    ...makeBase('container', 'div'),
    type: 'container',
    keepTogether: el.keepTogether,
    children,
    layout: {
      type: el.layout === 'horizontal' ? 'flex' : el.layout === 'grid' ? 'grid' : 'block',
      flexDirection: el.layout === 'horizontal' ? 'row' : undefined,
      childrenLayout: el.layout === 'horizontal' ? 'horizontal' : 'vertical',
      columnCount: el.columns,
      flexGap: el.gap,
    },
  } as ContainerElement;
}

// =============================================================================
// HELPERS
// =============================================================================

function convertRuns(
  runs: DocxTextRun[] | undefined,
  fallbackText: string | undefined,
  defaultFont: string,
  defaultSize: number,
): TextRun[] {
  if (runs && runs.length > 0) {
    return runs.map(r => ({
      text: r.text,
      fontFamily: r.style?.fontFamily ?? defaultFont,
      fontSize: r.style?.fontSize ?? defaultSize,
      fontWeight: r.style?.fontWeight ?? 'normal',
      fontStyle: r.style?.fontStyle ?? 'normal',
      textDecoration: r.style?.textDecoration ?? 'none',
      color: r.style?.color ?? DEFAULT_COLOR,
      backgroundColor: r.style?.backgroundColor,
      link: r.hyperlink,
      superscript: r.style?.superscript,
      subscript: r.style?.subscript,
      revision: r.revision ? {
        type: r.revision.type,
        id: r.revision.id,
        author: r.revision.author,
        date: r.revision.date,
        beforeStyle: r.revision.beforeStyle ? { ...r.revision.beforeStyle } : undefined,
      } : undefined,
    }));
  }
  if (fallbackText) {
    return [{
      text: fallbackText,
      fontFamily: defaultFont,
      fontSize: defaultSize,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: DEFAULT_COLOR,
    }];
  }
  return [];
}

function convertHeaderFooter(
  def: HeaderFooterDef,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  theme: ConversionTheme,
): HeaderFooterContent {
  const elements: StructuredElement[] = [];

  if (def.text || (def.includePageNumber && !def.content)) {
    const text = def.includePageNumber
      ? `${def.text ? `${def.text} ` : ''}{PAGE} of {NUMPAGES}`
      : def.text!;
    elements.push(convertParagraph({ type: 'paragraph', text, style: def.style }, bodyFont, theme.bodyFontSize, theme.bodyLineHeight));
  }
  if (def.content) {
    for (const el of def.content) {
      elements.push(...convertElement(el as DocxElement, bodyFont, headingFont, pageWidth, stats, theme));
    }
  }
  if (def.includePageNumber && def.content) {
    elements.push(convertParagraph({ type: 'paragraph', text: '{PAGE} of {NUMPAGES}' }, bodyFont, theme.bodyFontSize, theme.bodyLineHeight));
  }

  return { elements };
}

function convertSectionHeaderFooter(
  defaultDef: HeaderFooterDef | undefined,
  firstDef: HeaderFooterDef | undefined,
  evenDef: HeaderFooterDef | undefined,
  bodyFont: string,
  headingFont: string,
  pageWidth: number,
  stats: ExtractionStats,
  theme: ConversionTheme,
): HeaderFooterContent | undefined {
  if (!defaultDef && !firstDef && !evenDef) {
    return undefined;
  }

  const defaultContent = defaultDef
    ? convertHeaderFooter(defaultDef, bodyFont, headingFont, pageWidth, stats, theme)
    : { elements: [] };
  return {
    elements: defaultContent.elements,
    firstElements: firstDef
      ? convertHeaderFooter(firstDef, bodyFont, headingFont, pageWidth, stats, theme).elements
      : undefined,
    evenElements: evenDef
      ? convertHeaderFooter(evenDef, bodyFont, headingFont, pageWidth, stats, theme).elements
      : undefined,
    differentFirst: !!firstDef,
    differentOddEven: !!evenDef,
  };
}

function convertMetadata(doc: DocxDocument): DocumentMetadata {
  return {
    title: doc.metadata?.title,
    author: doc.metadata?.author,
    subject: doc.metadata?.subject,
    keywords: doc.metadata?.keywords,
    creator: doc.metadata?.creator ?? '@runstamp/docx',
    custom: doc.metadata?.custom,
    language: doc.metadata?.language,
  };
}

function normalizeHeadingLevel(level: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5 || level === 6) {
    return level;
  }
  return 6;
}

function normalizeListType(value: DocxListInput['listType']): ListElement['listType'] {
  switch (value) {
    case 'number':
    case 'letter':
    case 'roman':
      return value;
    case 'bullet':
    default:
      return 'bullet';
  }
}

function normalizeFontWeightValue(value: string | number | undefined): string | undefined {
  return typeof value === 'number' ? String(value) : value;
}

function headingFontSize(level: number): number {
  const sizes: Record<number, number> = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 11 };
  return sizes[level] ?? 11;
}

function buildCellMatrix(rows: TableRow[]): CellReference[][] {
  if (rows.length === 0) return [];
  const maxCols = Math.max(...rows.map(r => r.cells.reduce((s, c) => s + c.colSpan, 0)));
  const matrix: CellReference[][] = rows.map(() => new Array(maxCols));

  for (const row of rows) {
    let col = 0;
    for (const cell of row.cells) {
      // Find next available column
      while (col < maxCols && matrix[row.index]?.[col]) col++;
      // Fill matrix
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
