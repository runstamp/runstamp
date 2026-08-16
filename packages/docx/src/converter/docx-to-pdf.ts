import type {
  DocxDocument,
  HeaderFooterDef,
} from "../schema.js";
import { generateChartSVG } from "../elements/charts/chart-image-generator.js";
import { generateShapeSVG } from "../elements/shapes/shape-generator.js";
import type {
  CellStyle,
  ChartElement,
  HeaderFooterContent,
  ImageElement,
  ListElement,
  ShapeElement,
  StructuredDocument,
  StructuredElement,
  StructuredPage,
  TableCell,
  TableElement,
  TextRun,
} from "../types.js";

const HEADER_FOOTER_MIN_MARGIN = 54;
const DEFAULT_TEXT_COLOR = "#111111";
const DEFAULT_FIGURE_SIZE = 180;
const DEFAULT_CODE_BLOCK_WIDTH = 468;
const DEFAULT_CODE_BLOCK_LINE_HEIGHT = 14;
const MAX_COLUMN_COUNT = 3;
const DEFAULT_FLOATING_TOP = 12;
const EMUS_PER_POINT = 12700;

type LooseDocxElement = Record<string, any>;
type LooseDocxPage = {
  elements: LooseDocxElement[];
  footer?: HeaderFooterDef;
  header?: HeaderFooterDef;
};

type PdfColor = string;

interface PdfPhase3Style {
  alignItems?: "center" | "flex-end" | "flex-start" | "stretch";
  bottom?: number;
  columnGap?: number;
  flexDirection?: "column" | "row";
  flexGrow?: number;
  gap?: number;
  height?: number | string;
  left?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  position?: "absolute" | "relative";
  right?: number;
  top?: number;
  width?: number | string;
}

interface PdfPhase3ExternalLink {
  kind: "external";
  url: string;
}

interface PdfPhase3InternalLink {
  kind: "internal";
  target: string;
}

type PdfPhase3Link = PdfPhase3ExternalLink | PdfPhase3InternalLink;

interface PdfPhase5Border {
  color: PdfColor;
  style?: "dashed" | "dotted" | "double" | "none" | "solid";
  width?: number;
}

interface PdfPhase5CellStyle {
  backgroundColor?: PdfColor;
  borderBottom?: PdfPhase5Border;
  borderLeft?: PdfPhase5Border;
  borderRight?: PdfPhase5Border;
  borderTop?: PdfPhase5Border;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  verticalAlign?: "bottom" | "middle" | "top";
}

interface PdfParagraphNode {
  font?: string;
  fontSize?: number;
  id?: string;
  lang?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  lineHeight?: number;
  link?: PdfPhase3Link;
  style?: PdfPhase3Style;
  text?: string;
  textAlign?: "center" | "justify" | "left" | "right";
  type: "heading" | "paragraph";
  value?: string;
}

interface PdfContainerNode {
  children: PdfPhase7DocumentNode[];
  id?: string;
  lang?: string;
  style?: PdfPhase3Style;
  type: "container";
}

type PdfPhase5CellContentNode = PdfContainerNode | PdfParagraphNode | PdfPhase5TableNode;

interface PdfPhase5TableCell {
  children: PdfPhase5CellContentNode[];
  colSpan?: number;
  role?: "td" | "th";
  rowSpan?: number;
  style?: PdfPhase5CellStyle;
}

interface PdfPhase5TableRow {
  cells: PdfPhase5TableCell[];
}

interface PdfPhase5TableColumn {
  maxWidth?: number;
  minWidth?: number;
  width?: number | string;
}

interface PdfPhase5TableNode {
  body: PdfPhase5TableRow[];
  borderCollapse?: "collapse";
  columns?: PdfPhase5TableColumn[];
  header?: PdfPhase5TableRow[];
  type: "table";
}

interface PdfRectGraphic {
  fill?: { color: PdfColor | { b: number; g: number; r: number; space: "rgb" }; opacity?: number; space: "solid" };
  height: number;
  layer?: "background" | "foreground";
  radius?: number;
  stroke?: { color: PdfColor | { b: number; g: number; r: number; space: "rgb" }; width?: number };
  type: "rect";
  width: number;
  x: number;
  y: number;
}

interface PdfLineGraphic {
  layer?: "background" | "foreground";
  stroke: { color: PdfColor | { b: number; g: number; r: number; space: "rgb" }; width?: number };
  type: "line";
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

interface PdfImageGraphic {
  format?: "jpeg" | "png";
  height: number;
  layer?: "background" | "foreground";
  opacity?: number;
  source: string;
  type: "image";
  width: number;
  x: number;
  y: number;
}

interface PdfSvgGraphic {
  height: number;
  layer?: "background" | "foreground";
  opacity?: number;
  source: string;
  type: "svg";
  width: number;
  x: number;
  y: number;
}

type PdfGraphic = PdfImageGraphic | PdfLineGraphic | PdfRectGraphic | PdfSvgGraphic;

interface PdfPhase7FigureNode {
  alt: string;
  format?: "jpeg" | "png";
  height: number;
  source: string;
  style?: PdfPhase3Style;
  type: "figure";
  width: number | string;
}

interface PdfPhase7GraphicNode {
  alt?: string;
  graphic: PdfGraphic;
  style?: PdfPhase3Style;
  type: "graphic";
}

type PdfPhase7DocumentNode =
  | PdfContainerNode
  | PdfParagraphNode
  | PdfPhase5TableNode
  | PdfPhase7FigureNode
  | PdfPhase7GraphicNode;

interface PdfDocumentPhase7 {
  accessibility?: {
    lang?: string;
    tagged?: boolean;
  };
  bookmarks?: {
    fromHeadings?: boolean;
  };
  children?: PdfPhase7DocumentNode[];
  meta?: {
    author?: string;
    creator?: string;
    keywords?: string[];
    subject?: string;
    title?: string;
  };
  page?: {
    margin?: {
      bottom: number;
      left: number;
      right: number;
      top: number;
    };
    size?: "A4" | "Letter" | "a4" | "letter" | { height: number; width: number };
  };
}

interface FootnoteEntry {
  marker: number;
  text: string;
}

interface FootnoteRegion {
  node: PdfPhase7DocumentNode;
  reservedHeight: number;
}

interface ConversionContext {
  footnotes: FootnoteEntry[];
  lang?: string;
  warnings: string[];
}

export interface PdfSectionOverlay {
  footerText?: string;
  footerUsesPageNumber?: boolean;
  headerText?: string;
  headerUsesPageNumber?: boolean;
  pageNumberFormat?: HeaderFooterDef["pageNumberFormat"];
  watermarkImage?: string;
  watermarkOpacity?: number;
  watermarkRotation?: number;
  watermarkText?: string;
}

export interface PdfSectionDescriptor {
  document: PdfDocumentPhase7;
  overlay: PdfSectionOverlay;
}

export interface PdfConversionResult {
  sections: PdfSectionDescriptor[];
  warnings: string[];
}

export function convertDocxDocumentToPdf(
  doc: DocxDocument,
  structured: StructuredDocument,
): PdfConversionResult {
  const warnings: string[] = [];
  const accessible = Boolean(doc.accessible);
  const columnCount = Math.min(doc.options?.columns ?? 1, MAX_COLUMN_COUNT);
  const sections = doc.pages.map((page, index) =>
    buildPdfSectionFromDocxPage({
      accessible,
      columnCount,
      defaultFooter: doc.footer,
      defaultHeader: doc.header,
      firstPageFooter: doc.differentFirstPage && index === 0 ? doc.firstPageFooter : undefined,
      firstPageHeader: doc.differentFirstPage && index === 0 ? doc.firstPageHeader : undefined,
      page: page as LooseDocxPage,
      pageIndex: index,
      structured,
      structuredPage: structured.pages[index],
      warnings,
      watermark: doc.watermark,
    }),
  );

  return { sections, warnings };
}

export function convertStructuredDocumentToPdf(
  structured: StructuredDocument,
): PdfConversionResult {
  const warnings: string[] = [];
  const sections = structured.pages.map((page) =>
    buildPdfSectionFromStructuredPage(page, structured, warnings),
  );

  return { sections, warnings };
}

function buildPdfSectionFromDocxPage(args: {
  accessible?: boolean;
  columnCount?: number;
  defaultFooter?: HeaderFooterDef;
  defaultHeader?: HeaderFooterDef;
  firstPageFooter?: HeaderFooterDef;
  firstPageHeader?: HeaderFooterDef;
  page: LooseDocxPage;
  pageIndex: number;
  structured: StructuredDocument;
  structuredPage?: StructuredPage;
  watermark?: DocxDocument["watermark"];
  warnings: string[];
}): PdfSectionDescriptor {
  const { page, structured, structuredPage } = args;
  const effectiveHeader = args.firstPageHeader ?? page.header ?? args.defaultHeader;
  const effectiveFooter = args.firstPageFooter ?? page.footer ?? args.defaultFooter;
  const overlay = {
    footerText: headerFooterToText(effectiveFooter),
    footerUsesPageNumber: effectiveFooter?.includePageNumber === true,
    headerText: headerFooterToText(effectiveHeader),
    headerUsesPageNumber: effectiveHeader?.includePageNumber === true,
    pageNumberFormat: effectiveFooter?.pageNumberFormat ?? effectiveHeader?.pageNumberFormat,
    watermarkImage: typeof args.watermark === "object" ? args.watermark.image : undefined,
    watermarkOpacity: typeof args.watermark === "object" ? args.watermark.opacity : undefined,
    watermarkRotation: typeof args.watermark === "object" ? args.watermark.rotation : undefined,
    watermarkText: typeof args.watermark === "string" ? args.watermark : args.watermark?.text,
  } satisfies PdfSectionOverlay;

  const context: ConversionContext = {
    footnotes: [],
    lang: structured.metadata.language,
    warnings: args.warnings,
  };
  const content = convertDocxElements(page.elements, context);
  const footnoteRegion = createFootnoteRegion(context);
  const accessibility = structured.metadata.language || args.accessible
    ? {
        lang: structured.metadata.language,
        tagged: Boolean(args.accessible),
      }
    : undefined;
  const body = args.columnCount && args.columnCount > 1 ? applyColumnLayout(content, args.columnCount) : content;
  const children = footnoteRegion ? [...body, footnoteRegion.node] : body;

  return {
    document: {
      accessibility,
      bookmarks: { fromHeadings: true },
      children,
      meta: {
        author: structured.metadata.author,
        creator: structured.metadata.creator,
        keywords: structured.metadata.keywords,
        subject: structured.metadata.subject,
        title: structured.metadata.title,
      },
      page: {
        margin: resolvePageMargins(structuredPage, overlay, footnoteRegion?.reservedHeight ?? 0),
        size: resolvePageSize(structuredPage),
      },
    },
    overlay,
  };
}

function buildPdfSectionFromStructuredPage(
  page: StructuredPage,
  structured: StructuredDocument,
  warnings: string[],
): PdfSectionDescriptor {
  const overlay = {
    footerText: flattenHeaderFooterContent(page.footer),
    headerText: flattenHeaderFooterContent(page.header),
  } satisfies PdfSectionOverlay;

  const context: ConversionContext = {
    footnotes: [],
    lang: structured.metadata.language,
    warnings,
  };
  const content = convertStructuredElements(page.elements, context);
  const footnoteRegion = createFootnoteRegion(context);
  const accessibility = structured.metadata.language
    ? { lang: structured.metadata.language, tagged: false }
    : undefined;

  return {
    document: {
      accessibility,
      bookmarks: { fromHeadings: true },
      children: footnoteRegion ? [...content, footnoteRegion.node] : content,
      meta: {
        author: structured.metadata.author,
        creator: structured.metadata.creator,
        keywords: structured.metadata.keywords,
        subject: structured.metadata.subject,
        title: structured.metadata.title,
      },
      page: {
        margin: resolvePageMargins(page, overlay, footnoteRegion?.reservedHeight ?? 0),
        size: resolvePageSize(page),
      },
    },
    overlay,
  };
}

function resolvePageMargins(page: StructuredPage | undefined, overlay: PdfSectionOverlay, reservedBottom: number = 0) {
  const margins = page?.dimensions.margins ?? { top: 72, right: 72, bottom: 72, left: 72 };
  return {
    top: overlay.headerText ? Math.max(margins.top, HEADER_FOOTER_MIN_MARGIN) : margins.top,
    right: margins.right,
    bottom: (overlay.footerText || overlay.pageNumberFormat
      ? Math.max(margins.bottom, HEADER_FOOTER_MIN_MARGIN)
      : margins.bottom) + reservedBottom,
    left: margins.left,
  };
}

function resolvePageSize(page: StructuredPage | undefined) {
  return page?.dimensions
    ? { height: page.dimensions.height, width: page.dimensions.width }
    : "Letter";
}

function convertDocxElements(elements: LooseDocxElement[], context: ConversionContext): PdfPhase7DocumentNode[] {
  const nodes: PdfPhase7DocumentNode[] = [];

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];

    if (
      element.type === "image" &&
      ["square", "tight", "through"].includes(element.floating?.wrap ?? "")
    ) {
      const wrappedTextElements = collectFollowingWrapTextElements(elements, index + 1);
      if (wrappedTextElements.length > 0) {
        nodes.push(convertWrappedImageGroup(element, wrappedTextElements, context));
        index += wrappedTextElements.length;
        continue;
      }
    }

    nodes.push(...convertDocxElement(element, context));
  }

  return nodes;
}

function convertStructuredElements(elements: StructuredElement[], context: ConversionContext): PdfPhase7DocumentNode[] {
  return elements.flatMap((element) => convertStructuredElement(element, context));
}

/**
 * Report an element the PDF bridge cannot express.
 *
 * The `default` arms below returned `[]`, so an unhandled element vanished from
 * the PDF while the render reported success — plausible output with nothing in
 * the ledger, which is exactly the condition OC-1 C11 exists to catch. The
 * warnings array was already threaded through every converter and never written
 * to; this is the write.
 */
function reportDroppedElement(
  element: { type?: string },
  context: ConversionContext,
): PdfPhase7DocumentNode[] {
  context.warnings.push(
    `Element of type "${String(element.type ?? "unknown")}" has no PDF equivalent and was omitted.`,
  );
  return [];
}

function convertDocxElement(element: LooseDocxElement, context: ConversionContext): PdfPhase7DocumentNode[] {
  switch (element.type) {
    case "heading":
      return [createTextNode("heading", withFootnoteMarker(
        textFromDocxText(element.text, element.runs),
        registerFootnote(context, element.footnote),
      ), {
        id: element.bookmarkId,
        lang: context.lang,
        level: element.level,
        link: resolveDocxRunLink(element.runs),
        style: element.style,
      })];
    case "paragraph":
      return [createTextNode("paragraph", withFootnoteMarker(
        textFromDocxText(element.text, element.runs),
        registerFootnote(context, element.footnote),
      ), {
        lang: context.lang,
        link: resolveDocxRunLink(element.runs),
        style: element.style,
      })];
    case "list":
      return convertDocxListToParagraphs(element, context);
    case "table":
      return [convertDocxTable(element)];
    case "image":
      return convertDocxImage(element, context);
    case "container":
      return [{
        children: convertDocxElements(element.children ?? [], context),
        style: {
          flexDirection: element.layout === "horizontal" ? "row" : "column",
          gap: element.gap,
        },
        type: "container",
      }];
    case "chart":
      return [convertChartToGraphic(element)];
    case "shape":
      return [convertShapeToGraphic(element)];
    case "code-block":
      return [convertCodeBlockElement(element)];
    case "page-break":
      return [];
    case "divider":
      return [createDividerGraphic()];
    default:
      return reportDroppedElement(element, context);
  }
}

function convertStructuredElement(element: StructuredElement, context: ConversionContext): PdfPhase7DocumentNode[] {
  switch (element.type) {
    case "heading":
      return [createTextNode("heading", withFootnoteMarker(
        textFromRuns(element.runs, element.text),
        registerFootnote(context, element.docx?.footnote),
      ), {
        id: element.docx?.bookmarkId,
        lang: context.lang,
        level: element.level,
        link: resolveStructuredRunLink(element.runs),
        style: {
          lineHeight: element.style.lineHeight,
          textAlign: element.style.textAlign,
        },
      })];
    case "paragraph":
    case "text-run":
      return [createTextNode("paragraph", withFootnoteMarker(
        textFromRuns(element.runs, element.text),
        registerFootnote(context, element.docx?.footnote),
      ), {
        lang: context.lang,
        link: resolveStructuredRunLink(element.runs),
        style: {
          lineHeight: element.style.lineHeight,
          textAlign: element.style.textAlign,
        },
      })];
    case "list":
      return convertStructuredListToParagraphs(element, context);
    case "table":
      return [convertStructuredTable(element)];
    case "image":
      return [convertStructuredImage(element)];
    case "container":
      return [{
        children: convertStructuredElements(element.children, context),
        style: {
          flexDirection: element.layout?.flexDirection === "row" ? "row" : "column",
          gap: element.layout?.flexGap,
        },
        type: "container",
      }];
    case "chart":
      return [convertChartToGraphic(element)];
    case "shape":
      return [convertShapeToGraphic(element)];
    default:
      return reportDroppedElement(element, context);
  }
}

function convertDocxListToParagraphs(list: LooseDocxElement, context: ConversionContext): PdfPhase7DocumentNode[] {
  return flattenDocxList(list, 0, context);
}

function flattenDocxList(list: LooseDocxElement, level: number, context: ConversionContext): PdfPhase7DocumentNode[] {
  const nodes: PdfPhase7DocumentNode[] = [];

  for (let index = 0; index < (list.items ?? []).length; index += 1) {
    const item = list.items[index];
    const marker = listMarker(list.listType ?? "bullet", (list.start ?? 1) + index);
    nodes.push(createTextNode("paragraph", `${marker} ${textFromDocxText(item.text, item.runs)}`, {
      lang: context.lang,
      link: resolveDocxRunLink(item.runs),
      style: { marginLeft: Math.min(level, 8) * 18 },
    }));
    if (item.nestedList) {
      nodes.push(...flattenDocxList(item.nestedList, level + 1, context));
    }
  }

  return nodes;
}

function convertStructuredListToParagraphs(list: ListElement, context: ConversionContext): PdfPhase7DocumentNode[] {
  return flattenStructuredList(list, list.level ?? 0, context);
}

function flattenStructuredList(list: ListElement, level: number, context: ConversionContext): PdfPhase7DocumentNode[] {
  const nodes: PdfPhase7DocumentNode[] = [];

  for (let index = 0; index < list.items.length; index += 1) {
    const item = list.items[index];
    const marker = listMarker(list.listType, list.start + index);
    nodes.push(createTextNode("paragraph", `${marker} ${textFromRuns(item.content, item.text)}`, {
      lang: context.lang,
      link: resolveStructuredRunLink(item.content),
      style: { marginLeft: Math.min(level, 8) * 18 },
    }));
    if (item.nestedList) {
      nodes.push(...flattenStructuredList(item.nestedList, level + 1, context));
    }
  }

  return nodes;
}

function convertDocxTable(table: LooseDocxElement): PdfPhase5TableNode {
  const rows = (table.rows as Array<{ cells: any[]; isHeader?: boolean }>).map((row) => ({
    cells: row.cells.map((cell) => convertDocxTableCell(cell, row.isHeader === true)),
  }));

  const headerCount = rows.findIndex((row) => row.cells.some((cell) => cell.role !== "th"));
  const headerRows = headerCount > 0
    ? rows.slice(0, headerCount)
    : rows.filter((row) => row.cells.every((cell) => cell.role === "th"));
  const bodyRows = headerRows.length > 0 ? rows.slice(headerRows.length) : rows;

  return {
    body: bodyRows.length > 0 ? bodyRows : rows,
    borderCollapse: "collapse",
    columns: resolveDocxTableColumns(table),
    header: headerRows.length > 0 ? headerRows : undefined,
    type: "table",
  };
}

function convertStructuredTable(table: TableElement): PdfPhase5TableNode {
  const header = table.rows.filter((row) => row.isHeader).map((row) => ({
    cells: row.cells.map((cell) => convertStructuredTableCell(cell)),
  }));
  const body = table.rows.filter((row) => !row.isHeader).map((row) => ({
    cells: row.cells.map((cell) => convertStructuredTableCell(cell)),
  }));

  return {
    body: body.length > 0 ? body : header,
    borderCollapse: "collapse",
    columns: table.columns.map((column) => ({
      maxWidth: column.maxWidth,
      minWidth: column.minWidth,
      width: column.width,
    })),
    header: header.length > 0 ? header : undefined,
    type: "table",
  };
}

function convertDocxTableCell(
  cell: { colSpan?: number; rowSpan?: number; runs?: Array<{ hyperlink?: string; text: string }>; style?: { [key: string]: unknown }; text?: string },
  isHeader: boolean,
): PdfPhase5TableCell {
  return {
    children: [createTableParagraph(textFromDocxText(cell.text, cell.runs), resolveDocxRunLink(cell.runs))],
    colSpan: cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined,
    role: isHeader ? "th" : "td",
    rowSpan: cell.rowSpan && cell.rowSpan > 1 ? cell.rowSpan : undefined,
    style: mapDocxCellStyle(cell.style),
  };
}

function convertStructuredTableCell(cell: TableCell): PdfPhase5TableCell {
  return {
    children: [createTableParagraph(textFromRuns(cell.content, cell.text), resolveStructuredRunLink(cell.content))],
    colSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
    role: cell.isHeader ? "th" : "td",
    rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
    style: mapStructuredCellStyle(cell.style),
  };
}

function createTableParagraph(text: string, link?: PdfPhase3Link): PdfPhase5CellContentNode {
  return {
    link,
    text,
    type: "paragraph",
    value: text,
  };
}

function resolveDocxTableColumns(table: LooseDocxElement): PdfPhase5TableColumn[] | undefined {
  if (!table.columns?.length) {
    return undefined;
  }
  return (table.columns as Array<{ maxWidth?: number; minWidth?: number; width?: number }>).map((column) => ({
    maxWidth: column.maxWidth,
    minWidth: column.minWidth,
    width: column.width,
  }));
}

function mapDocxCellStyle(style: { [key: string]: unknown } | undefined): PdfPhase5CellStyle | undefined {
  if (!style) {
    return undefined;
  }

  return {
    backgroundColor: asColor(style.backgroundColor),
    borderBottom: mapBorder((style.borderBottom ?? style.border) as { [key: string]: unknown } | undefined),
    borderLeft: mapBorder((style.borderLeft ?? style.border) as { [key: string]: unknown } | undefined),
    borderRight: mapBorder((style.borderRight ?? style.border) as { [key: string]: unknown } | undefined),
    borderTop: mapBorder((style.borderTop ?? style.border) as { [key: string]: unknown } | undefined),
    paddingBottom: asNumber((style.padding as { [key: string]: unknown } | undefined)?.bottom),
    paddingLeft: asNumber((style.padding as { [key: string]: unknown } | undefined)?.left),
    paddingRight: asNumber((style.padding as { [key: string]: unknown } | undefined)?.right),
    paddingTop: asNumber((style.padding as { [key: string]: unknown } | undefined)?.top),
    verticalAlign: asVerticalAlign(style.verticalAlign),
  };
}

function mapStructuredCellStyle(style: CellStyle): PdfPhase5CellStyle | undefined {
  return {
    backgroundColor: style.backgroundColor,
    borderBottom: mapStructuredBorder(style.borderBottom),
    borderLeft: mapStructuredBorder(style.borderLeft),
    borderRight: mapStructuredBorder(style.borderRight),
    borderTop: mapStructuredBorder(style.borderTop),
    paddingBottom: style.padding.bottom,
    paddingLeft: style.padding.left,
    paddingRight: style.padding.right,
    paddingTop: style.padding.top,
    verticalAlign: style.verticalAlign,
  };
}

function convertDocxImage(image: LooseDocxElement, _context: ConversionContext): PdfPhase7DocumentNode[] {
  if (isTopBottomWrap(image.floating?.wrap)) {
    return [convertTopBottomImageGroup(image)];
  }

  if (image.floating?.wrap === "behind" || image.floating?.wrap === "inFront") {
    const isForeground = image.floating?.wrap === "inFront";
    const width = image.width ?? DEFAULT_FIGURE_SIZE;
    const height = image.height ?? DEFAULT_FIGURE_SIZE;
    const left = resolveFloatingImageLeft(image, width);
    const top = resolveFloatingImageTop(image, height);
    const graphicNode = createGraphicNode({
      alt: image.alt ?? image.caption ?? "Image",
      graphic: {
        format: inferImageFormat(image.src),
        height,
        layer: isForeground ? "foreground" : "background",
        source: image.src,
        type: "image",
        width,
        x: left,
        y: top,
      },
      style: {
        height,
        left,
        position: "absolute",
        top,
        width,
      },
    });

    return image.caption
      ? [graphicNode, createTextNode("paragraph", image.caption, { style: { marginBottom: 12, marginTop: 4 } })]
      : [graphicNode];
  }

  const figure = createFigureNode(image.src, image.alt ?? image.caption ?? "Image", image.width, image.height);
  return image.caption
    ? [figure, createTextNode("paragraph", image.caption, { style: { marginBottom: 12, marginTop: 4 } })]
    : [figure];
}

function convertStructuredImage(image: ImageElement): PdfPhase7FigureNode {
  return createFigureNode(
    image.src,
    image.decorative ? "" : image.alt,
    image.naturalWidth ?? image.position.width,
    image.naturalHeight ?? image.position.height,
  );
}

function convertWrappedImageGroup(
  image: LooseDocxElement,
  wrappedTextElements: LooseDocxElement[],
  context: ConversionContext,
): PdfPhase7DocumentNode {
  const floatConfig = image.floating as Record<string, unknown> | undefined;
  const distanceFromText = floatConfig?.distanceFromText as Record<string, unknown> | undefined;
  const gap = asNumber(distanceFromText?.left) ?? asNumber(distanceFromText?.right) ?? 12;
  const figure = {
    ...createFigureNode(image.src, image.alt ?? image.caption ?? "Image", image.width, image.height),
    style: {
      marginBottom: 12,
      marginTop: asNumber(distanceFromText?.top),
    },
  };
  const textNodes = wrappedTextElements.flatMap((element) => convertDocxElement(element, context));
  const textContainer = {
    children: textNodes,
    style: { flexDirection: "column", flexGrow: 1 },
    type: "container",
  } as const;

  return {
    children: resolveFloatingHorizontalAlign(image) === "right" ? [textContainer, figure] : [figure, textContainer],
    style: {
      alignItems: "flex-start",
      columnGap: gap,
      flexDirection: "row",
      marginBottom: 12,
    },
    type: "container",
  };
}

function convertTopBottomImageGroup(image: LooseDocxElement): PdfPhase7DocumentNode {
  const floatConfig = image.floating as Record<string, unknown> | undefined;
  const distanceFromText = floatConfig?.distanceFromText as Record<string, unknown> | undefined;
  const figure = createFigureNode(image.src, image.alt ?? image.caption ?? "Image", image.width, image.height);

  return {
    children: image.caption
      ? [figure, createTextNode("paragraph", image.caption, { style: { marginBottom: 0, marginTop: 4, textAlign: "center" } })]
      : [figure],
    style: {
      alignItems: resolveContainerAlignItems(resolveFloatingHorizontalAlign(image)),
      flexDirection: "column",
      marginBottom: asNumber(distanceFromText?.bottom) ?? 12,
      marginTop: asNumber(distanceFromText?.top) ?? 12,
    },
    type: "container",
  };
}

function convertChartToGraphic(chart: LooseDocxElement | ChartElement): PdfPhase7GraphicNode {
  const width = (chart as any).width ?? (chart as any).position?.width ?? 420;
  const height = (chart as any).height ?? (chart as any).position?.height ?? 260;
  return createGraphicNode({
    alt: chart.title ?? `${chart.chartType ?? "chart"} chart`,
    graphic: {
      height,
      source: generateChartSVG(chart as ChartElement, { height, showLegend: true, width }),
      type: "svg",
      width,
      x: 0,
      y: 0,
    },
  });
}

function convertShapeToGraphic(shape: LooseDocxElement | ShapeElement): PdfPhase7GraphicNode {
  const width = (shape as any).width ?? (shape as any).position?.width ?? 120;
  const height = (shape as any).height ?? (shape as any).position?.height ?? 80;
  const svgShape = "position" in shape && shape.position
    ? shape
    : {
        ...(shape as Record<string, unknown>),
        position: {
          height,
          width,
          x: 0,
          y: 0,
        },
        style: (shape as any).style ?? {},
      };
  return createGraphicNode({
    alt: shape.text ? `Shape: ${shape.text}` : `${shape.shapeType ?? "shape"} shape`,
    graphic: {
      height,
      source: generateShapeSVG(svgShape as ShapeElement),
      type: "svg",
      width,
      x: 0,
      y: 0,
    },
  });
}

function convertCodeBlockElement(element: LooseDocxElement): PdfContainerNode {
  const rawText = element.code ?? element.text ?? "";
  const text = element.showLineNumbers
    ? rawText.split("\n").map((line: string, index: number) => `${index + 1}  ${line}`).join("\n")
    : rawText;
  const height = estimateCodeBlockHeight(text);
  const padding = 10;
  return {
    children: [
      createGraphicNode({
        graphic: {
          fill: { color: { b: 0.96, g: 0.96, r: 0.96, space: "rgb" }, opacity: 1, space: "solid" },
          height,
          radius: 6,
          type: "rect",
          width: DEFAULT_CODE_BLOCK_WIDTH,
          x: 0,
          y: 0,
        },
        style: {
          height,
          left: 0,
          position: "absolute",
          top: 0,
          width: DEFAULT_CODE_BLOCK_WIDTH,
        },
      }),
      createTextNode("paragraph", text, {
        font: "Courier",
        style: {
          marginBottom: 12,
          paddingBottom: padding,
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
        },
      }),
    ],
    style: {
      marginBottom: 12,
      position: "relative",
      width: DEFAULT_CODE_BLOCK_WIDTH,
    },
    type: "container",
  };
}

function createDividerGraphic(): PdfPhase7GraphicNode {
  return createGraphicNode({
    graphic: {
      stroke: { color: { b: 0.78, g: 0.78, r: 0.78, space: "rgb" }, width: 1 },
      type: "line",
      x1: 0,
      x2: DEFAULT_CODE_BLOCK_WIDTH,
      y1: 0,
      y2: 0,
    },
    style: {
      height: 1,
      marginBottom: 12,
      width: DEFAULT_CODE_BLOCK_WIDTH,
    },
  });
}

function createFigureNode(source: string, alt: string, width?: number, height?: number): PdfPhase7FigureNode {
  return {
    alt,
    format: inferImageFormat(source),
    height: height ?? DEFAULT_FIGURE_SIZE,
    source,
    style: { marginBottom: 12 },
    type: "figure",
    width: width ?? DEFAULT_FIGURE_SIZE,
  };
}

function createTextNode(
  type: "heading" | "paragraph",
  text: string,
  options?: {
    font?: string;
    id?: string;
    lang?: string;
    level?: number;
    link?: PdfPhase3Link;
    style?: {
      lineHeight?: number;
      marginBottom?: number;
      marginLeft?: number;
      marginTop?: number;
      paddingBottom?: number;
      paddingLeft?: number;
      paddingRight?: number;
      paddingTop?: number;
      textAlign?: "center" | "justify" | "left" | "right";
    } | null;
  },
): PdfParagraphNode {
  const style = options?.style;
  const nodeStyle: PdfPhase3Style | undefined = style
    ? {
        marginBottom: style.marginBottom ?? 8,
        marginLeft: style.marginLeft,
        marginTop: style.marginTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        paddingTop: style.paddingTop,
      }
    : undefined;

  if (type === "heading") {
    return {
      fontSize: headingFontSize(options?.level),
      id: options?.id,
      lang: options?.lang,
      level: (options?.level ?? 1) as 1 | 2 | 3 | 4 | 5 | 6,
      lineHeight: style?.lineHeight,
      link: options?.link,
      style: nodeStyle,
      text,
      textAlign: style?.textAlign,
      type: "heading",
      value: text,
    };
  }

  return {
    font: options?.font,
    id: options?.id,
    lang: options?.lang,
    lineHeight: style?.lineHeight,
    link: options?.link,
    style: nodeStyle,
    text,
    textAlign: style?.textAlign,
    type: "paragraph",
    value: text,
  };
}

function createGraphicNode(input: {
  alt?: string;
  graphic: PdfGraphic;
  style?: PdfPhase3Style;
}): PdfPhase7GraphicNode {
  return {
    alt: input.alt,
    graphic: input.graphic,
    style: input.style,
    type: "graphic",
  };
}

function headingFontSize(level: number | undefined): number {
  switch (level) {
    case 1:
      return 22;
    case 2:
      return 18;
    case 3:
      return 16;
    case 4:
      return 14;
    case 5:
      return 12;
    default:
      return 11;
  }
}

function resolveDocxRunLink(runs?: Array<{ hyperlink?: string; text: string }>): PdfPhase3Link | undefined {
  return resolveLinkCandidate((runs ?? []).map((run) => ({ hyperlink: run.hyperlink, text: run.text ?? "" })));
}

function resolveStructuredRunLink(runs?: TextRun[]): PdfPhase3Link | undefined {
  return resolveLinkCandidate((runs ?? []).map((run) => ({ hyperlink: run.link, text: run.text ?? "" })));
}

function resolveLinkCandidate(runs: Array<{ hyperlink?: string; text: string }>): PdfPhase3Link | undefined {
  const hyperlinks = [...new Set(runs.map((run) => run.hyperlink).filter((value): value is string => Boolean(value)))];
  if (hyperlinks.length !== 1) {
    return undefined;
  }
  if (runs.some((run) => !run.hyperlink && run.text.trim().length > 0)) {
    return undefined;
  }
  const hyperlink = hyperlinks[0] as string;
  if (hyperlink.startsWith("#")) {
    return { kind: "internal", target: hyperlink.slice(1) };
  }
  return { kind: "external", url: hyperlink };
}

function registerFootnote(context: ConversionContext, footnote: string | undefined): number | undefined {
  if (!footnote || footnote.trim().length === 0) {
    return undefined;
  }
  const marker = context.footnotes.length + 1;
  context.footnotes.push({
    marker,
    text: footnote,
  });
  return marker;
}

function withFootnoteMarker(text: string, marker: number | undefined): string {
  if (!marker) {
    return text;
  }
  return `${text}[${marker}]`;
}

function createFootnoteRegion(context: ConversionContext): FootnoteRegion | undefined {
  if (context.footnotes.length === 0) {
    return undefined;
  }
  const children: PdfPhase7DocumentNode[] = [
    createDividerGraphic(),
    createTextNode("heading", "Notes", {
      lang: context.lang,
      level: 3,
    }),
    ...context.footnotes.map((entry) =>
      createTextNode("paragraph", `${entry.marker}. ${entry.text}`, {
        lang: context.lang,
      }),
    ),
  ];

  return {
    node: {
      children,
      style: {
        bottom: 0,
        left: 0,
        position: "absolute",
        width: "100%",
      },
      type: "container",
    },
    reservedHeight: estimateFootnoteRegionHeight(context.footnotes),
  };
}

function estimateFootnoteRegionHeight(footnotes: FootnoteEntry[]): number {
  const noteLines = footnotes.reduce((sum, entry) => sum + Math.max(1, Math.ceil(entry.text.length / 110)), 0);
  return 30 + 18 + (noteLines * DEFAULT_CODE_BLOCK_LINE_HEIGHT);
}

function applyColumnLayout(children: PdfPhase7DocumentNode[], columnCount: number): PdfPhase7DocumentNode[] {
  if (columnCount <= 1 || children.length < columnCount * 2) {
    return children;
  }

  const columns = Array.from({ length: columnCount }, () => [] as PdfPhase7DocumentNode[]);
  const totalWeight = children.reduce((sum, child) => sum + estimateNodeWeight(child), 0);
  const targetWeight = Math.max(1, Math.ceil(totalWeight / columnCount));
  let currentColumn = 0;
  let currentWeight = 0;

  for (const child of children) {
    const childWeight = estimateNodeWeight(child);
    if (
      currentColumn < columnCount - 1 &&
      columns[currentColumn].length > 0 &&
      currentWeight + childWeight > targetWeight
    ) {
      currentColumn += 1;
      currentWeight = 0;
    }
    columns[currentColumn].push(child);
    currentWeight += childWeight;
  }

  return [{
    children: columns.map((columnChildren) => ({
      children: columnChildren,
      style: { flexDirection: "column", flexGrow: 1 },
      type: "container",
    })),
    style: {
      alignItems: "flex-start",
      columnGap: 18,
      flexDirection: "row",
      marginBottom: 12,
    },
    type: "container",
  }];
}

function estimateNodeWeight(node: PdfPhase7DocumentNode): number {
  switch (node.type) {
    case "heading":
      return 2;
    case "paragraph":
      return Math.max(1, Math.ceil((node.value ?? node.text ?? "").length / 140));
    case "figure":
    case "graphic":
      return 3;
    case "table":
      return Math.max(3, (node.body?.length ?? 0) + (node.header?.length ?? 0));
    case "container":
      return Math.max(1, node.children.reduce((sum, child) => sum + estimateNodeWeight(child), 0));
    default:
      return 1;
  }
}

function estimateCodeBlockHeight(code: string): number {
  return Math.max(42, (code.split("\n").length * DEFAULT_CODE_BLOCK_LINE_HEIGHT) + 20);
}

function inferImageFormat(source: string): "jpeg" | "png" | undefined {
  const lower = source.toLowerCase();
  if (lower.includes("image/png") || lower.endsWith(".png")) {
    return "png";
  }
  if (lower.includes("image/jpeg") || lower.includes("image/jpg") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "jpeg";
  }
  return undefined;
}

function resolveFloatingImageLeft(image: LooseDocxElement, width: number): number {
  const floating = image.floating as Record<string, unknown> | undefined;
  const explicit = normalizeFloatingOffset(floating?.horizontalPosition);
  if (explicit !== undefined) {
    return explicit;
  }

  switch (resolveFloatingHorizontalAlign(image)) {
    case "right":
      return Math.max(0, DEFAULT_CODE_BLOCK_WIDTH - width);
    case "center":
      return Math.max(0, (DEFAULT_CODE_BLOCK_WIDTH - width) / 2);
    default:
      return 0;
  }
}

function resolveFloatingImageTop(image: LooseDocxElement, height: number): number {
  const floating = image.floating as Record<string, unknown> | undefined;
  const explicit = normalizeFloatingOffset(floating?.verticalPosition);
  if (explicit !== undefined) {
    return explicit;
  }

  const verticalPosition = typeof floating?.verticalPosition === "string" ? floating.verticalPosition : undefined;
  switch (verticalPosition) {
    case "bottom":
    case "outside":
      return Math.max(DEFAULT_FLOATING_TOP, 648 - height);
    case "center":
      return Math.max(DEFAULT_FLOATING_TOP, (648 - height) / 2);
    case "inside":
      return 72;
    default:
      return DEFAULT_FLOATING_TOP;
  }
}

function normalizeFloatingOffset(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.abs(value) > 1000 ? Math.round(value / EMUS_PER_POINT) : value;
}

function resolveFloatingHorizontalAlign(image: LooseDocxElement): "center" | "left" | "right" {
  const floating = image.floating as Record<string, unknown> | undefined;
  const horizontalPosition = typeof floating?.horizontalPosition === "string" ? floating.horizontalPosition : undefined;
  if (horizontalPosition === "center" || horizontalPosition === "right") {
    return horizontalPosition;
  }
  if (horizontalPosition === "left") {
    return "left";
  }
  switch (image.floating?.position) {
    case "center":
    case "right":
      return image.floating.position;
    default:
      return "left";
  }
}

function resolveContainerAlignItems(alignment: "center" | "left" | "right"): "center" | "flex-end" | "flex-start" {
  switch (alignment) {
    case "center":
      return "center";
    case "right":
      return "flex-end";
    default:
      return "flex-start";
  }
}

function isTopBottomWrap(wrap: unknown): boolean {
  return wrap === "topAndBottom" || wrap === "topBottom";
}

function headerFooterToText(def: HeaderFooterDef | undefined): string | undefined {
  if (!def) {
    return undefined;
  }

  const parts: string[] = [];
  if (def.text) {
    parts.push(def.text);
  }
  if (def.content?.length) {
    const contentText = def.content.map(flattenDocxElementText).filter(Boolean).join(" ").trim();
    if (contentText) {
      parts.push(contentText);
    }
  }

  return parts.join(" ").trim() || undefined;
}

function flattenHeaderFooterContent(content: HeaderFooterContent | undefined): string | undefined {
  if (!content) {
    return undefined;
  }
  const text = content.elements.map(flattenStructuredElementText).filter(Boolean).join(" ").trim();
  return text || undefined;
}

function flattenDocxElementText(element: LooseDocxElement): string {
  switch (element.type) {
    case "heading":
    case "paragraph":
      return textFromDocxText(element.text, element.runs);
    case "list":
      return (element.items as Array<{ runs?: Array<{ text: string }>; text?: string }>)
        .map((item) => textFromDocxText(item.text, item.runs))
        .join(" ");
    case "table":
      return (element.rows as Array<{ cells: Array<{ runs?: Array<{ text: string }>; text?: string }> }>)
        .flatMap((row) => row.cells.map((cell) => textFromDocxText(cell.text, cell.runs)))
        .join(" ");
    case "image":
      return element.caption ?? element.alt ?? "";
    case "container":
      return (element.children ?? []).map(flattenDocxElementText).join(" ");
    case "shape":
      return element.text ?? "";
    case "code-block":
      return element.code ?? element.text ?? "";
    default:
      return "";
  }
}

function flattenStructuredElementText(element: StructuredElement): string {
  switch (element.type) {
    case "heading":
    case "paragraph":
    case "text-run":
      return textFromRuns(element.runs, element.text);
    case "list":
      return element.items.map((item) => textFromRuns(item.content, item.text)).join(" ");
    case "table":
      return element.rows.flatMap((row) => row.cells.map((cell) => textFromRuns(cell.content, cell.text))).join(" ");
    case "image":
      return element.alt;
    case "container":
      return element.children.map(flattenStructuredElementText).join(" ");
    case "shape":
      return element.text ?? "";
    default:
      return "";
  }
}

function textFromDocxText(text?: string, runs?: Array<{ text: string }>): string {
  if (typeof text === "string" && text.length > 0) {
    return text;
  }
  return (runs ?? []).map((run) => run.text).join("") || "";
}

function textFromRuns(runs?: TextRun[], fallback?: string): string {
  if (fallback) {
    return fallback;
  }
  return (runs ?? []).map((run) => run.text).join("") || "";
}

function mapBorder(border: { [key: string]: unknown } | undefined): PdfPhase5Border | undefined {
  if (!border) {
    return undefined;
  }
  return {
    color: asColor(border.color) ?? DEFAULT_TEXT_COLOR,
    style: asBorderStyle(border.style),
    width: asNumber(border.width),
  };
}

function mapStructuredBorder(border: CellStyle["borderTop"]): PdfPhase5Border | undefined {
  if (!border) {
    return undefined;
  }
  return {
    color: border.color,
    style: border.style,
    width: border.width,
  };
}

function isWrapTextElement(element: LooseDocxElement): boolean {
  return element.type === "paragraph" || element.type === "heading" || element.type === "list";
}

function collectFollowingWrapTextElements(elements: LooseDocxElement[], startIndex: number): LooseDocxElement[] {
  const collected: LooseDocxElement[] = [];
  for (let index = startIndex; index < elements.length; index += 1) {
    if (!isWrapTextElement(elements[index])) {
      break;
    }
    collected.push(elements[index]);
  }
  return collected;
}

function listMarker(listType: "bullet" | "number" | "letter" | "roman", value: number): string {
  switch (listType) {
    case "number":
      return `${value}.`;
    case "letter":
      return `${toAlpha(value).toLowerCase()}.`;
    case "roman":
      return `${toRoman(value).toLowerCase()}.`;
    default:
      return "\u2022";
  }
}

function toAlpha(value: number): string {
  let current = Math.max(1, value);
  let result = "";
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remainder = Math.max(1, value);
  let result = "";
  for (const [amount, symbol] of numerals) {
    while (remainder >= amount) {
      result += symbol;
      remainder -= amount;
    }
  }
  return result;
}

function asColor(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asVerticalAlign(value: unknown): "bottom" | "middle" | "top" | undefined {
  return value === "bottom" || value === "middle" || value === "top" ? value : undefined;
}

function asBorderStyle(value: unknown): PdfPhase5Border["style"] | undefined {
  return value === "dashed" || value === "dotted" || value === "double" || value === "none" || value === "solid"
    ? value
    : undefined;
}
