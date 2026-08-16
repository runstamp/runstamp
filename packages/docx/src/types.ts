/**
 * StructuredDocument Types
 *
 * Intermediate representation consumed by the DOCX serializer.
 * These types represent the bridge between input formats (DocxDocument, PaperDocument)
 * and the OOXML generation layer.
 *
 * Ported from: packages/converter/src/extraction/types.ts
 */

import type { DocxWarningCode } from './errors/warning-codes.js';
import type { ResourceLimits } from './ooxml/resource-limits.js';
import type { ImageFetchConfig } from './elements/images/extractor.js';

// =============================================================================
// CORE DOCUMENT STRUCTURE
// =============================================================================

/**
 * Root document containing all pages and shared resources.
 */
export interface StructuredDocument {
  /**
   * Kind discriminator. Required; distinguishes a StructuredDocument from
   * a DocxDocument at runtime without relying on duck typing.
   *
   * Legacy callers that construct this object without `__kind` will have
   * it injected by the serializer entry point with a
   * `DOCX_RELAXED_KIND_INJECTED` warning — but new code should always
   * set it explicitly.
   */
  __kind: 'StructuredDocument';

  /** Document metadata (title, author, etc.) */
  metadata: DocumentMetadata;

  /** Track changes session metadata */
  revisionInfo?: RevisionInfo;

  /** Pages in document order */
  pages: StructuredPage[];

  /** Shared style definitions */
  styles: StyleDefinitions;

  /** Asset registry (images, fonts, embedded files) */
  assets: AssetRegistry;

  /** Extraction/conversion statistics */
  stats: ExtractionStats;

  /** Warnings encountered during conversion */
  warnings: string[];

  /** Table of Contents configuration */
  toc?: TableOfContentsConfig;
}

/**
 * Table of Contents configuration.
 */
export interface TableOfContentsConfig {
  title?: string;              // default: "Table of Contents"
  levels?: number;             // 1-6, default: 3 (include H1-H3)
  showPageNumbers?: boolean;   // default: true
  hyperlinks?: boolean;        // default: true
  leader?: 'dot' | 'dash' | 'underscore' | 'none';  // default: 'dot'
  position?: 'start' | 'after-cover';  // where to insert TOC
}

/**
 * Document metadata.
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  createdAt?: Date;
  modifiedAt?: Date;

  /** Custom metadata */
  custom?: Record<string, string>;

  /** BCP 47 language tag (e.g. "en-US", "fr-FR") */
  language?: string;
}

/**
 * Track changes session metadata.
 */
export interface RevisionInfo {
  author?: string;
  date?: string;
  rsid?: string;
}

/**
 * A single page/section in the document.
 */
export interface StructuredPage {
  /** 1-based page number */
  pageNumber: number;

  /** Page dimensions in CSS pixels */
  dimensions: PageDimensions;

  /** Content elements */
  elements: StructuredElement[];

  /** Background color or image */
  background?: Background;

  /** DOCX: Section break before this page */
  sectionBreak?: SectionBreak;

  /** DOCX: Header content */
  header?: HeaderFooterContent;

  /** DOCX: Footer content */
  footer?: HeaderFooterContent;
}

/**
 * Page dimensions and margins.
 */
export interface PageDimensions {
  /** Width in CSS pixels */
  width: number;

  /** Height in CSS pixels */
  height: number;

  /** Margins in CSS pixels */
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// =============================================================================
// ELEMENT TYPES
// =============================================================================

/**
 * Union of all element types.
 */
export type StructuredElement =
  | HeadingElement
  | ParagraphElement
  | TextRunElement
  | CodeBlockElement
  | PageBreakElement
  | DividerElement
  | TableElement
  | ImageElement
  | ChartElement
  | ShapeElement
  | ListElement
  | ContainerElement;

/**
 * Element type discriminator.
 */
export type ElementType =
  | 'heading'
  | 'paragraph'
  | 'text-run'
  | 'code-block'
  | 'page-break'
  | 'divider'
  | 'table'
  | 'image'
  | 'chart'
  | 'shape'
  | 'list'
  | 'container';

/**
 * Base properties shared by all elements.
 */
export interface BaseElement {
  /** Unique element ID */
  id: string;

  /** Element type discriminator */
  type: ElementType;

  /** Bounding box */
  position: BoundingBox;

  /** Z-index (stacking order) */
  zIndex: number;

  /** Opacity (0-1) */
  opacity: number;

  /** Computed styles */
  style: ComputedStyle;

  /** Layout information (CSS Grid, Flexbox, etc.) */
  layout?: ExtractedLayoutInfo;

  /** Original HTML tag name */
  tagName: string;

  /** Data attributes */
  dataAttributes: Record<string, string>;

  /** DOCX-specific hints */
  docx?: DOCXHints;
}

/**
 * Bounding box.
 */
export interface BoundingBox {
  /** X position relative to page origin */
  x: number;

  /** Y position relative to page origin */
  y: number;

  /** Width in CSS pixels */
  width: number;

  /** Height in CSS pixels */
  height: number;
}

// =============================================================================
// SPECIFIC ELEMENT TYPES
// =============================================================================

/**
 * Heading element (h1-h6).
 */
export interface HeadingElement extends BaseElement {
  type: 'heading';

  /** Heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;

  /** Plain text content */
  text: string;

  /** Formatted text runs */
  runs: TextRun[];

  /** Track changes metadata for paragraph-level revisions */
  revision?: ParagraphRevision;

  /** Paragraph-level comment metadata */
  comment?: CommentInfo;
}

/**
 * Paragraph element.
 */
export interface ParagraphElement extends BaseElement {
  type: 'paragraph';

  /** Plain text content */
  text: string;

  /** Formatted text runs */
  runs: TextRun[];

  /** Track changes metadata for paragraph-level revisions */
  revision?: ParagraphRevision;

  /** Paragraph-level comment metadata */
  comment?: CommentInfo;
}

/**
 * Inline text run (span-level content).
 */
export interface TextRunElement extends BaseElement {
  type: 'text-run';

  /** Plain text content */
  text: string;

  /** Formatted text runs */
  runs: TextRun[];

  /** Paragraph-level comment metadata */
  comment?: CommentInfo;
}

/**
 * Code block element.
 */
export interface CodeBlockElement extends BaseElement {
  type: 'code-block';

  /** Raw code content */
  code: string;

  /** Optional language identifier */
  language?: string;

  /** Whether line numbers should be shown */
  showLineNumbers?: boolean;
}

/**
 * Explicit page break element.
 */
export interface PageBreakElement extends BaseElement {
  type: 'page-break';
}

/**
 * Horizontal divider element.
 */
export interface DividerElement extends BaseElement {
  type: 'divider';

  /** Border style */
  styleType?: 'solid' | 'dashed' | 'dotted' | 'double';

  /** Divider color */
  color?: string;

  /** Divider thickness in points */
  thickness?: number;
}

/**
 * Table element with full structure.
 */
export interface TableElement extends BaseElement {
  type: 'table';

  /** Visual table preset from the JSON DOCX surface */
  tableStyle?: 'plain' | 'striped' | 'bordered' | 'modern' | 'minimal' | 'corporate';

  /** Column definitions */
  columns: TableColumn[];

  /** All rows (header + body + footer) */
  rows: TableRow[];

  /** Number of header rows (to repeat on page break) */
  headerRowCount: number;

  /** Number of footer rows */
  footerRowCount: number;

  /** Should headers repeat on page breaks */
  repeatHeaders: boolean;

  /** Keep a short table on one page when Word can do so */
  keepTogether?: boolean;

  /** Keep the final table row with the following block when Word can do so */
  keepWithNext?: boolean;

  /** 2D matrix for rowspan/colspan tracking */
  cellMatrix: CellReference[][];

  /** Table caption (if any) */
  caption?: string;

  /** OOXML table description for accessibility (<w:tblDescription>) */
  tableDescription?: string;

  /** OOXML table caption for accessibility (<w:tblCaption>) */
  tableCaption?: string;

  /** Track changes metadata for table-level revisions */
  revision?: TableRevision;
}

/**
 * Table column definition.
 */
export interface TableColumn {
  /** Column width in CSS pixels */
  width: number;

  /** Minimum width */
  minWidth?: number;

  /** Maximum width */
  maxWidth?: number;
}

/**
 * Table row.
 */
export interface TableRow {
  /** Row index (0-based) */
  index: number;

  /** Row height in CSS pixels */
  height: number;

  /** Cells in this row */
  cells: TableCell[];

  /** Is this a header row */
  isHeader: boolean;

  /** Is this a footer row */
  isFooter: boolean;

  /** Track changes metadata for row structural revisions */
  revision?: TableRowRevision;
}

/**
 * Table cell.
 */
export interface TableCell {
  /** Cell position in grid */
  row: number;
  col: number;

  /** Span counts */
  rowSpan: number;
  colSpan: number;

  /** Cell content (text runs) */
  content: TextRun[];

  /** Plain text content */
  text: string;

  /** Rich block content for nested tables or structured cell bodies */
  elements?: StructuredElement[];

  /** Cell-specific styles */
  style: CellStyle;

  /** Is this a header cell (th) */
  isHeader: boolean;

  /** Track changes metadata for cell structural revisions */
  revision?: TableCellRevision;
}

/**
 * Cell reference in the matrix (for rowspan/colspan tracking).
 */
export interface CellReference {
  /** Origin row of the cell */
  originRow: number;

  /** Origin column of the cell */
  originCol: number;

  /** Is this the origin position */
  isOrigin: boolean;

  /** Reference to the actual cell */
  cell: TableCell;
}

/**
 * Cell-specific styles.
 */
export interface CellStyle {
  /** Background color */
  backgroundColor?: string;

  /** Text color */
  color?: string;

  /** Font family */
  fontFamily?: string;

  /** Font size */
  fontSize?: number;

  /** Font weight */
  fontWeight?: string;

  /** Border styles */
  borderTop?: BorderStyle;
  borderRight?: BorderStyle;
  borderBottom?: BorderStyle;
  borderLeft?: BorderStyle;

  /** Padding */
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  /** Vertical alignment */
  verticalAlign: 'top' | 'middle' | 'bottom';

  /** Text alignment */
  textAlign: 'left' | 'center' | 'right' | 'justify';
}

/**
 * Image element.
 */
export interface ImageElement extends BaseElement {
  type: 'image';

  /** Image source (URL, data URI, or asset reference) */
  src: string;

  /** Binary image data, used when the public input provided a Buffer */
  binaryData?: Buffer;

  /** Alternative text */
  alt: string;

  /** Natural dimensions (if available) */
  naturalWidth?: number;
  naturalHeight?: number;

  /** Asset ID (if registered in AssetRegistry) */
  assetId?: string;

  /** Image fit mode */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

  /** Whether the image is decorative (no alt text needed for screen readers) */
  decorative?: boolean;
}

/**
 * Chart element.
 */
export interface ChartElement extends BaseElement {
  type: 'chart';

  /** Chart type */
  chartType: ChartType;

  /** Chart title */
  title?: string;

  /** Data series */
  series: ChartSeries[];

  /** Category labels (X-axis) */
  categories?: string[];

  /** Legend configuration */
  legend?: LegendConfig;

  /** Axes configuration */
  axes?: AxesConfig;

  /** For Office formats: should embed Excel data */
  embedData: boolean;
}

/**
 * Supported chart types.
 */
export type ChartType =
  | 'bar'
  | 'column'
  | 'line'
  | 'area'
  | 'pie'
  | 'doughnut'
  | 'scatter'
  | 'bubble'
  | 'radar';

/**
 * Chart data series.
 */
export interface ChartSeries {
  /** Series name */
  name: string;

  /** Data values */
  values: number[];

  /** Series color */
  color?: string;
}

/**
 * Shape element.
 */
export interface ShapeElement extends BaseElement {
  type: 'shape';

  /** Shape type */
  shapeType: ShapeType;

  /** Fill color or gradient */
  fill?: FillStyle;

  /** Stroke/outline */
  stroke?: StrokeStyle;

  /** Text content (if shape contains text) */
  text?: string;

  /** Text runs (if shape contains formatted text) */
  runs?: TextRun[];

  /** Custom path data (for custom shapes) */
  pathData?: string;
}

/**
 * Supported shape types.
 */
export type ShapeType =
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'arrow'
  | 'line'
  | 'custom';

/**
 * List element (ul/ol).
 */
export interface ListElement extends BaseElement {
  type: 'list';

  /** List type */
  listType: 'bullet' | 'number' | 'letter' | 'roman';

  /** Starting number (for numbered lists) */
  start: number;

  /** List items */
  items: ListItem[];

  /** Nesting level (0 = top level) */
  level: number;
}

/**
 * List item.
 */
export interface ListItem {
  /** Item content (text runs) */
  content: TextRun[];

  /** Plain text */
  text: string;

  /** Nested list (if any) */
  nestedList?: ListElement;
}

/**
 * Container element (div, section, etc.).
 */
export interface ContainerElement extends BaseElement {
  type: 'container';

  /** Keep a bounded vertical group on one page when Word can do so */
  keepTogether?: boolean;

  /** Child elements */
  children: StructuredElement[];
}

// =============================================================================
// TEXT FORMATTING
// =============================================================================

/**
 * A run of text with consistent formatting.
 */
export interface TextRun {
  /** Text content */
  text: string;

  /** Font family */
  fontFamily: string;

  /** Font size in points */
  fontSize: number;

  /** Font weight */
  fontWeight: 'normal' | 'bold' | number;

  /** Font style */
  fontStyle: 'normal' | 'italic';

  /** Text decoration */
  textDecoration: 'none' | 'underline' | 'line-through' | 'underline line-through';

  /** Text color (hex) */
  color: string;

  /** Background/highlight color */
  backgroundColor?: string;

  /** Hyperlink URL */
  link?: string;

  /** Superscript */
  superscript?: boolean;

  /** Subscript */
  subscript?: boolean;

  /** Track changes metadata */
  revision?: TextRunRevision;
}

/**
 * Run style snapshot used for formatting revisions.
 */
export interface TextRunStyleSnapshot {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  color?: string;
  backgroundColor?: string;
  superscript?: boolean;
  subscript?: boolean;
  letterSpacing?: number;
}

/**
 * Track changes metadata attached to a text run.
 */
export interface TextRunRevision {
  type: 'insert' | 'delete' | 'format';
  id?: number;
  author?: string;
  date?: string;
  beforeStyle?: TextRunStyleSnapshot;
}

/**
 * Base metadata shared by non-run tracked-change records.
 */
export interface BaseRevisionMetadata {
  id?: number;
  author?: string;
  date?: string;
}

/**
 * Snapshot of paragraph properties for paragraph property revisions.
 */
export interface ParagraphRevisionProperties {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  keepLines?: boolean;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  indent?: {
    firstLine?: number;
    left?: number;
    right?: number;
  };
}

/**
 * Track changes metadata attached to a paragraph-level element.
 */
export interface ParagraphRevision extends BaseRevisionMetadata {
  type: 'insert' | 'delete' | 'property' | 'moveFrom' | 'moveTo';
  moveName?: string;
  before?: ParagraphRevisionProperties;
}

/**
 * Snapshot of table-level properties for table property revisions.
 */
export interface TableRevisionProperties {
  caption?: string;
  tableDescription?: string;
  tableCaption?: string;
}

/**
 * Track changes metadata attached to a table element.
 */
export interface TableRevision extends BaseRevisionMetadata {
  type: 'property';
  before?: TableRevisionProperties;
}

/**
 * Track changes metadata attached to a table cell.
 */
export interface TableCellRevision extends BaseRevisionMetadata {
  type: 'insert' | 'delete';
}

/**
 * Track changes metadata attached to a table row.
 */
export interface TableRowRevision extends BaseRevisionMetadata {
  type: 'insert' | 'delete';
}

// =============================================================================
// STYLES
// =============================================================================

/**
 * Computed styles.
 */
export interface ComputedStyle {
  // Background
  backgroundColor?: string;
  backgroundImage?: string;

  // Border
  borderTopWidth: number;
  borderTopColor: string;
  borderTopStyle: string;
  borderRightWidth: number;
  borderRightColor: string;
  borderRightStyle: string;
  borderBottomWidth: number;
  borderBottomColor: string;
  borderBottomStyle: string;
  borderLeftWidth: number;
  borderLeftColor: string;
  borderLeftStyle: string;
  borderRadius: number;

  // Spacing
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;

  // Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textDecoration: string;
  color: string;

  // Display
  display: string;
  visibility: string;
  overflow: string;

  // Effects
  boxShadow?: string;
  opacity: number;
  transform?: string;
}

/**
 * Border style definition.
 */
export interface BorderStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
}

/**
 * Fill style (solid or gradient).
 */
export interface FillStyle {
  type: 'solid' | 'gradient';
  color?: string;
  gradient?: GradientDefinition;
}

/**
 * Gradient definition.
 */
export interface GradientDefinition {
  type: 'linear' | 'radial';
  angle?: number;
  stops: GradientStop[];
}

/**
 * Gradient stop.
 */
export interface GradientStop {
  color: string;
  position: number; // 0-1
}

/**
 * Stroke/outline style.
 */
export interface StrokeStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

// =============================================================================
// FORMAT-SPECIFIC HINTS
// =============================================================================

/**
 * DOCX-specific hints.
 */
export interface DOCXHints {
  /** Word style ID */
  styleId?: string;

  /** Paragraph style ID */
  paragraphStyleId?: string;

  /** Heading level for outline */
  outlineLevel?: number;

  /** List numbering info */
  listInfo?: ListNumberingInfo;

  /** Bookmark ID */
  bookmarkId?: string;

  /** Keep lines together */
  keepLines?: boolean;

  /** Keep with next paragraph */
  keepNext?: boolean;

  /** Page break before */
  pageBreakBefore?: boolean;

  /** Explicit paragraph indentation in points */
  indent?: {
    firstLine?: number;
    left?: number;
    right?: number;
  };

  /** Footnote content */
  footnote?: string;

  /** Endnote content */
  endnote?: string;

  /** Comment */
  comment?: CommentInfo;
}

/**
 * List numbering info for DOCX.
 */
export interface ListNumberingInfo {
  /** Numbering definition ID */
  numId: number;

  /** Indent level */
  level: number;
}

/**
 * Comment info for DOCX.
 */
export interface CommentInfo {
  id?: number;
  parentId?: number;
  text: string;
  author?: string;
  initials?: string;
  date?: Date | string;
  done?: boolean;
}

// =============================================================================
// ASSETS AND RESOURCES
// =============================================================================

/**
 * Asset registry for images, fonts, embedded files.
 */
export interface AssetRegistry {
  /** Images by ID */
  images: Map<string, ImageAsset>;

  /** Fonts by family name */
  fonts: Map<string, FontAsset>;

  /** Embedded files by ID */
  embeddedFiles: Map<string, EmbeddedFile>;
}

/**
 * Image asset.
 */
export interface ImageAsset {
  id: string;
  src: string;
  mimeType: string;
  width: number;
  height: number;
  data?: ArrayBuffer;
}

/**
 * Font asset.
 */
export interface FontAsset {
  family: string;
  src: string;
  weight?: string;
  style?: string;
  data?: ArrayBuffer;
}

/**
 * Embedded file (for charts with Excel data, etc.).
 */
export interface EmbeddedFile {
  id: string;
  name: string;
  mimeType: string;
  data: ArrayBuffer;
}

/**
 * Shared style definitions.
 */
export interface StyleDefinitions {
  /** Named paragraph styles */
  paragraphStyles: Map<string, ParagraphStyleDef>;

  /** Named character styles */
  characterStyles: Map<string, CharacterStyleDef>;

  /** Table styles */
  tableStyles: Map<string, TableStyleDef>;
}

/**
 * Paragraph style definition.
 */
export interface ParagraphStyleDef {
  name: string;
  basedOn?: string;
  nextStyle?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  spacingBefore?: number;
  spacingAfter?: number;
  textAlign?: string;
  color?: string;
}

/**
 * Character style definition.
 */
export interface CharacterStyleDef {
  name: string;
  basedOn?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  textDecoration?: string;
}

/**
 * Table style definition.
 */
export interface TableStyleDef {
  name: string;
  borderColor?: string;
  borderWidth?: number;
  headerBackground?: string;
  alternateRowBackground?: string;
}

// =============================================================================
// PAGE-LEVEL FEATURES
// =============================================================================

/**
 * Background definition.
 */
export interface Background {
  type: 'color' | 'image' | 'gradient';
  color?: string;
  image?: string;
  gradient?: GradientDefinition;
}

/**
 * Section break for DOCX.
 */
export interface SectionBreak {
  type: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage';
}

/**
 * Header/footer content.
 */
export interface HeaderFooterContent {
  /** Content elements */
  elements: StructuredElement[];

  /** First-page content elements, when differentFirst is enabled */
  firstElements?: StructuredElement[];

  /** Even-page content elements, when differentOddEven is enabled */
  evenElements?: StructuredElement[];

  /** Different first page */
  differentFirst?: boolean;

  /** Different odd/even pages */
  differentOddEven?: boolean;
}

/**
 * Legend configuration for charts.
 */
export interface LegendConfig {
  position: 'top' | 'bottom' | 'left' | 'right' | 'none';
  entries?: string[];
}

/**
 * Axes configuration for charts.
 */
export interface AxesConfig {
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
}

/**
 * Single axis configuration.
 */
export interface AxisConfig {
  title?: string;
  min?: number;
  max?: number;
  gridLines?: boolean;
}

// =============================================================================
// LAYOUT INFORMATION
// =============================================================================

/**
 * CSS Grid position for a child element within a grid container.
 */
export interface GridPosition {
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
}

/**
 * Parsed grid track (column or row) definition.
 */
export interface GridTrack {
  type: 'fr' | 'px' | 'percent' | 'auto' | 'min-content' | 'max-content';
  value: number;
  computedSize?: number;
}

/**
 * Layout semantic information.
 */
export interface ExtractedLayoutInfo {
  type: 'block' | 'flex' | 'grid' | 'inline' | 'inline-flex' | 'inline-grid' | 'none';

  // Flexbox
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
  flexGap?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  order?: number;

  // CSS Grid
  gridTemplateColumns?: GridTrack[];
  gridTemplateRows?: GridTrack[];
  gridColumnGap?: number;
  gridRowGap?: number;
  gridTemplateColumnsRaw?: string;
  gridTemplateRowsRaw?: string;
  columnCount?: number;
  rowCount?: number;
  gridPosition?: GridPosition;
  gridArea?: string;

  // Computed
  childrenLayout?: 'horizontal' | 'vertical' | 'grid' | 'none';
  isLayoutContainer?: boolean;
  hasUniformChildren?: boolean;
  detectedColumns?: number;
  detectedRows?: number;
}

// =============================================================================
// EXTRACTION STATS
// =============================================================================

/**
 * Statistics from extraction/conversion process.
 */
export interface ExtractionStats {
  /** Total pages */
  pageCount: number;

  /** Total elements */
  elementCount: number;

  /** Elements by type */
  elementsByType: Record<ElementType, number>;

  /** Total images */
  imageCount: number;

  /** Total tables */
  tableCount: number;

  /** Total charts */
  chartCount: number;

  /** Conversion time in ms */
  extractionTimeMs: number;
}

// =============================================================================
// RENDER RESULT TYPES
// =============================================================================

/**
 * Result from renderToDocx().
 */
export interface DocxResult {
  /** DOCX binary */
  buffer: Buffer;

  /** MIME type */
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  /** File extension */
  extension: '.docx';

  /** Render statistics */
  stats: RenderStats;

  /** Non-fatal warnings */
  warnings: DocxWarning[];
}

/**
 * Result from renderToPdf().
 */
export interface PdfResult {
  /** PDF binary */
  buffer: Buffer;

  /** MIME type */
  mimeType: 'application/pdf';

  /** File extension */
  extension: '.pdf';

  /** Render statistics */
  stats: RenderStats;

  /** Non-fatal warnings */
  warnings: DocxWarning[];
}

/**
 * Render statistics.
 */
export interface RenderStats {
  /**
   * Number of logical source page/section groups supplied to the DOCX engine.
   * Word controls physical pagination, so this is not a rendered page count.
   * @deprecated Prefer logicalPageCount for DOCX output.
   */
  pageCount: number;
  /** Number of logical source page/section groups. */
  logicalPageCount?: number;
  elementCount: number;
  imageCount: number;
  tableCount: number;
  chartCount: number;
  fileSizeBytes: number;
  renderTimeMs: number;
  xmlTimeMs?: number;
  zipTimeMs?: number;
}

/**
 * A non-fatal warning from the render process.
 */
export interface DocxWarning {
  code: DocxWarningCode;
  message: string;
  recovery?: string;
  location?: string;
  context?: Record<string, unknown>;
}

/**
 * Render options.
 */
export interface RenderOptions {
  /** Pluggable image processing (default: no-op) */
  imageAdapter?: ImageAdapter;

  /** Pluggable chart rendering (default: data-table fallback) */
  chartAdapter?: ChartAdapter;

  /** Enable opt-in legacy input coercions before schema validation. */
  relaxed?: boolean;

  /** Structured callback for relaxed-input warnings. */
  onInputWarning?: (warning: DocxInputWarning) => void;

  /**
   * Use a fixed serializer seed for byte-stable ZIP metadata, relationship
   * numbering, revision IDs, and generated OOXML IDs. Defaults to the
   * package-level `setDeterministicMode()` value, which is enabled.
   */
  deterministic?: boolean;

  /** Override the fixed serializer seed used when deterministic mode is on. */
  deterministicSeed?: string;

  /** Request archival PDF output when rendering PDF buffers */
  pdfA?: 'PDF/A-1b' | 'PDF/A-2b';

  /** Request tagged PDF output when rendering PDF buffers */
  tagged?: boolean;

  /** Progress callback for streaming */
  onProgress?: (progress: RenderProgress) => void;

  /** Abort signal */
  signal?: AbortSignal;

  /**
   * Run a post-emit OOXML strict validator on the produced buffer and
   * throw if it finds structural violations (negative tab positions,
   * Content_Types overrides without a backing part, unresolved r:id
   * references). Defaults to `true`; pass `strict: false` to skip this
   * post-emit guard. See `validateDocxBuffer`.
   */
  strict?: boolean;

  /**
   * Override native serializer and public input resource limits. These limits
   * are checked before schema conversion and again before OOXML serialization.
   */
  resourceLimits?: Partial<ResourceLimits>;

  /**
   * External image fetching policy for native DOCX renders. Remote http(s)
   * sources are disabled by default and require `allowExternal: true`.
   * Deterministic renders force-disable network image fetches regardless.
   */
  imageFetch?: ImageFetchConfig & {
    /** Maximum simultaneous external image fetches inside one render. */
    maxConcurrentExternalFetches?: number;
    /** Aggregate external-fetch wall time allowed per render (default: 30000ms). */
    maxTotalExternalFetchTimeMs?: number;
    /** Aggregate external image bytes allowed per render (default: 50MB). */
    maxTotalExternalFetchBytes?: number;
  };
}

/**
 * Render progress information.
 *
 * `pageIndex` / `pageCount` are populated during the 'serializing' phase
 * when the native serializer is walking page-by-page, so UIs can show
 * granular progress on multi-page documents. They are omitted for
 * setup-time phases like 'validating' and 'converting'.
 */
export interface RenderProgress {
  phase: 'validating' | 'converting' | 'serializing' | 'optimizing';
  percent: number;
  message?: string;
  pageIndex?: number;
  pageCount?: number;
}

/**
 * Pluggable image processing adapter.
 */
export interface ImageAdapter {
  /** Rasterize SVG to PNG buffer */
  rasterizeSvg?(svg: string, width: number, height: number): Promise<Buffer>;

  /** Convert image format (WebP/HEIC → PNG) */
  convertFormat?(buffer: Buffer, fromMime: string, toMime: string): Promise<Buffer>;

  /** Fetch remote image */
  fetchImage?(url: string, timeoutMs?: number): Promise<{ buffer: Buffer; mimeType: string }>;
}

/**
 * Pluggable chart rendering adapter.
 */
export interface ChartAdapter {
  /** Render chart data to PNG image buffer */
  renderChart?(chart: ChartRenderInput, width: number, height: number): Promise<Buffer>;
}

/**
 * Input for chart rendering.
 */
export interface ChartRenderInput {
  chartType: string;
  title?: string;
  series: Array<{ name: string; values: number[]; color?: string }>;
  categories?: string[];
  legend?: { position: string };
  axes?: { x?: { title?: string }; y?: { title?: string; min?: number; max?: number } };
}

/**
 * Hydration options for template filling.
 */
export interface HydrationOptions {
  /** How to handle missing placeholders */
  onMissing?: 'leave' | 'remove' | 'error';
  /** Template marker dialect to process. Default: 'auto'. */
  syntax?: 'mustache' | 'office' | 'auto';
  imageAdapter?: ImageAdapter;
  /** Resource ceilings for untrusted DOCX template archives. */
  archiveLimits?: {
    /** Maximum compressed template size. Default: 25 MiB. */
    maxCompressedBytes?: number;
    /** Maximum ZIP entry count. Default: 2,048. */
    maxEntries?: number;
    /** Maximum expanded bytes for one file part. Default: 16 MiB. */
    maxPartBytes?: number;
    /** Maximum expanded bytes across all file parts. Default: 100 MiB. */
    maxTotalExpandedBytes?: number;
  };
}

// =============================================================================
// BATCH GENERATION
// =============================================================================

export interface BatchOptions {
  /** How to name output files. Receives the data item and index. */
  fileName?: (item: Record<string, unknown>, index: number) => string;
  /** Output format: individual buffers or single ZIP archive. Default: 'zip' */
  output?: 'buffers' | 'zip';
  /** Max concurrent renders. Default: 1 (free), up to 32 (pro). */
  concurrency?: number;
  /** Progress callback. Pro only. */
  onProgress?: (completed: number, total: number, current?: string) => void;
  /** Streaming ZIP output. Pro only. */
  stream?: boolean;
}

export interface BatchResult {
  results: BatchItemResult[];
  zip?: Buffer;
  totalTime: number;
  successCount: number;
  failureCount: number;
}

export interface BatchItemResult {
  index: number;
  fileName: string;
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

/**
 * Validation result from validateDocxDocument().
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: { elementsChecked: number; errorsFound: number; warningsFound: number };
}

/**
 * A single validation issue.
 */
export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: DocxWarningCode;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface DocxInputWarning {
  code: DocxWarningCode;
  message: string;
  path: string;
  from?: unknown;
  to?: unknown;
}
