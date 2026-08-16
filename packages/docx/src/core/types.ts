/**
 * @runstamp/polyglot-core - Types
 * ================================
 * Extended Virtual Layout Tree for multi-format output (PDF, PPTX, DOCX)
 *
 * Design Principle: These types EXTEND the existing VLT, not replace it.
 * The PDF engine remains completely untouched.
 */

// =============================================================================
// OUTPUT FORMATS
// =============================================================================

export type OutputFormat = 'pdf' | 'pptx' | 'docx';

// =============================================================================
// LAYOUT NODE TYPES (Extended from @runstamp/types)
// =============================================================================

/**
 * Extended node types for Polyglot support
 */
export type PolyglotNodeType =
  | 'document'    // Root document node
  | 'page'        // Page/slide container
  | 'block'       // Generic block element
  | 'text'        // Text content
  | 'heading'     // Semantic heading
  | 'paragraph'   // Semantic paragraph
  | 'image'       // Image element
  | 'table'       // Table container
  | 'row'         // Table row
  | 'cell'        // Table cell
  | 'list'        // List container
  | 'list-item'   // List item
  | 'chart'       // Chart/visualization
  | 'shape'       // Vector shape
  | 'fragment';   // Content fragment

// =============================================================================
// GEOMETRY
// =============================================================================

/**
 * Absolute geometry in CSS pixels
 * All coordinates are relative to the page/slide
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// TEXT CONTENT
// =============================================================================

/**
 * Rich text span with formatting
 */
export interface RichTextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  link?: string;
}

/**
 * Text content with optional rich formatting
 */
export interface TextContent {
  /** Plain text content */
  plain: string;
  /** Rich text spans (for formatted content) */
  spans?: RichTextSpan[];
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Line height multiplier */
  lineHeight?: number;
}

// =============================================================================
// STYLE PROPERTIES
// =============================================================================

/**
 * Common style properties applicable to all formats
 */
export interface CommonStyles {
  // Background
  backgroundColor?: string;
  backgroundImage?: string;

  // Border
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;

  // Individual borders
  borderTop?: { width: number; color: string; style: string };
  borderRight?: { width: number; color: string; style: string };
  borderBottom?: { width: number; color: string; style: string };
  borderLeft?: { width: number; color: string; style: string };

  // Spacing
  padding?: number | { top: number; right: number; bottom: number; left: number };
  margin?: number | { top: number; right: number; bottom: number; left: number };

  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';

  // Shadow
  boxShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };

  // Opacity
  opacity?: number;
}

// =============================================================================
// FORMAT-SPECIFIC HINTS
// =============================================================================

/**
 * PPTX-specific rendering hints
 */
export interface PPTXHints {
  /** Shape type for PowerPoint */
  shapeType?: 'textbox' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'custom';

  /** Master slide reference */
  masterSlide?: string;

  /** Slide layout reference */
  slideLayout?: string;

  /** Animation specification */
  animation?: {
    type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'none';
    delay?: number;
    duration?: number;
  };

  /** Speaker notes content */
  speakerNotes?: string;

  /** Whether this element should be grouped */
  groupId?: string;

  /** Z-order (layering) */
  zOrder?: number;
}

/**
 * DOCX-specific rendering hints
 */
export interface DOCXHints {
  /** Word style ID (e.g., "Heading1", "Normal", "Caption") */
  styleId?: string;

  /** Heading level (1-9) */
  headingLevel?: number;

  /** List level for nested lists (0-indexed) */
  listLevel?: number;

  /** List type */
  listType?: 'bullet' | 'number' | 'letter' | 'roman';

  /** Native Word keep-together property */
  keepLines?: boolean;

  /** Native Word keep-with-next property */
  keepNext?: boolean;

  /** Page break before this element */
  pageBreakBefore?: boolean;

  /** Section break type */
  sectionBreak?: 'continuous' | 'nextPage' | 'evenPage' | 'oddPage';

  /** Bookmark ID for cross-references */
  bookmarkId?: string;

  /** Table of contents level (0 = exclude) */
  tocLevel?: number;

  /** Footnote content (creates a footnote reference) */
  footnote?: string;

  /** Comment/annotation */
  comment?: {
    text: string;
    author?: string;
    date?: Date;
  };

  /** Cross-reference to a bookmark */
  crossReference?: {
    bookmarkId: string;
    format?: 'page' | 'text' | 'number';
  };

  /** Whether this is a header element */
  isHeader?: boolean;

  /** Whether this is a footer element */
  isFooter?: boolean;
}

/**
 * Render-as hints for format-specific behavior
 */
export interface RenderAsHints {
  pdf?: 'default' | 'vector' | 'raster';
  pptx?: 'native' | 'shape' | 'image' | 'chart';
  docx?: 'paragraph' | 'table' | 'image' | 'drawing';
}

// =============================================================================
// POLYGLOT LAYOUT NODE
// =============================================================================

/**
 * The Polyglot Layout Node - Extended VLT for multi-format output
 *
 * This is the core data structure that serializers consume.
 * Each serializer (PDF, PPTX, DOCX) interprets this tree according
 * to its format's capabilities and conventions.
 */
export interface PolyglotNode {
  /** Unique identifier */
  id: string;

  /** Node type */
  type: PolyglotNodeType;

  /** Absolute geometry (CSS pixels, relative to page/slide) */
  rect: Rect;

  /** Child nodes */
  children?: PolyglotNode[];

  /** Parent node ID */
  parentId?: string;

  // Content
  /** Text content (for text/heading/paragraph nodes) */
  textContent?: TextContent;

  /** Image source (for image nodes) */
  imageSrc?: string;

  /** Image data as base64 (for embedded images) */
  imageData?: string;

  /** Alt text for accessibility */
  altText?: string;

  // Table-specific
  /** Row span for table cells */
  rowSpan?: number;

  /** Column span for table cells */
  colSpan?: number;

  /** Table column widths (percentages or pixels) */
  columnWidths?: number[];

  /** Whether this row is a table header (repeats on each page) */
  isTableHeader?: boolean;

  // List-specific
  /** List item marker (bullet, number, etc.) */
  listMarker?: string;

  /** List item index (for numbered lists) */
  listIndex?: number;

  // Styles
  /** Common style properties */
  styles?: CommonStyles;

  // Format-specific hints
  /** PPTX-specific rendering hints */
  pptx?: PPTXHints;

  /** DOCX-specific rendering hints */
  docx?: DOCXHints;

  /** Render-as hints for format-specific behavior */
  renderAs?: RenderAsHints;

  // Chart-specific (for native chart support)
  /** Chart data for native chart rendering */
  chartData?: {
    type: 'bar' | 'column' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';
    series: Array<{
      name: string;
      data: Array<{ x: string | number; y: number }>;
      color?: string;
    }>;
    xAxis?: { label?: string; categories?: string[] };
    yAxis?: { label?: string; min?: number; max?: number };
    showLegend?: boolean;
    legendPosition?: 'top' | 'bottom' | 'left' | 'right';
    showDataLabels?: boolean;
    title?: string;
  };

  // Metadata
  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Original React component name (for debugging) */
  componentName?: string;

  /** Original props (for debugging) */
  originalProps?: Record<string, unknown>;
}

// =============================================================================
// POLYGLOT DOCUMENT
// =============================================================================

/**
 * Page/slide dimensions
 */
export interface PageDimensions {
  /** Width in CSS pixels */
  width: number;
  /** Height in CSS pixels */
  height: number;
  /** Margin in CSS pixels */
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

/**
 * Page/slide in the document
 */
export interface PolyglotPage {
  /** Page index (0-based) */
  index: number;

  /** Page dimensions */
  dimensions: PageDimensions;

  /** Root node for this page's content */
  content: PolyglotNode;

  /** PPTX: Slide master reference */
  masterSlide?: string;

  /** PPTX: Slide layout reference */
  slideLayout?: string;

  /** PPTX: Speaker notes */
  speakerNotes?: string;

  /** DOCX: Section properties (headers, footers, etc.) */
  sectionProperties?: {
    headerContent?: PolyglotNode;
    footerContent?: PolyglotNode;
    pageNumbering?: {
      start?: number;
      format?: 'decimal' | 'roman' | 'letter';
    };
  };
}

/**
 * The complete Polyglot Document
 *
 * This is the top-level structure that serializers receive.
 * It contains all pages/slides and document-level metadata.
 */
export interface PolyglotDocument {
  /** Document version for compatibility */
  version: '1.0';

  /** Target output format */
  targetFormat: OutputFormat;

  /** Document metadata */
  metadata: DocumentMetadata;

  /** Default page dimensions */
  defaultDimensions: PageDimensions;

  /** All pages/slides in the document */
  pages: PolyglotPage[];

  /** Flat map of all nodes by ID for O(1) lookup */
  nodeMap: Map<string, PolyglotNode>;

  /** Build timestamp */
  buildTimestamp: number;

  /** Debug information */
  debug?: {
    reactNodesProcessed: number;
    polyglotNodesCreated: number;
    buildTimeMs: number;
  };
}

// =============================================================================
// SERIALIZER INTERFACE
// =============================================================================

/**
 * Options for serializers
 */
export interface SerializerOptions {
  /** Enable debug output */
  debug?: boolean;

  /** Image quality (0-100) for compression */
  imageQuality?: number;

  /** PPTX-specific options */
  pptx?: {
    /** Default slide master */
    defaultMaster?: string;
    /** Company name for metadata */
    company?: string;
    /** Slide size preset */
    slideSize?: '16x9' | '4x3' | 'custom';
    /** Custom slide width (inches) */
    slideWidth?: number;
    /** Custom slide height (inches) */
    slideHeight?: number;
    /**
     * Theme configuration (PPT-02 requirement - Phase 15)
     * Use preset themes: 'office', 'mckinsey', 'bcg'
     * Or provide a custom SlideTheme for enterprise branding.
     */
    theme?: 'office' | 'mckinsey' | 'bcg';
  };

  /** DOCX-specific options */
  docx?: {
    /** Base styles to include */
    includeBaseStyles?: boolean;
    /**
     * Track changes configuration (DOC-02 requirement)
     * When enabled, revision markers in text are converted to Word Track Changes.
     * Markers: {{+inserted+}}, {{-deleted-}}, {{~old~new~}}
     */
    trackChanges?: {
      /** Author name for tracked changes */
      author?: { name: string; initials?: string };
      /** Date for tracked changes (defaults to now) */
      date?: Date;
    } | boolean;
    /** Default font */
    defaultFont?: string;
    /** Default font size (points) */
    defaultFontSize?: number;
    /**
     * Word styles configuration (DOC-01 requirement - Phase 16)
     * Styles appear in Word's Styles gallery and support cascading updates.
     * Use preset style sets: 'office', 'legal', 'corporate', 'academic'
     * Or provide a custom WordStyleSet for full control.
     */
    styleSet?: 'office' | 'legal' | 'corporate' | 'academic' | import('./word-styles').WordStyleSet;
  };
}

/**
 * Result of serialization
 */
export interface SerializerResult {
  /** The generated file as a buffer */
  buffer: Buffer;

  /** MIME type */
  mimeType: string;

  /** Suggested filename extension */
  extension: string;

  /** Statistics */
  stats: {
    pageCount: number;
    nodeCount: number;
    serializationTimeMs: number;
    fileSizeBytes: number;
  };

  /** Warnings generated during serialization */
  warnings: string[];
}

/**
 * Serializer interface
 * Each format (PPTX, DOCX) implements this interface
 */
export interface Serializer {
  /** The output format this serializer produces */
  format: OutputFormat;

  /** Serialize a PolyglotDocument to the target format */
  serialize(doc: PolyglotDocument, options?: SerializerOptions): Promise<SerializerResult>;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/** Overflow strategy for content that exceeds page bounds */
export type OverflowStrategy = 'clip' | 'shrink-to-fit' | 'emergency-split' | 'tile';

/** Tile information for horizontal overflow handling */
export interface TileInfo {
  /** Column index (0-based) for horizontal position */
  tileColumn: number;
  /** Row index (0-based) for vertical position */
  tileRow: number;
  /** Total columns in the tiled content */
  totalColumns: number;
  /** Total rows in the tiled content */
  totalRows: number;
  /** Original content width before tiling */
  originalWidth: number;
  /** Original content height before tiling */
  originalHeight: number;
}

/** Widow/orphan control configuration */
export interface WidowOrphanConfig {
  /** Minimum lines that must stay at bottom of page (orphan prevention) */
  minLinesBeforeBreak: number;
  /** Minimum lines that must appear at top of next page (widow prevention) */
  minLinesAfterBreak: number;
}

/** Timeout and resilience configuration */
export interface TimeoutConfig {
  /** Global timeout in milliseconds (default 30000). Set to 0 to disable. */
  globalTimeout: number;
  /** Heartbeat interval - max time without progress before abort (default 5000). Set to 0 to disable. */
  heartbeatInterval: number;
  /** Max placement attempts per node before skipping (default 10) */
  maxPlacementAttempts: number;
}

/** Pagination statistics */
export interface PaginationStats {
  totalNodes: number;
  pagesCreated: number;
  tablesSplit: number;
  overflowNodes: number;
  cellMapOperations: number;
  textFragmentations: number;
  widowOrphanAdjustments: number;
  shrinkToFitApplied: number;
  /** Number of horizontal tiles created for wide content */
  tilesCreated: number;
  /** Total pagination time in milliseconds */
  totalTimeMs: number;
  /** Number of nodes skipped due to impossible layout */
  nodesSkipped: number;
  /** Number of heartbeat checks performed */
  heartbeatChecks: number;
}

/** Pagination interruption reasons */
export type PaginationInterruptReason = 'timeout' | 'heartbeat' | 'impossible-layout' | 'max-iterations';
