import { z } from "zod";
import { parseColor, PdfColorParseError } from "./parse-color.js";

const PercentDimensionSchema = z.union([
  z.number(),
  z.string().regex(/^\d+(\.\d+)?%$/),
]).describe("Absolute points or percentage string such as `\"50%\"`.");

const PdfBinaryBufferSchema = z.custom<Buffer>(
  (value) => Buffer.isBuffer(value),
  { message: "Expected a Buffer" },
);

export const PdfBinarySourceSchema = z.union([
  z.string().describe("Local file path, data URL, or http(s) URL accepted only when assetPolicy.allowRemoteSources is true."),
  z.instanceof(Uint8Array),
  PdfBinaryBufferSchema,
]).describe("Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources.");

export const PdfEmbeddedFontInputSchema = z.object({
  family: z.string().min(1).describe("Logical family name used inside the document."),
  postscriptName: z.string().optional().describe("Optional font face name inside a font collection."),
  source: PdfBinarySourceSchema,
}).strict();

export const PdfFontInputSchema = z.union([
  z.literal("Helvetica"),
  z.literal("Helvetica-Bold"),
  PdfEmbeddedFontInputSchema,
]).describe("Either a built-in Helvetica face or an embedded font descriptor.");

const PdfStrictRgbColorSchema = z.object({
  space: z.literal("rgb"),
  r: z.number(),
  g: z.number(),
  b: z.number(),
}).strict();

const PdfStrictCmykColorSchema = z.object({
  space: z.literal("cmyk"),
  c: z.number(),
  m: z.number(),
  y: z.number(),
  k: z.number(),
}).strict();

const PdfRelaxedColorInputSchema = z.union([
  z.string(),
  PdfStrictRgbColorSchema,
  PdfStrictCmykColorSchema,
  z.object({ r: z.number(), g: z.number(), b: z.number() }).strict(),
  z.object({ c: z.number(), m: z.number(), y: z.number(), k: z.number() }).strict(),
]);

export const PdfColorSchema = PdfRelaxedColorInputSchema.transform((input, ctx) => {
  try {
    return parseColor(input);
  } catch (err) {
    const message = err instanceof PdfColorParseError ? err.message : String(err);
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    return z.NEVER;
  }
}).describe(
  "RGB or CMYK color. Accepts hex strings (#RRGGBB / #RGB), rgb()/rgba(), named colors (black, white, red, green, blue, gray), or canonical { space: \"rgb\"|\"cmyk\", ... } objects. All forms are normalized to the canonical 0..1 component shape.",
);

const PdfGradientStopSchema = z.object({
  color: PdfColorSchema,
  offset: z.number(),
}).strict();

const PdfLinearGradientFillSchema = z.object({
  space: z.literal("linear-gradient"),
  startX: z.number(),
  startY: z.number(),
  endX: z.number(),
  endY: z.number(),
  opacity: z.number().min(0).max(1).optional(),
  stops: z.tuple([PdfGradientStopSchema, PdfGradientStopSchema]),
}).strict();

const PdfRadialGradientFillSchema = z.object({
  space: z.literal("radial-gradient"),
  startX: z.number(),
  startY: z.number(),
  startRadius: z.number(),
  endX: z.number(),
  endY: z.number(),
  endRadius: z.number(),
  opacity: z.number().min(0).max(1).optional(),
  stops: z.tuple([PdfGradientStopSchema, PdfGradientStopSchema]),
}).strict();

const PdfSolidFillSchema = z.object({
  space: z.literal("solid"),
  color: PdfColorSchema,
  opacity: z.number().min(0).max(1).optional(),
}).strict();

export const PdfFillSchema = z.union([
  PdfLinearGradientFillSchema,
  PdfRadialGradientFillSchema,
  PdfSolidFillSchema,
]);

export const PdfStrokeStyleSchema = z.object({
  color: PdfColorSchema,
  dash: z.array(z.number().positive()).optional(),
  lineCap: z.enum(["butt", "round", "square"]).optional(),
  opacity: z.number().min(0).max(1).optional(),
  style: z.enum(["solid", "dashed", "dotted"]).optional(),
  width: z.number().positive().optional(),
}).strict();

const PdfRectGraphicSchema = z.object({
  type: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  radius: z.number().min(0).optional(),
  fill: PdfFillSchema.optional(),
  stroke: PdfStrokeStyleSchema.optional(),
  layer: z.enum(["background", "foreground"]).optional(),
}).strict();

const PdfLineGraphicSchema = z.object({
  type: z.literal("line"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  stroke: PdfStrokeStyleSchema,
  layer: z.enum(["background", "foreground"]).optional(),
}).strict();

const PdfPathGraphicSchema = z.object({
  type: z.literal("path"),
  d: z.string().min(1),
  fill: PdfFillSchema.optional(),
  fillRule: z.enum(["evenodd", "nonzero"]).optional(),
  layer: z.enum(["background", "foreground"]).optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  stroke: PdfStrokeStyleSchema.optional(),
  x: z.number().optional(),
  y: z.number().optional(),
}).strict();

const PdfImageGraphicSchema = z.object({
  type: z.literal("image"),
  source: PdfBinarySourceSchema,
  format: z.enum(["jpeg", "png"]).optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  opacity: z.number().min(0).max(1).optional(),
  layer: z.enum(["background", "foreground"]).optional(),
}).strict();

const PdfSvgGraphicSchema = z.object({
  type: z.literal("svg"),
  source: PdfBinarySourceSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  opacity: z.number().min(0).max(1).optional(),
  layer: z.enum(["background", "foreground"]).optional(),
}).strict();

export const PdfGraphicSchema = z.union([
  PdfImageGraphicSchema,
  PdfLineGraphicSchema,
  PdfPathGraphicSchema,
  PdfRectGraphicSchema,
  PdfSvgGraphicSchema,
]);

export const PdfPhase3MarginsSchema = z.object({
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
}).strict();

export const PdfPhase3PageSchema = z.object({
  margin: z.union([z.number(), PdfPhase3MarginsSchema.partial().strict()]).optional(),
  size: z.union([
    z.enum(["A4", "Letter", "a4", "letter"]),
    z.object({
      width: z.number().positive(),
      height: z.number().positive(),
    }).strict(),
  ]).optional(),
}).strict();

export const PdfPhase3StyleSchema = z.object({
  alignItems: z.enum(["center", "flex-end", "flex-start", "stretch"]).optional(),
  alignSelf: z.enum(["center", "flex-end", "flex-start", "stretch"]).optional(),
  bottom: z.number().optional(),
  columnGap: z.number().optional(),
  flexBasis: PercentDimensionSchema.optional(),
  flexDirection: z.enum(["column", "row"]).optional(),
  flexGrow: z.number().optional(),
  flexShrink: z.number().optional(),
  flexWrap: z.enum(["nowrap", "wrap"]).optional(),
  gap: z.number().optional(),
  height: PercentDimensionSchema.optional(),
  justifyContent: z.enum(["center", "flex-end", "flex-start", "space-around", "space-between"]).optional(),
  left: z.number().optional(),
  margin: z.number().optional(),
  marginBottom: z.number().optional(),
  marginLeft: z.number().optional(),
  marginRight: z.number().optional(),
  marginTop: z.number().optional(),
  maxHeight: PercentDimensionSchema.optional(),
  maxWidth: PercentDimensionSchema.optional(),
  minHeight: PercentDimensionSchema.optional(),
  minWidth: PercentDimensionSchema.optional(),
  padding: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingTop: z.number().optional(),
  position: z.enum(["absolute", "relative"]).optional(),
  right: z.number().optional(),
  rowGap: z.number().optional(),
  top: z.number().optional(),
  width: PercentDimensionSchema.optional(),
}).strict();

const PdfPhase3WidowOrphanSchema = z.object({
  minLinesAfterBreak: z.number().int().positive().optional(),
  minLinesBeforeBreak: z.number().int().positive().optional(),
}).strict();

const PdfPhase3LinkSchema = z.union([
  z.object({
    kind: z.literal("external"),
    url: z.string().url(),
  }).strict(),
  z.object({
    kind: z.literal("internal"),
    target: z.string().min(1),
  }).strict(),
]);

const PdfPhase3TextBaseSchema = z.object({
  direction: z.enum(["auto", "ltr", "rtl"]).optional(),
  font: PdfFontInputSchema.optional(),
  fontSize: z.number().positive().optional(),
  id: z.string().optional(),
  lang: z.string().optional(),
  lineHeight: z.number().positive().optional(),
  link: PdfPhase3LinkSchema.optional(),
  style: PdfPhase3StyleSchema.optional(),
  text: z.string().optional(),
  textAlign: z.enum(["center", "justify", "left", "right"]).optional(),
  value: z.string().optional(),
  widowOrphan: PdfPhase3WidowOrphanSchema.optional(),
}).strict();

export const PdfPhase3ParagraphNodeSchema = PdfPhase3TextBaseSchema.extend({
  type: z.literal("paragraph"),
}).strict();

export const PdfPhase3HeadingNodeSchema = PdfPhase3TextBaseSchema.extend({
  type: z.literal("heading"),
  keepWithNext: z.boolean().optional(),
  level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]).optional(),
}).strict();

export const PdfPhase3PreformattedNodeSchema = PdfPhase3TextBaseSchema.extend({
  type: z.literal("preformatted"),
}).strict();

export const PdfPhase3DividerNodeSchema = z.object({
  type: z.literal("divider"),
  id: z.string().optional(),
  lang: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
}).strict();

export const PdfPhase3PageBreakNodeSchema = z.object({
  type: z.literal("page-break"),
  id: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
}).strict();

export const PdfPhase5BorderSchema = z.object({
  color: PdfColorSchema,
  style: z.enum(["dashed", "dotted", "double", "none", "solid"]).optional(),
  width: z.number().positive().optional(),
}).strict();

export const PdfPhase5TableColumnSchema = z.object({
  maxWidth: z.number().positive().optional(),
  minWidth: z.number().positive().optional(),
  width: PercentDimensionSchema.optional(),
}).strict();

export const PdfPhase5CellStyleSchema = z.object({
  backgroundColor: PdfColorSchema.optional(),
  borderBottom: PdfPhase5BorderSchema.optional(),
  borderLeft: PdfPhase5BorderSchema.optional(),
  borderRight: PdfPhase5BorderSchema.optional(),
  borderTop: PdfPhase5BorderSchema.optional(),
  minHeight: z.number().positive().optional(),
  padding: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingTop: z.number().optional(),
  verticalAlign: z.enum(["bottom", "middle", "top"]).optional(),
}).strict();

export const PdfPhase5RowStyleSchema = z.object({
  backgroundColor: PdfColorSchema.optional(),
}).strict();

export const PdfPhase5TableStyleSchema = PdfPhase3StyleSchema.extend({
  backgroundColor: PdfColorSchema.optional(),
  borderBottom: PdfPhase5BorderSchema.optional(),
  borderCollapse: z.literal("collapse").optional(),
  borderLeft: PdfPhase5BorderSchema.optional(),
  borderRight: PdfPhase5BorderSchema.optional(),
  borderTop: PdfPhase5BorderSchema.optional(),
}).strict();

export const PdfPhase3ContainerNodeSchema: z.ZodTypeAny = z.lazy(() => z.object({
  type: z.literal("container"),
  children: z.array(PdfDocumentLayoutNodeSchema),
  graphics: z.array(PdfGraphicSchema).optional(),
  id: z.string().optional(),
  lang: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
}).strict());

export const PdfPhase5TableNodeSchema: z.ZodTypeAny = z.lazy(() => z.object({
  type: z.literal("table"),
  body: z.array(PdfPhase5TableRowSchema),
  borderCollapse: z.literal("collapse").optional(),
  columns: z.array(PdfPhase5TableColumnSchema).min(1, "A table that declares columns must provide at least one column.").optional(),
  footer: z.array(PdfPhase5TableRowSchema).optional(),
  header: z.array(PdfPhase5TableRowSchema).optional(),
  style: PdfPhase5TableStyleSchema.optional(),
}).strict());

const PdfPhase5CellContentNodeSchema: z.ZodTypeAny = z.lazy(() => z.union([
  PdfPhase3ContainerNodeSchema,
  PdfPhase3HeadingNodeSchema,
  PdfPhase3ParagraphNodeSchema,
  PdfPhase3PreformattedNodeSchema,
  PdfPhase5TableNodeSchema,
]));

export const PdfPhase5TableCellSchema = z.object({
  children: z.array(PdfPhase5CellContentNodeSchema),
  colSpan: z.number().int().min(1).optional(),
  role: z.enum(["td", "th"]).optional(),
  rowSpan: z.number().int().min(1).optional(),
  style: PdfPhase5CellStyleSchema.optional(),
}).strict();

export const PdfPhase5TableRowSchema = z.object({
  cells: z.array(PdfPhase5TableCellSchema).min(1),
  keepTogether: z.boolean().optional(),
  style: PdfPhase5RowStyleSchema.optional(),
}).strict();

export const PdfDocumentLayoutNodeSchema: z.ZodTypeAny = z.lazy(() => z.union([
  PdfPhase3ContainerNodeSchema,
  PdfPhase3DividerNodeSchema,
  PdfPhase3HeadingNodeSchema,
  PdfPhase3PageBreakNodeSchema,
  PdfPhase3ParagraphNodeSchema,
  PdfPhase3PreformattedNodeSchema,
  PdfPhase5TableNodeSchema,
]));

export const PdfPhase6TocNodeSchema = z.object({
  type: z.literal("toc"),
  fontSize: z.number().positive().optional(),
  id: z.string().optional(),
  indentPerLevel: z.number().positive().optional(),
  lineHeight: z.number().positive().optional(),
  maxLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]).optional(),
  style: PdfPhase3StyleSchema.optional(),
  title: z.string().optional(),
  titleFontSize: z.number().positive().optional(),
}).strict();

export const PdfPhase6TextFieldNodeSchema = z.object({
  type: z.literal("form-text"),
  calculate: z.string().optional(),
  fontColor: z.string().optional(),
  fontSize: z.number().positive().optional(),
  height: z.number().positive().optional(),
  label: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  multiline: z.boolean().optional(),
  name: z.string().min(1),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  tooltip: z.string().optional(),
  tabOrder: z.number().int().nonnegative().optional(),
  style: PdfPhase3StyleSchema.optional(),
  value: z.string().optional(),
  width: PercentDimensionSchema.optional(),
}).strict();

export const PdfPhase6CheckboxNodeSchema = z.object({
  type: z.literal("form-checkbox"),
  calculate: z.string().optional(),
  checked: z.boolean().optional(),
  fontColor: z.string().optional(),
  label: z.string().optional(),
  name: z.string().min(1),
  size: z.number().positive().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  tabOrder: z.number().int().nonnegative().optional(),
  tooltip: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
}).strict();

export const PdfPhase6DropdownNodeSchema = z.object({
  type: z.literal("form-dropdown"),
  calculate: z.string().optional(),
  fontColor: z.string().optional(),
  fontSize: z.number().positive().optional(),
  height: z.number().positive().optional(),
  label: z.string().optional(),
  name: z.string().min(1),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).min(1),
  tabOrder: z.number().int().nonnegative().optional(),
  tooltip: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
  value: z.string().optional(),
  width: PercentDimensionSchema.optional(),
}).strict();

export const PdfPhase6RadioButtonNodeSchema = z.object({
  type: z.literal("form-radio"),
  calculate: z.string().optional(),
  checked: z.boolean().optional(),
  fontColor: z.string().optional(),
  label: z.string().optional(),
  name: z.string().min(1),
  group: z.string().min(1),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  size: z.number().positive().optional(),
  tabOrder: z.number().int().nonnegative().optional(),
  tooltip: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
  value: z.string().min(1),
}).strict();

export const PdfPhase6SignatureFieldNodeSchema = z.object({
  type: z.literal("form-signature"),
  fieldName: z.string().min(1),
  fontColor: z.string().optional(),
  fontSize: z.number().positive().optional(),
  height: z.number().positive().optional(),
  label: z.string().optional(),
  mode: z.enum(["digital", "visual"]).optional(),
  style: PdfPhase3StyleSchema.optional(),
  tabOrder: z.number().int().nonnegative().optional(),
  tooltip: z.string().optional(),
  value: z.string().optional(),
  width: PercentDimensionSchema.optional(),
}).strict();

export const PdfPhase6NoteAnnotationNodeSchema = z.object({
  type: z.literal("note-annotation"),
  contents: z.string().min(1),
  height: z.number().positive().optional(),
  open: z.boolean().optional(),
  style: PdfPhase3StyleSchema.optional(),
  title: z.string().optional(),
  width: PercentDimensionSchema.optional(),
}).strict();

export const PdfPhase6HighlightAnnotationNodeSchema = z.object({
  type: z.literal("highlight-annotation"),
  contents: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
  target: z.string().min(1),
}).strict();

export const PdfPhase6DocumentNodeSchema: z.ZodTypeAny = z.lazy(() => z.union([
  PdfDocumentLayoutNodeSchema,
  PdfPhase6CheckboxNodeSchema,
  PdfPhase6DropdownNodeSchema,
  PdfPhase6HighlightAnnotationNodeSchema,
  PdfPhase6NoteAnnotationNodeSchema,
  PdfPhase6RadioButtonNodeSchema,
  PdfPhase6SignatureFieldNodeSchema,
  PdfPhase6TextFieldNodeSchema,
  PdfPhase6TocNodeSchema,
]));

export const PdfPhase6PageLabelSchema = z.object({
  prefix: z.string().optional(),
  startNumber: z.number().int().positive().optional(),
  startPage: z.number().int().positive(),
  style: z.enum(["arabic", "roman-lower", "roman-upper"]),
}).strict();

export const PdfPhase6PageNumberOptionsSchema = z.object({
  fontSize: z.number().positive().optional(),
  format: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
}).strict();

export const PdfDynamicHeaderFooterZonesSchema = z.object({
  center: z.string().optional(),
  left: z.string().optional(),
  right: z.string().optional(),
}).strict().refine(
  (zones) => zones.left !== undefined || zones.center !== undefined || zones.right !== undefined,
  { message: "At least one of left, center, or right is required" },
);

export const PdfDynamicHeaderFooterOptionsSchema = z.object({
  content: z.union([
    z.string(),
    z.array(PdfDocumentLayoutNodeSchema),
    PdfDynamicHeaderFooterZonesSchema,
  ]),
  fontSize: z.number().positive().optional(),
  height: z.number().positive().optional(),
  skipFirstPage: z.boolean().optional(),
  width: z.number().positive().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
}).strict();

export const PdfPhase7FigureNodeSchema = z.object({
  type: z.literal("figure"),
  alt: z.string().min(1),
  format: z.enum(["jpeg", "png", "svg"]).optional(),
  height: z.number().positive(),
  id: z.string().optional(),
  lang: z.string().optional(),
  source: PdfBinarySourceSchema,
  style: PdfPhase3StyleSchema.optional(),
  width: PercentDimensionSchema,
}).strict();

export const PdfPhase7GraphicNodeSchema = z.object({
  type: z.literal("graphic"),
  alt: z.string().optional(),
  graphic: PdfGraphicSchema,
  id: z.string().optional(),
  lang: z.string().optional(),
  style: PdfPhase3StyleSchema.optional(),
}).strict();

export const PdfPhase7ListItemNodeSchema = z.object({
  id: z.string().optional(),
  lang: z.string().optional(),
  text: z.string().min(1),
}).strict();

export const PdfPhase7ListNodeSchema = z.object({
  type: z.literal("list"),
  id: z.string().optional(),
  items: z.array(PdfPhase7ListItemNodeSchema).min(1),
  lang: z.string().optional(),
  ordered: z.boolean().optional(),
  style: PdfPhase3StyleSchema.optional(),
}).strict();

export const PdfPhase7DocumentNodeSchema: z.ZodTypeAny = z.lazy(() => z.union([
  PdfPhase6DocumentNodeSchema,
  PdfPhase7FigureNodeSchema,
  PdfPhase7GraphicNodeSchema,
  PdfPhase7ListNodeSchema,
]));

export const PdfMetaSchema = z.object({
  author: z.string().optional(),
  creationDate: z.union([z.string().datetime({ offset: true }), z.date()]).optional(),
  creator: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  modDate: z.union([z.string().datetime({ offset: true }), z.date()]).optional(),
  producer: z.string().optional(),
  subject: z.string().optional(),
  title: z.string().optional(),
}).strict();

export const PdfPhase6BookmarkOptionsSchema = z.object({
  fromHeadings: z.boolean().optional(),
}).strict();

export const PdfPhase7AccessibilityOptionsSchema = z.object({
  lang: z.string().optional(),
  tagged: z.boolean().optional(),
}).strict();

export const PdfPhase8PdfaOptionsSchema = z.object({
  conformance: z.enum(["1b", "2a", "2b"]).optional(),
  enabled: z.boolean().optional(),
  fallbackFont: PdfEmbeddedFontInputSchema.optional(),
  fallbackFonts: z.array(PdfEmbeddedFontInputSchema).optional(),
  iccProfile: PdfBinarySourceSchema.optional(),
  outputConditionIdentifier: z.string().optional(),
}).strict();

export const PdfStructuredDocumentSchema = z.object({
  meta: PdfMetaSchema.optional(),
  page: PdfPhase3PageSchema.optional(),
  children: z.array(PdfPhase7DocumentNodeSchema).optional(),
  content: z.array(PdfPhase7DocumentNodeSchema).optional(),
  bookmarks: PdfPhase6BookmarkOptionsSchema.optional(),
  dynamicHeader: PdfDynamicHeaderFooterOptionsSchema.optional(),
  dynamicFooter: PdfDynamicHeaderFooterOptionsSchema.optional(),
  pageLabels: z.array(PdfPhase6PageLabelSchema).optional(),
  pageNumber: PdfPhase6PageNumberOptionsSchema.optional(),
  accessibility: PdfPhase7AccessibilityOptionsSchema.optional(),
  pdfa: PdfPhase8PdfaOptionsSchema.optional(),
}).strict();

const PdfTextPhase2Schema = z.object({
  direction: z.enum(["auto", "ltr", "rtl"]).optional(),
  fallbackFonts: z.array(PdfEmbeddedFontInputSchema).optional(),
  font: PdfFontInputSchema.optional(),
  fontSize: z.number().positive().optional(),
  value: z.string().min(1),
  x: z.number().optional(),
  y: z.number().optional(),
}).strict();

const PdfPagePhase2Schema = z.object({
  graphics: z.array(PdfGraphicSchema).optional(),
  height: z.number().positive().optional(),
  text: PdfTextPhase2Schema.optional(),
  texts: z.array(PdfTextPhase2Schema).optional(),
  width: z.number().positive().optional(),
}).strict();

export const PdfDocumentPhase2Schema = z.object({
  meta: PdfMetaSchema.optional(),
  pages: z.array(PdfPagePhase2Schema).min(1),
}).strict();

/** Stable semantic name for the low-level page/text/graphics document schema. */
export const PdfRawDocumentSchema = PdfDocumentPhase2Schema;

export const PdfDocumentSchema = z.union([
  PdfDocumentPhase2Schema,
  PdfStructuredDocumentSchema,
]);

export type PdfDocumentValidated = z.infer<typeof PdfDocumentSchema>;
