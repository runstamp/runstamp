/**
 * DocxDocument Zod Schema
 *
 * JSON-first schema for DOCX generation. AI agents produce this directly.
 * No React, no DOM, no coordinates — pure document semantics.
 */

import { z } from 'zod';

// =============================================================================
// PRIMITIVES
// =============================================================================

export const ColorValue = z.string().describe('DOCX color: 6-character OOXML hex without # (for example FF0000), or auto');
export const FontSizeValue = z.custom<number>(
  (value) => typeof value === 'number',
  { message: 'Expected a number' },
).describe('DOCX font size in positive finite points');

export const BorderStyleSchema = z.object({
  width: z.number().default(1),
  color: ColorValue.default('000000'),
  style: z.enum(['solid', 'dashed', 'dotted', 'double', 'none']).default('solid'),
});

export const SpacingSchema = z.object({
  top: z.number().default(0),
  right: z.number().default(0),
  bottom: z.number().default(0),
  left: z.number().default(0),
});

// =============================================================================
// TEXT
// =============================================================================

const TextRunStylePropertiesSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: FontSizeValue.optional(),
  fontWeight: z.union([z.enum(['normal', 'bold']), z.number()]).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  color: ColorValue.optional(),
  backgroundColor: ColorValue.optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through', 'underline line-through']).optional(),
  superscript: z.boolean().optional(),
  subscript: z.boolean().optional(),
  letterSpacing: z.number().optional(),
});

export const TextRunStyleSchema = TextRunStylePropertiesSchema.optional();

const TextRunRevisionSchema = z.object({
  type: z.enum(['insert', 'delete', 'format']),
  id: z.number().int().positive().optional(),
  author: z.string().optional(),
  date: z.string().datetime({ offset: true }).optional(),
  beforeStyle: TextRunStylePropertiesSchema.optional(),
});

export const CommentInfoSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  parentId: z.number().int().nonnegative().optional(),
  text: z.string(),
  author: z.string().optional(),
  initials: z.string().optional(),
  date: z.union([z.string().datetime({ offset: true }), z.date()]).optional(),
  done: z.boolean().optional(),
});

const BaseRevisionMetadataSchema = z.object({
  id: z.number().int().positive().optional(),
  author: z.string().optional(),
  date: z.string().datetime({ offset: true }).optional(),
});

const ParagraphRevisionPropertiesSchema = z.object({
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  keepLines: z.boolean().optional(),
  keepNext: z.boolean().optional(),
  pageBreakBefore: z.boolean().optional(),
  indent: z.object({
    firstLine: z.number().optional().describe('Points'),
    left: z.number().optional(),
    right: z.number().optional(),
  }).optional(),
});

export const ParagraphRevisionSchema = BaseRevisionMetadataSchema.extend({
  type: z.enum(['insert', 'delete', 'property', 'moveFrom', 'moveTo']),
  moveName: z.string().min(1).optional(),
  before: ParagraphRevisionPropertiesSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.type === 'property' && !value.before) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Paragraph property revisions require a before snapshot',
      path: ['before'],
    });
  }
  if ((value.type === 'moveFrom' || value.type === 'moveTo') && !value.moveName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Move revisions require moveName',
      path: ['moveName'],
    });
  }
});

const TableRevisionPropertiesSchema = z.object({
  caption: z.string().optional(),
  tableDescription: z.string().optional(),
  tableCaption: z.string().optional(),
});

export const TableRevisionSchema = BaseRevisionMetadataSchema.extend({
  type: z.literal('property'),
  before: TableRevisionPropertiesSchema.optional(),
}).superRefine((value, ctx) => {
  if (!value.before) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Table property revisions require a before snapshot',
      path: ['before'],
    });
  }
});

export const TableCellRevisionSchema = BaseRevisionMetadataSchema.extend({
  type: z.enum(['insert', 'delete']),
});

export const TableRowRevisionSchema = BaseRevisionMetadataSchema.extend({
  type: z.enum(['insert', 'delete']),
});

export const TextRunSchema = z.object({
  text: z.string(),
  style: TextRunStyleSchema.optional(),
  hyperlink: z.string().optional(),
  revision: TextRunRevisionSchema.optional(),
}).strict();

export const RevisionInfoSchema = z.object({
  author: z.string().optional(),
  date: z.string().datetime({ offset: true }).optional(),
  rsid: z.string().regex(/^[0-9A-Fa-f]{8}$/).optional().describe('Track changes session ID'),
});

// =============================================================================
// ELEMENT STYLE
// =============================================================================

export const BaseStyleSchema = z.object({
  color: ColorValue.optional(),
  fontFamily: z.string().optional(),
  fontSize: FontSizeValue.optional(),
  fontWeight: z.union([z.enum(['normal', 'bold']), z.number()]).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through', 'underline line-through']).optional(),
  backgroundColor: ColorValue.optional(),
  border: BorderStyleSchema.optional(),
  padding: SpacingSchema.optional(),
  margin: SpacingSchema.optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  lineHeight: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  comment: CommentInfoSchema.optional(),
}).strict().optional();

// =============================================================================
// ELEMENTS
// =============================================================================

export const HeadingElementSchema = z.object({
  type: z.literal('heading'),
  level: z.number().int().min(1).max(6),
  text: z.string().optional(),
  runs: z.array(TextRunSchema).optional(),
  revision: ParagraphRevisionSchema.optional(),
  comment: CommentInfoSchema.optional(),
  style: BaseStyleSchema,
  bookmarkId: z.string().optional().describe('Anchor for cross-references and TOC'),
  footnote: z.string().optional(),
  endnote: z.string().optional(),
  keepNext: z.boolean().optional().describe('Keep with next paragraph'),
  pageBreakBefore: z.boolean().optional(),
}).strict();

export const ParagraphElementSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string().optional(),
  runs: z.array(TextRunSchema).optional(),
  revision: ParagraphRevisionSchema.optional(),
  comment: CommentInfoSchema.optional(),
  style: BaseStyleSchema,
  footnote: z.string().optional(),
  endnote: z.string().optional(),
  keepLines: z.boolean().optional().describe('Keep all lines on same page'),
  keepNext: z.boolean().optional(),
  pageBreakBefore: z.boolean().optional(),
  indent: z.object({
    firstLine: z.number().optional().describe('Points'),
    left: z.number().optional(),
    right: z.number().optional(),
  }).optional(),
}).strict();

// List items allow nesting of more list items (recursive).
// We break the cycle by having list items only nest lists, not arbitrary elements.
interface ListItemInput {
  text?: string;
  runs?: Array<{ text: string; style?: unknown; hyperlink?: string }>;
  nestedList?: {
    type: 'list';
    listType?: string;
    start?: number;
    items: ListItemInput[];
  };
}

const ListItemSchema: z.ZodType<ListItemInput> = z.lazy(() =>
  z.object({
    text: z.string().optional(),
    runs: z.array(TextRunSchema).optional(),
    nestedList: z.object({
      type: z.literal('list'),
      listType: z.enum(['bullet', 'number', 'letter', 'roman']).default('bullet'),
      start: z.number().int().default(1),
      items: z.array(ListItemSchema),
    }).optional(),
  })
);

export const ListElementSchema = z.object({
  type: z.literal('list'),
  listType: z.enum(['bullet', 'number', 'letter', 'roman']).default('bullet'),
  start: z.number().int().default(1),
  items: z.array(ListItemSchema),
  style: BaseStyleSchema,
}).strict();

export const TableCellStyleSchema = z.object({
  backgroundColor: ColorValue.optional(),
  color: ColorValue.optional(),
  fontFamily: z.string().optional(),
  fontSize: FontSizeValue.optional(),
  fontWeight: z.union([z.enum(['normal', 'bold']), z.number()]).optional(),
  border: BorderStyleSchema.optional(),
  borderTop: BorderStyleSchema.optional(),
  borderRight: BorderStyleSchema.optional(),
  borderBottom: BorderStyleSchema.optional(),
  borderLeft: BorderStyleSchema.optional(),
  padding: SpacingSchema.optional(),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
}).optional();

export const TableCellSchema = z.object({
  text: z.string().optional(),
  runs: z.array(TextRunSchema).optional(),
  elements: z.lazy(() => z.array(DocxElementSchema)).optional(),
  revision: TableCellRevisionSchema.optional(),
  colSpan: z.number().int().min(1).default(1),
  rowSpan: z.number().int().min(1).default(1),
  /** Internal stable coordinates used by tracked-change compilation. */
  col: z.number().int().nonnegative().optional(),
  /** Internal stable coordinates used by tracked-change compilation. */
  row: z.number().int().nonnegative().optional(),
  style: TableCellStyleSchema,
}).strict();

export const TableElementSchema = z.object({
  type: z.literal('table'),
  columns: z.array(z.object({
    width: z.number().optional().describe('Points. Auto-calculated if omitted.'),
  })).optional(),
  rows: z.array(z.object({
    cells: z.array(TableCellSchema),
    isHeader: z.boolean().optional(),
    revision: TableRowRevisionSchema.optional(),
  })),
  caption: z.string().optional(),
  tableDescription: z.string().optional().describe('Accessibility description for the table (<w:tblDescription>)'),
  tableCaption: z.string().optional().describe('Accessibility caption for the table (<w:tblCaption>)'),
  repeatHeaders: z.boolean().default(true).describe('Repeat header rows across pages'),
  keepTogether: z.boolean().optional().describe('Keep a short table on one page when Word can do so'),
  keepWithNext: z.boolean().optional().describe('Keep the final table row with the following block when Word can do so'),
  tableStyle: z.enum([
    'plain', 'striped', 'bordered', 'modern', 'minimal', 'corporate',
  ]).optional(),
  revision: TableRevisionSchema.optional(),
  style: BaseStyleSchema,
}).strict();

export const ImageElementSchema = z.object({
  type: z.literal('image'),
  src: z.union([
    z.string(),
    z.custom<Buffer>((value) => Buffer.isBuffer(value), { message: 'Expected image Buffer' }),
  ]).describe('HTTPS URL, data:image/... URI, or image Buffer'),
  alt: z.string().optional(),
  width: z.number().optional().describe('Points'),
  height: z.number().optional().describe('Points'),
  decorative: z.boolean().optional().describe('Mark as decorative — screen readers skip this image'),
  alignment: z.enum(['left', 'center', 'right', 'inline']).optional(),
  caption: z.string().optional(),
  floating: z.object({
    wrap: z.enum(['square', 'tight', 'through', 'topAndBottom', 'behind', 'inFront']).optional(),
    position: z.enum(['left', 'right', 'center']).optional(),
    horizontalAnchor: z.enum(['page', 'margin', 'column', 'character']).optional(),
    verticalAnchor: z.enum(['page', 'margin', 'paragraph', 'line']).optional(),
    horizontalPosition: z.union([
      z.enum(['left', 'center', 'right', 'inside', 'outside']),
      z.number(),
    ]).optional(),
    verticalPosition: z.union([
      z.enum(['top', 'center', 'bottom', 'inside', 'outside']),
      z.number(),
    ]).optional(),
    distanceFromText: z.object({
      top: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
      right: z.number().optional(),
    }).optional(),
    allowOverlap: z.boolean().optional(),
    lockAnchor: z.boolean().optional(),
    layoutInCell: z.boolean().optional(),
  }).optional(),
  style: BaseStyleSchema,
}).strict();

export const ChartElementSchema = z.object({
  type: z.literal('chart'),
  chartType: z.enum(['bar', 'column', 'line', 'area', 'pie', 'doughnut', 'scatter', 'radar']),
  title: z.string().optional(),
  series: z.array(z.object({
    name: z.string(),
    values: z.array(z.number()),
    color: ColorValue.optional(),
  })),
  categories: z.array(z.string()).optional(),
  width: z.number().optional().describe('Points'),
  height: z.number().optional().describe('Points'),
  legend: z.object({
    position: z.enum(['top', 'bottom', 'left', 'right', 'none']).default('bottom'),
  }).optional(),
  axes: z.object({
    x: z.object({
      title: z.string().optional(),
      gridLines: z.boolean().optional(),
    }).optional(),
    y: z.object({
      title: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      gridLines: z.boolean().optional(),
    }).optional(),
  }).optional(),
  style: BaseStyleSchema,
}).strict();

export const ShapeElementSchema = z.object({
  type: z.literal('shape'),
  shapeType: z.enum(['rectangle', 'ellipse', 'triangle', 'diamond', 'line', 'arrow']),
  width: z.number().describe('Points'),
  height: z.number().describe('Points'),
  fill: z.object({
    type: z.enum(['solid', 'gradient']).default('solid'),
    color: ColorValue.optional(),
    gradient: z.object({
      type: z.enum(['linear', 'radial']).default('linear'),
      angle: z.number().optional(),
      stops: z.array(z.object({
        color: ColorValue,
        position: z.number().min(0).max(1),
      })),
    }).optional(),
  }).optional(),
  stroke: z.object({
    width: z.number().default(1),
    color: ColorValue.default('000000'),
    style: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
  }).optional(),
  text: z.string().optional(),
  runs: z.array(TextRunSchema).optional(),
  style: BaseStyleSchema,
}).strict();

export const CodeBlockElementSchema = z.object({
  type: z.literal('code-block'),
  code: z.string(),
  language: z.string().optional(),
  showLineNumbers: z.boolean().optional(),
  style: BaseStyleSchema,
}).strict();

export const PageBreakElementSchema = z.object({
  type: z.literal('page-break'),
}).strict();

export const DividerElementSchema = z.object({
  type: z.literal('divider'),
  style: z.enum(['solid', 'dashed', 'dotted', 'double']).optional(),
  color: ColorValue.optional(),
  thickness: z.number().optional(),
}).strict();

// DocxElementSchema is self-referencing via ContainerElement.
// We define it as a z.ZodType with an explicit interface to break the cycle.
interface DocxElementInput {
  type: string;
  [key: string]: unknown;
}

// Build element schemas without container first
const nonRecursiveElements = [
  HeadingElementSchema,
  ParagraphElementSchema,
  ListElementSchema,
  TableElementSchema,
  ImageElementSchema,
  ChartElementSchema,
  ShapeElementSchema,
  CodeBlockElementSchema,
  PageBreakElementSchema,
  DividerElementSchema,
] as const;

export const DocxElementSchema: z.ZodType<DocxElementInput> = z.lazy(() =>
  z.union([
    ...nonRecursiveElements,
    z.object({
      type: z.literal('container'),
      layout: z.enum(['vertical', 'horizontal', 'grid']).default('vertical'),
      columns: z.number().int().min(1).max(12).optional().describe('For grid layout'),
      gap: z.number().optional().describe('Points between children'),
      keepTogether: z.boolean().optional().describe('Keep a bounded vertical group on one page when Word can do so'),
      children: z.array(DocxElementSchema),
      style: BaseStyleSchema,
    }).strict(),
  ]) as z.ZodType<DocxElementInput>
);

// =============================================================================
// PAGE
// =============================================================================

export const HeaderFooterDefSchema = z.object({
  content: z.lazy(() => z.array(DocxElementSchema)).optional(),
  text: z.string().optional().describe('Simple text shorthand'),
  style: BaseStyleSchema,
  includePageNumber: z.boolean().optional(),
  pageNumberFormat: z.enum(['decimal', 'roman', 'romanUpper', 'letter', 'letterUpper']).optional(),
});

export const DocxPageSchema = z.object({
  elements: z.array(DocxElementSchema).min(1),
  sectionBreak: z.enum(['nextPage', 'continuous', 'evenPage', 'oddPage']).optional(),
  header: HeaderFooterDefSchema.optional(),
  footer: HeaderFooterDefSchema.optional(),
  headerFooter: z.object({
    header: HeaderFooterDefSchema.optional(),
    footer: HeaderFooterDefSchema.optional(),
  }).optional().describe('Legacy shorthand for page header/footer'),
  dimensions: z.object({
    width: z.number().optional().describe('Points'),
    height: z.number().optional().describe('Points'),
    orientation: z.enum(['portrait', 'landscape']).optional(),
  }).optional().describe('Override document-level page size for this section'),
}).strict();

// =============================================================================
// DOCUMENT
// =============================================================================

export const DocxThemeSchema = z.object({
  preset: z.enum(['corporate', 'modern', 'classic', 'academic', 'minimal', 'dark']).optional(),
  colors: z.object({
    primary: ColorValue.optional(),
    secondary: ColorValue.optional(),
    accent: ColorValue.optional(),
    text: ColorValue.optional(),
    background: ColorValue.optional(),
  }).optional(),
  fonts: z.object({
    heading: z.string().optional(),
    body: z.string().optional(),
    monospace: z.string().optional(),
  }).optional(),
});

export const DocxTemplateSchema = z.enum([
  'blank', 'letter', 'report', 'memo', 'invoice', 'proposal',
  'resume', 'newsletter', 'manual', 'thesis',
]).optional();

export const TableOfContentsSchema = z.object({
  title: z.string().optional(),
  maxLevel: z.number().int().min(1).max(6).default(3),
  showPageNumbers: z.boolean().optional(),
  hyperlinks: z.boolean().optional(),
  leader: z.enum(['dot', 'dash', 'underscore', 'none']).optional(),
  position: z.enum(['start', 'after-cover']).optional(),
});

export const DocxDocumentSchema = z.object({
  type: z.literal('DocxDocument').default('DocxDocument'),

  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    subject: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    creator: z.string().optional(),
    custom: z.record(z.string(), z.string()).optional(),
    language: z.string().optional().describe('BCP 47 language tag (e.g. "en-US") — sets <w:lang> on all runs'),
  }).optional(),

  accessible: z.union([
    z.boolean(),
    z.object({
      level: z.enum(['A', 'AA', 'AAA']).default('AA'),
      language: z.string().optional(),
      title: z.string().optional(),
      enforceHeadingHierarchy: z.boolean().optional(),
      enforceTableHeaders: z.boolean().optional(),
    }).strict(),
  ]).optional(),

  // Page setup (defaults to A4 portrait)
  pageSize: z.enum(['a4', 'letter', 'legal', 'a3', 'a5']).default('a4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  margins: SpacingSchema.optional().describe('Points. Defaults: 72pt (1 inch) on all sides'),

  // Look & feel
  theme: DocxThemeSchema.optional(),
  template: DocxTemplateSchema,

  // Document-level features
  tableOfContents: z.union([
    z.boolean(),
    TableOfContentsSchema,
  ]).optional(),

  header: HeaderFooterDefSchema.optional().describe('Default header for all pages'),
  footer: HeaderFooterDefSchema.optional().describe('Default footer for all pages'),
  differentFirstPage: z.boolean().optional().describe('Use different header/footer on first page'),
  firstPageHeader: HeaderFooterDefSchema.optional(),
  firstPageFooter: HeaderFooterDefSchema.optional(),
  oddPageHeader: HeaderFooterDefSchema.optional(),
  oddPageFooter: HeaderFooterDefSchema.optional(),
  evenPageHeader: HeaderFooterDefSchema.optional(),
  evenPageFooter: HeaderFooterDefSchema.optional(),

  watermark: z.union([
    z.string().describe('Simple text watermark'),
    z.object({
      text: z.string().optional(),
      image: z.string().optional().describe('URL or data URI'),
      opacity: z.number().min(0).max(1).default(0.25),
      rotation: z.number().default(-45),
    }),
  ]).optional(),

  revisionInfo: RevisionInfoSchema.optional(),

  // Content
  pages: z.array(DocxPageSchema).min(1),

  // Render options
  options: z.object({
    trackChanges: z.boolean().optional(),
    columns: z.number().int().min(1).max(4).optional().describe('Multi-column layout'),
    footnoteStyle: z.enum(['numeric', 'alphabetic', 'roman']).optional(),
    pagination: z.enum(['preserve', 'reflow']).optional()
      .describe('Preserve authoring page groups as sections, or reflow compatible groups into the Word document flow'),
  }).optional(),
}).strict();

// =============================================================================
// HTML-TO-DOCX OPTIONS
// =============================================================================

export const HtmlDocxOptionsSchema = z.object({
  /** DOCX output options (page size, margins, fonts). */
  docxOptions: z.object({
    pageSize: z.enum(['a4', 'letter', 'legal', 'a3', 'a5']).optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    margins: SpacingSchema.optional().describe('Points. Defaults: 72pt (1 inch) on all sides'),
    defaultFont: z.string().optional(),
    defaultFontSize: z.number().optional().describe('Points'),
  }).optional(),

  /** Image handling options (Pro). */
  imageOptions: z.object({
    fetchTimeout: z.number().int().min(1000).max(60000).optional().describe('ms, default: 10000'),
    maxImageSize: z.number().int().min(1024).optional().describe('bytes, default: 10MB'),
    defaultWidth: z.number().optional().describe('EMU, default: 6 inches'),
  }).optional(),

  /** CSS inline style handling. 'inline' processes style="" attributes (Pro). */
  cssMode: z.enum(['inline', 'ignore']).optional().describe("default: 'inline'"),

  /** Base URL for resolving relative image/link URLs. */
  baseUrl: z.string().optional(),
}).optional();

export type HtmlDocxOptions = z.infer<typeof HtmlDocxOptionsSchema>;

// =============================================================================
// INFERRED TYPES
// =============================================================================

type ParsedDocxDocument = z.infer<typeof DocxDocumentSchema>;
/**
 * Public input contract. The parser materializes `orientation: "portrait"`,
 * but callers may omit it just as they can in JSON input.
 */
export type DocxDocument = Omit<ParsedDocxDocument, 'orientation'> & {
  orientation?: ParsedDocxDocument['orientation'];
};
export type DocxElement = z.infer<typeof DocxElementSchema>;
export type DocxPage = z.infer<typeof DocxPageSchema>;
export type DocxTheme = z.infer<typeof DocxThemeSchema>;
export type DocxTextRun = z.infer<typeof TextRunSchema>;
export type DocxRevisionInfo = z.infer<typeof RevisionInfoSchema>;
export type HeaderFooterDef = z.infer<typeof HeaderFooterDefSchema>;

// =============================================================================
// BATCH OPTIONS
// =============================================================================

export const BatchOptionsSchema = z.object({
  output: z.enum(['buffers', 'zip']).default('zip'),
  concurrency: z.number().int().min(1).max(32).default(1),
  stream: z.boolean().default(false),
});
