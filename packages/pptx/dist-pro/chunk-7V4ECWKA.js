import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  ARROW_HEAD_SIZES,
  ARROW_HEAD_TYPES,
  CHART_TYPES,
  CONNECTOR_TYPES,
  PATTERN_TYPES,
  PLACEHOLDER_TYPES,
  SCHEME_COLORS,
  SHAPE_TYPES
} from "./chunk-TM4NN2PA.js";
import {
  external_exports
} from "./chunk-3VBGXE67.js";

// src/validator/schema.ts
var DimensionSchema = external_exports.union([external_exports.number(), external_exports.string().regex(/^\d+%$/)]);
var ColorModifierSchema = external_exports.object({
  scheme: external_exports.enum(SCHEME_COLORS),
  tint: external_exports.number().min(0).max(100).optional(),
  shade: external_exports.number().min(0).max(100).optional(),
  lumMod: external_exports.number().optional(),
  lumOff: external_exports.number().optional(),
  satMod: external_exports.number().optional(),
  satOff: external_exports.number().optional(),
  hueMod: external_exports.number().optional(),
  hueOff: external_exports.number().optional(),
  comp: external_exports.boolean().optional(),
  inv: external_exports.boolean().optional(),
  gray: external_exports.boolean().optional()
});
var ColorSchema = external_exports.union([
  external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/),
  external_exports.enum(SCHEME_COLORS),
  ColorModifierSchema
]);
var PlaceholderRefSchema = external_exports.object({
  type: external_exports.enum(PLACEHOLDER_TYPES).optional(),
  idx: external_exports.number().int().min(0).optional()
});
var ShapeTypeSchema = external_exports.enum(SHAPE_TYPES);
var GradientStopSchema = external_exports.object({
  color: ColorSchema,
  position: external_exports.number().min(0).max(100),
  alpha: external_exports.number().min(0).max(1).optional()
});
var GradientFillSchema = external_exports.object({
  type: external_exports.enum(["linear", "gradient", "radial"]),
  angle: external_exports.number().min(0).max(360).optional(),
  stops: external_exports.array(GradientStopSchema).min(2).max(20)
});
var SolidFillSchema = external_exports.object({
  type: external_exports.literal("solid"),
  color: ColorSchema
});
var PatternFillSchema = external_exports.object({
  type: external_exports.literal("pattern"),
  pattern: external_exports.enum(PATTERN_TYPES),
  foreground: ColorSchema,
  background: ColorSchema
});
var ImageFillSchema = external_exports.object({
  type: external_exports.literal("image"),
  src: external_exports.string(),
  tile: external_exports.boolean().optional(),
  stretch: external_exports.boolean().optional()
});
var FillSchema = external_exports.discriminatedUnion("type", [SolidFillSchema, GradientFillSchema, PatternFillSchema, ImageFillSchema]);
var DropShadowSchema = external_exports.object({
  color: ColorSchema,
  offsetX: external_exports.number(),
  offsetY: external_exports.number(),
  blurRadius: external_exports.number(),
  opacity: external_exports.number().min(0).max(1).optional()
});
var GlowSchema = external_exports.object({
  color: ColorSchema,
  radius: external_exports.number(),
  opacity: external_exports.number().min(0).max(1).optional()
});
var ReflectionSchema = external_exports.object({
  blurRadius: external_exports.number().optional(),
  startOpacity: external_exports.number().min(0).max(1).optional(),
  endOpacity: external_exports.number().min(0).max(1).optional(),
  distance: external_exports.number().optional(),
  direction: external_exports.number().optional(),
  size: external_exports.number().min(0).max(100).optional()
});
var SoftEdgeSchema = external_exports.object({
  radius: external_exports.number()
});
var InnerShadowSchema = external_exports.object({
  color: ColorSchema,
  offsetX: external_exports.number(),
  offsetY: external_exports.number(),
  blurRadius: external_exports.number(),
  opacity: external_exports.number().min(0).max(1).optional()
});
var Scene3dSchema = external_exports.object({
  camera: external_exports.object({
    preset: external_exports.string(),
    fov: external_exports.number().optional(),
    zoom: external_exports.number().optional(),
    rotation: external_exports.object({
      lat: external_exports.number().optional(),
      lon: external_exports.number().optional(),
      rev: external_exports.number().optional()
    }).optional()
  }),
  lightRig: external_exports.object({
    type: external_exports.string(),
    direction: external_exports.string().optional(),
    rotation: external_exports.object({
      lat: external_exports.number().optional(),
      lon: external_exports.number().optional(),
      rev: external_exports.number().optional()
    }).optional()
  }).optional()
});
var Sp3dSchema = external_exports.object({
  extrudeHeight: external_exports.number().optional(),
  contourWidth: external_exports.number().optional(),
  contourColor: ColorSchema.optional(),
  bevelTop: external_exports.object({
    preset: external_exports.string(),
    width: external_exports.number().optional(),
    height: external_exports.number().optional()
  }).optional(),
  bevelBottom: external_exports.object({
    preset: external_exports.string(),
    width: external_exports.number().optional(),
    height: external_exports.number().optional()
  }).optional(),
  extrudeColor: ColorSchema.optional(),
  material: external_exports.string().optional()
});
var EffectsSchema = external_exports.object({
  dropShadow: DropShadowSchema.optional(),
  innerShadow: InnerShadowSchema.optional(),
  glow: GlowSchema.optional(),
  reflection: ReflectionSchema.optional(),
  softEdge: SoftEdgeSchema.optional(),
  scene3d: Scene3dSchema.optional(),
  sp3d: Sp3dSchema.optional()
});
var FlexStyleSchema = external_exports.object({
  flexDirection: external_exports.enum(["row", "column"]).optional(),
  justifyContent: external_exports.enum(["flex-start", "flex-end", "center", "space-between", "space-around"]).optional(),
  alignItems: external_exports.enum(["flex-start", "flex-end", "center", "stretch"]).optional(),
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  padding: external_exports.number().optional(),
  paddingTop: external_exports.number().optional(),
  paddingRight: external_exports.number().optional(),
  paddingBottom: external_exports.number().optional(),
  paddingLeft: external_exports.number().optional(),
  margin: external_exports.number().optional(),
  marginTop: external_exports.number().optional(),
  marginRight: external_exports.number().optional(),
  marginBottom: external_exports.number().optional(),
  marginLeft: external_exports.number().optional(),
  position: external_exports.enum(["relative", "absolute"]).optional(),
  top: external_exports.number().optional(),
  right: external_exports.number().optional(),
  bottom: external_exports.number().optional(),
  left: external_exports.number().optional(),
  zIndex: external_exports.number().optional(),
  backgroundColor: ColorSchema.optional(),
  // Phase 1: Flex API
  flexWrap: external_exports.enum(["nowrap", "wrap", "wrap-reverse"]).optional(),
  flexGrow: external_exports.number().min(0).optional(),
  flexShrink: external_exports.number().min(0).optional(),
  flexBasis: DimensionSchema.optional(),
  gap: external_exports.number().min(0).optional(),
  rowGap: external_exports.number().min(0).optional(),
  columnGap: external_exports.number().min(0).optional(),
  minWidth: DimensionSchema.optional(),
  maxWidth: DimensionSchema.optional(),
  minHeight: DimensionSchema.optional(),
  maxHeight: DimensionSchema.optional(),
  alignSelf: external_exports.enum(["auto", "flex-start", "flex-end", "center", "stretch"]).optional(),
  aspectRatio: external_exports.number().positive().optional(),
  display: external_exports.enum(["flex", "none"]).optional(),
  // Phase 2: Visual Properties
  fill: FillSchema.optional(),
  borderRadius: external_exports.number().min(0).optional(),
  borderWidth: external_exports.number().min(0).optional(),
  borderColor: ColorSchema.optional(),
  borderStyle: external_exports.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
  borderCap: external_exports.enum(["flat", "round", "square"]).optional(),
  borderCompound: external_exports.enum(["single", "double", "thickThin", "thinThick", "triple"]).optional(),
  effects: EffectsSchema.optional(),
  // Phase 3: Transform Properties
  rotation: external_exports.number().min(-360).max(360).optional(),
  opacity: external_exports.number().min(0).max(1).optional(),
  flipH: external_exports.boolean().optional(),
  flipV: external_exports.boolean().optional()
});
var TextDecorationLineSchema = external_exports.enum(["none", "underline", "strikethrough", "underline-strikethrough"]).optional();
var TextDecorationStyleSchema = external_exports.enum(["solid", "double", "dotted", "dashed"]).optional();
var TextInsetsSchema = external_exports.object({
  left: external_exports.number().optional(),
  top: external_exports.number().optional(),
  right: external_exports.number().optional(),
  bottom: external_exports.number().optional()
});
var TextFitConfigSchema = external_exports.object({
  policy: external_exports.enum(["strict", "fitHeight", "fitFontSize", "truncate", "overflow"]),
  minFontSize: external_exports.number().min(1).max(4e3).optional(),
  maxLines: external_exports.number().int().min(1).max(1e3).optional(),
  marker: external_exports.string().max(20).optional()
});
var TextStyleSchema = FlexStyleSchema.extend({
  color: ColorSchema.optional(),
  fontSize: external_exports.number().min(1).max(4e3).optional(),
  fontFamily: external_exports.string().optional(),
  fontWeight: external_exports.enum(["normal", "bold"]).optional(),
  fontStyle: external_exports.enum(["normal", "italic"]).optional(),
  textAlign: external_exports.enum(["left", "center", "right", "justify"]).optional(),
  lineHeight: external_exports.number().optional(),
  fontFallback: external_exports.array(external_exports.string()).max(20).optional(),
  textDecorationLine: TextDecorationLineSchema,
  textDecorationStyle: TextDecorationStyleSchema,
  verticalAlign: external_exports.enum(["top", "middle", "bottom"]).optional(),
  textInsets: TextInsetsSchema.optional(),
  textDirection: external_exports.enum(["horizontal", "vertical", "verticalEA"]).optional(),
  rtl: external_exports.boolean().optional(),
  columns: external_exports.number().int().min(1).max(16).optional(),
  columnSpacing: external_exports.number().min(0).optional(),
  lang: external_exports.string().optional(),
  textWarp: external_exports.string().optional(),
  textFit: TextFitConfigSchema.optional()
});
var TextRunStyleSchema = external_exports.object({
  color: ColorSchema.optional(),
  fontSize: external_exports.number().min(1).max(4e3).optional(),
  fontFamily: external_exports.string().optional(),
  fontWeight: external_exports.enum(["normal", "bold"]).optional(),
  fontStyle: external_exports.enum(["normal", "italic"]).optional(),
  textDecorationLine: TextDecorationLineSchema,
  textDecorationStyle: TextDecorationStyleSchema,
  baseline: external_exports.enum(["superscript", "subscript"]).optional(),
  letterSpacing: external_exports.number().optional(),
  shadow: DropShadowSchema.optional(),
  outline: external_exports.object({ width: external_exports.number(), color: ColorSchema }).optional(),
  textTransform: external_exports.enum(["uppercase", "lowercase", "capitalize", "none"]).optional(),
  gradientFill: GradientFillSchema.optional(),
  lang: external_exports.string().optional(),
  altLang: external_exports.string().optional(),
  highlight: ColorSchema.optional(),
  kerning: external_exports.number().optional()
});
var HyperlinkTargetSchema = external_exports.object({
  url: external_exports.string().optional(),
  mailto: external_exports.string().optional(),
  slide: external_exports.number().int().min(1).optional(),
  action: external_exports.enum(["firstSlide", "lastSlide", "nextSlide", "previousSlide", "endShow"]).optional(),
  tooltip: external_exports.string().optional()
}).refine(
  (t) => [t.url, t.mailto, t.slide, t.action].filter((v) => v !== void 0).length <= 1,
  { message: "HyperlinkTarget must specify at most one of: url, mailto, slide, action" }
);
var HyperlinkSchema = external_exports.union([external_exports.string(), HyperlinkTargetSchema]);
var TextRunSchema = external_exports.object({
  text: external_exports.string().default(""),
  style: TextRunStyleSchema.optional(),
  hyperlink: HyperlinkSchema.optional()
});
var BulletCharSchema = external_exports.object({
  type: external_exports.literal("char").optional(),
  char: external_exports.string(),
  color: ColorSchema.optional(),
  size: external_exports.number().optional(),
  fontFamily: external_exports.string().optional()
});
var AutoNumSchemeSchema = external_exports.enum([
  "arabicPeriod",
  "arabicParenR",
  "romanUcPeriod",
  "romanLcPeriod",
  "alphaUcPeriod",
  "alphaLcPeriod",
  "alphaLcParenR",
  "alphaUcParenR"
]);
var BulletAutoNumSchema = external_exports.object({
  type: external_exports.literal("autoNum"),
  scheme: AutoNumSchemeSchema,
  startAt: external_exports.number().int().min(1).optional()
});
var BulletNoneSchema = external_exports.object({
  type: external_exports.literal("none")
});
var BulletConfigSchema = external_exports.union([BulletCharSchema, BulletAutoNumSchema, BulletNoneSchema]);
var TabStopSchema = external_exports.object({
  position: external_exports.number(),
  align: external_exports.enum(["l", "ctr", "r", "dec"]).optional()
});
var ParagraphSchema = external_exports.object({
  runs: external_exports.array(TextRunSchema).max(1e3),
  align: external_exports.enum(["left", "center", "right", "justify"]).optional(),
  lineHeight: external_exports.number().optional(),
  spaceBefore: external_exports.number().optional(),
  spaceAfter: external_exports.number().optional(),
  level: external_exports.number().int().min(0).max(8).optional(),
  indent: external_exports.number().optional(),
  marginLeft: external_exports.number().optional(),
  bullet: BulletConfigSchema.optional(),
  rtl: external_exports.boolean().optional(),
  tabStops: external_exports.array(TabStopSchema).max(50).optional(),
  hangingIndent: external_exports.number().optional(),
  lineSpacingMode: external_exports.enum(["points", "percentage"]).optional(),
  spaceBeforePercent: external_exports.number().optional(),
  spaceAfterPercent: external_exports.number().optional()
});
var TableCellBorderSchema = external_exports.object({
  width: external_exports.number().optional(),
  color: ColorSchema.optional()
});
var TableCellBordersSchema = external_exports.object({
  top: TableCellBorderSchema.optional(),
  right: TableCellBorderSchema.optional(),
  bottom: TableCellBorderSchema.optional(),
  left: TableCellBorderSchema.optional(),
  diagonalDown: TableCellBorderSchema.optional(),
  diagonalUp: TableCellBorderSchema.optional()
});
var TableCellStyleSchema = external_exports.object({
  fill: external_exports.union([ColorSchema, GradientFillSchema]).optional(),
  borders: TableCellBordersSchema.optional(),
  fontWeight: external_exports.enum(["normal", "bold"]).optional(),
  fontStyle: external_exports.enum(["normal", "italic"]).optional(),
  fontSize: external_exports.number().min(1).max(4e3).optional(),
  fontFamily: external_exports.string().optional(),
  fontFallback: external_exports.array(external_exports.string()).max(20).optional(),
  color: ColorSchema.optional(),
  textAlign: external_exports.enum(["left", "center", "right"]).optional(),
  verticalAlign: external_exports.enum(["top", "middle", "bottom"]).optional(),
  padding: external_exports.number().optional(),
  textDirection: external_exports.enum(["horizontal", "vertical", "verticalEA"]).optional(),
  rtl: external_exports.boolean().optional(),
  lang: external_exports.string().optional()
});
var TableCellSchema = external_exports.object({
  text: external_exports.string().default(""),
  style: TableCellStyleSchema.optional(),
  colSpan: external_exports.number().int().min(1).optional(),
  rowSpan: external_exports.number().int().min(1).optional(),
  vMerge: external_exports.boolean().optional(),
  hMerge: external_exports.boolean().optional(),
  content: external_exports.array(TextRunSchema).max(1e3).optional(),
  paragraphs: external_exports.array(ParagraphSchema).max(500).optional()
});
var TableRowSchema = external_exports.object({
  height: external_exports.number().optional(),
  minHeight: external_exports.number().min(0).optional(),
  cells: external_exports.array(TableCellSchema).max(100)
});
var TableStyleSchema = external_exports.object({
  bandRow: external_exports.boolean().optional(),
  bandCol: external_exports.boolean().optional(),
  firstRow: external_exports.boolean().optional(),
  lastRow: external_exports.boolean().optional(),
  firstCol: external_exports.boolean().optional(),
  lastCol: external_exports.boolean().optional(),
  headerRowStyle: TableCellStyleSchema.optional(),
  footerRowStyle: TableCellStyleSchema.optional(),
  firstColStyle: TableCellStyleSchema.optional(),
  lastColStyle: TableCellStyleSchema.optional(),
  bandRowEvenStyle: TableCellStyleSchema.optional(),
  bandRowOddStyle: TableCellStyleSchema.optional(),
  outerBorder: TableCellBorderSchema.optional(),
  innerBorderH: TableCellBorderSchema.optional(),
  innerBorderV: TableCellBorderSchema.optional()
});
var TableRowLayoutPolicySchema = external_exports.object({
  mode: external_exports.enum(["natural", "fill"]).optional(),
  minRowHeight: external_exports.number().min(0).optional(),
  overflow: external_exports.enum(["warn", "allow"]).optional()
});
var TableDataSchema = external_exports.object({
  columns: external_exports.array(external_exports.number().positive()).min(1).max(100),
  rows: external_exports.array(TableRowSchema).min(1).max(1e3),
  style: TableStyleSchema.optional(),
  autoFit: external_exports.union([external_exports.boolean(), external_exports.literal("distribute")]).optional(),
  rowLayout: TableRowLayoutPolicySchema.optional()
}).refine(
  (data) => data.rows.every((r) => r.cells.length === data.columns.length),
  { message: "Each row must have exactly as many cells as columns" }
);
var MarkerConfigSchema = external_exports.object({
  symbol: external_exports.enum(["circle", "square", "diamond", "triangle", "x", "star", "plus", "dot", "dash", "none"]),
  size: external_exports.number().min(2).max(72).optional(),
  color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});
var TrendlineConfigSchema = external_exports.object({
  type: external_exports.enum(["linear", "exponential", "logarithmic", "polynomial", "power", "movingAvg"]),
  order: external_exports.number().int().min(2).max(6).optional(),
  period: external_exports.number().int().min(2).optional(),
  forward: external_exports.number().optional(),
  backward: external_exports.number().optional(),
  displayEquation: external_exports.boolean().optional(),
  displayRSquared: external_exports.boolean().optional(),
  color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});
var ErrorBarsConfigSchema = external_exports.object({
  direction: external_exports.enum(["x", "y", "both"]),
  type: external_exports.enum(["fixedVal", "percentage", "stdDev", "stdErr"]),
  value: external_exports.number().optional()
});
var ChartDataLabelsSchema = external_exports.object({
  showVal: external_exports.boolean().optional(),
  showCatName: external_exports.boolean().optional(),
  showSerName: external_exports.boolean().optional(),
  showPercent: external_exports.boolean().optional(),
  formatCode: external_exports.string().optional(),
  position: external_exports.enum(["outEnd", "inEnd", "ctr", "inBase", "bestFit"]).optional(),
  fontFamily: external_exports.string().optional(),
  fontSize: external_exports.number().optional(),
  fontColor: external_exports.string().optional()
});
var ChartSeriesSchema = external_exports.object({
  name: external_exports.string(),
  values: external_exports.array(external_exports.number()).max(16384),
  color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  overrideType: external_exports.enum(["bar", "line", "area"]).optional(),
  targetAxis: external_exports.enum(["primary", "secondary"]).optional(),
  pointColors: external_exports.array(external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(16384).optional(),
  marker: MarkerConfigSchema.optional(),
  trendline: TrendlineConfigSchema.optional(),
  errorBars: ErrorBarsConfigSchema.optional(),
  dataLabels: ChartDataLabelsSchema.optional()
});
var XYDataPointSchema = external_exports.object({
  x: external_exports.number(),
  y: external_exports.number(),
  size: external_exports.number().optional()
});
var XYSeriesSchema = external_exports.object({
  name: external_exports.string(),
  dataPoints: external_exports.array(XYDataPointSchema).max(32e3),
  color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});
var ChartGridlinesSchema = external_exports.object({
  major: external_exports.boolean().optional(),
  minor: external_exports.boolean().optional(),
  color: external_exports.string().optional()
});
var ChartAxisConfigSchema = external_exports.object({
  title: external_exports.string().optional(),
  fontFamily: external_exports.string().optional(),
  fontSize: external_exports.number().optional(),
  fontColor: ColorSchema.optional(),
  min: external_exports.number().optional(),
  max: external_exports.number().optional(),
  visible: external_exports.boolean().optional(),
  numberFormat: external_exports.string().optional(),
  gridlines: ChartGridlinesSchema.optional(),
  tickMark: external_exports.object({
    major: external_exports.enum(["cross", "in", "out", "none"]).optional(),
    minor: external_exports.enum(["cross", "in", "out", "none"]).optional()
  }).optional(),
  labelRotation: external_exports.number().optional(),
  labelFont: external_exports.object({
    fontFamily: external_exports.string().optional(),
    fontSize: external_exports.number().optional(),
    fontColor: external_exports.string().optional(),
    bold: external_exports.boolean().optional(),
    italic: external_exports.boolean().optional()
  }).optional(),
  crossesAt: external_exports.number().optional()
});
var ChartAreaStyleSchema = external_exports.object({
  fill: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderWidth: external_exports.number().min(0).optional()
});
var WaterfallDataSchema = external_exports.object({
  categories: external_exports.array(external_exports.string()).min(1).max(16384),
  values: external_exports.array(external_exports.number()).min(1).max(16384),
  totalIndices: external_exports.array(external_exports.number().int().min(0)).max(16384).optional(),
  increaseColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  decreaseColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  totalColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  connectorLines: external_exports.boolean().optional()
});
var StockDataSchema = external_exports.object({
  categories: external_exports.array(external_exports.string()).min(1).max(16384),
  open: external_exports.array(external_exports.number()).min(1).max(16384),
  high: external_exports.array(external_exports.number()).min(1).max(16384),
  low: external_exports.array(external_exports.number()).min(1).max(16384),
  close: external_exports.array(external_exports.number()).min(1).max(16384),
  hiLowLines: external_exports.boolean().optional(),
  upDownBars: external_exports.boolean().optional(),
  upColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  downColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});
var FunnelDataSchema = external_exports.object({
  categories: external_exports.array(external_exports.string()).min(1).max(16384),
  values: external_exports.array(external_exports.number()).min(1).max(16384),
  colors: external_exports.array(external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(16384).optional()
});
var ChartDataTableSchema = external_exports.object({
  showKeys: external_exports.boolean().optional(),
  showHorzBorder: external_exports.boolean().optional(),
  showVertBorder: external_exports.boolean().optional(),
  showOutline: external_exports.boolean().optional(),
  fontFamily: external_exports.string().optional(),
  fontSize: external_exports.number().optional()
});
var ChartCategoryAnchorSchema = external_exports.object({
  categoryIndex: external_exports.number(),
  seriesIndex: external_exports.number().int().nonnegative().optional(),
  anchor: external_exports.enum(["barTop", "barBottom", "value"]).optional(),
  value: external_exports.number().optional()
});
var ChartTextAnnotationSchema = external_exports.object({
  kind: external_exports.literal("text").optional(),
  text: external_exports.string(),
  x: external_exports.number().min(0).max(100),
  y: external_exports.number().min(0).max(100),
  width: external_exports.number().min(0).max(100).optional(),
  height: external_exports.number().min(0).max(100).optional(),
  fontFamily: external_exports.string().optional(),
  fontSize: external_exports.number().optional(),
  fontColor: ColorSchema.optional(),
  bold: external_exports.boolean().optional(),
  italic: external_exports.boolean().optional(),
  fill: ColorSchema.optional(),
  borderColor: ColorSchema.optional(),
  borderWidth: external_exports.number().optional(),
  shapeType: external_exports.enum(["rect", "roundRect", "ellipse", "wedgeRectCallout"]).optional()
});
var ChartTrendArrowAnnotationSchema = external_exports.object({
  kind: external_exports.literal("trendArrow"),
  from: ChartCategoryAnchorSchema,
  to: ChartCategoryAnchorSchema,
  label: external_exports.string().optional(),
  color: ColorSchema.optional(),
  width: external_exports.number().positive().optional(),
  dashStyle: external_exports.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
  labelFontFamily: external_exports.string().optional(),
  labelFontSize: external_exports.number().positive().optional(),
  labelColor: ColorSchema.optional()
});
var ChartTargetLineAnnotationSchema = external_exports.object({
  kind: external_exports.literal("targetLine"),
  value: external_exports.number(),
  label: external_exports.string().optional(),
  color: ColorSchema.optional(),
  width: external_exports.number().positive().optional(),
  dashStyle: external_exports.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
  labelFontFamily: external_exports.string().optional(),
  labelFontSize: external_exports.number().positive().optional(),
  labelColor: ColorSchema.optional()
});
var ChartAnnotationSchema = external_exports.union([
  ChartTrendArrowAnnotationSchema,
  ChartTargetLineAnnotationSchema,
  ChartTextAnnotationSchema
]);
var TreemapCategorySchema = external_exports.lazy(
  () => external_exports.object({
    name: external_exports.string(),
    value: external_exports.number().optional(),
    // optional for branch nodes (value derived from children)
    children: external_exports.array(TreemapCategorySchema).optional(),
    color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
  })
);
var TreemapDataSchema = external_exports.object({
  categories: external_exports.array(TreemapCategorySchema).min(1),
  dataLabels: ChartDataLabelsSchema.optional()
});
var SunburstDataSchema = external_exports.object({
  categories: external_exports.array(TreemapCategorySchema).min(1),
  dataLabels: ChartDataLabelsSchema.optional()
});
var HistogramDataSchema = external_exports.object({
  values: external_exports.array(external_exports.number()).min(1).max(32e3),
  binCount: external_exports.number().int().min(1).optional(),
  binWidth: external_exports.number().positive().optional(),
  overflow: external_exports.number().optional(),
  underflow: external_exports.number().optional(),
  seriesName: external_exports.string().optional(),
  color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  dataLabels: ChartDataLabelsSchema.optional()
});
var BoxWhiskerSeriesSchema = external_exports.object({
  name: external_exports.string(),
  values: external_exports.array(external_exports.number()).min(1).max(32e3),
  color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});
var BoxWhiskerDataSchema = external_exports.object({
  categories: external_exports.array(external_exports.string()).min(1).max(16384),
  series: external_exports.array(BoxWhiskerSeriesSchema).min(1).max(255),
  quartileMethod: external_exports.enum(["inclusive", "exclusive"]).optional(),
  showOutliers: external_exports.boolean().optional(),
  showMeanMarker: external_exports.boolean().optional(),
  showMeanLine: external_exports.boolean().optional(),
  showInnerPoints: external_exports.boolean().optional(),
  showConnectorLines: external_exports.boolean().optional(),
  dataLabels: ChartDataLabelsSchema.optional()
});
var ChartDataSchema = external_exports.object({
  chartType: external_exports.enum(CHART_TYPES),
  dataLabels: ChartDataLabelsSchema.optional(),
  barGrouping: external_exports.enum(["clustered", "stacked", "percentStacked"]).optional(),
  lineGrouping: external_exports.enum(["standard", "stacked", "percentStacked"]).optional(),
  areaGrouping: external_exports.enum(["standard", "stacked", "percentStacked"]).optional(),
  barDirection: external_exports.enum(["col", "bar"]).optional(),
  smooth: external_exports.boolean().optional(),
  marker: MarkerConfigSchema.optional(),
  explosion: external_exports.number().min(0).max(400).optional(),
  categories: external_exports.array(external_exports.string()).max(16384).optional(),
  series: external_exports.array(ChartSeriesSchema).max(255).optional(),
  xySeries: external_exports.array(XYSeriesSchema).max(255).optional(),
  holeSize: external_exports.number().min(10).max(90).optional(),
  title: external_exports.object({
    text: external_exports.string().optional(),
    fontFamily: external_exports.string().optional(),
    fontSize: external_exports.number().optional(),
    fontColor: ColorSchema.optional(),
    bold: external_exports.boolean().optional()
  }).optional(),
  categoryAxis: ChartAxisConfigSchema.optional(),
  valueAxis: ChartAxisConfigSchema.optional(),
  secondaryValueAxis: ChartAxisConfigSchema.optional(),
  secondaryCategoryAxis: ChartAxisConfigSchema.optional(),
  legend: external_exports.object({
    position: external_exports.enum(["bottom", "top", "left", "right", "none"]).optional(),
    fontFamily: external_exports.string().optional(),
    fontSize: external_exports.number().optional(),
    fontColor: ColorSchema.optional(),
    border: external_exports.object({
      color: external_exports.string().optional(),
      width: external_exports.number().optional()
    }).optional(),
    fill: external_exports.string().optional()
  }).optional(),
  // Phase 3: Bar chart spacing
  gapWidth: external_exports.number().min(0).max(500).optional(),
  overlap: external_exports.number().min(-100).max(100).optional(),
  // Phase 3: Pie/doughnut first slice angle
  firstSliceAng: external_exports.number().min(0).max(360).optional(),
  // Phase 3: Plot area & chart area styling
  plotArea: ChartAreaStyleSchema.optional(),
  chartArea: ChartAreaStyleSchema.optional(),
  // Phase 3: Display blanks as
  dispBlanksAs: external_exports.enum(["gap", "zero", "span"]).optional(),
  // Phase 3: Radar chart
  radarStyle: external_exports.enum(["radar", "filled"]).optional(),
  // Phase 3: Waterfall chart
  waterfallData: WaterfallDataSchema.optional(),
  // Phase 4: Stock chart
  stockData: StockDataSchema.optional(),
  // Phase 4: Funnel chart
  funnelData: FunnelDataSchema.optional(),
  // Phase 4: Data table
  dataTable: ChartDataTableSchema.optional(),
  // Modern chart types (ChartEx)
  treemapData: external_exports.lazy(() => TreemapDataSchema).optional(),
  sunburstData: external_exports.lazy(() => SunburstDataSchema).optional(),
  histogramData: HistogramDataSchema.optional(),
  boxWhiskerData: BoxWhiskerDataSchema.optional(),
  annotations: external_exports.array(ChartAnnotationSchema).max(50).optional()
}).superRefine((data, ctx) => {
  const fail = (msg) => ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: msg });
  if (data.chartType === "scatter" || data.chartType === "bubble") {
    if (!data.xySeries || data.xySeries.length === 0) {
      fail(`${data.chartType} chart requires xySeries with at least one entry`);
    }
    return;
  }
  if (data.chartType === "waterfall") {
    if (!data.waterfallData) fail("waterfall chart requires waterfallData");
    return;
  }
  if (data.chartType === "stock") {
    if (!data.stockData) fail("stock chart requires stockData");
    return;
  }
  if (data.chartType === "funnel") {
    if (!data.funnelData) fail("funnel chart requires funnelData");
    return;
  }
  if (data.chartType === "treemap") {
    if (!data.treemapData) fail("treemap chart requires treemapData");
    return;
  }
  if (data.chartType === "sunburst") {
    if (!data.sunburstData) fail("sunburst chart requires sunburstData");
    return;
  }
  if (data.chartType === "histogram") {
    if (!data.histogramData) fail("histogram chart requires histogramData");
    return;
  }
  if (data.chartType === "boxWhisker") {
    if (!data.boxWhiskerData) fail("boxWhisker chart requires boxWhiskerData");
    return;
  }
  if (!data.categories) {
    fail(`${data.chartType} chart requires categories`);
    return;
  }
  if (!data.series) {
    fail(`${data.chartType} chart requires series`);
    return;
  }
  if (data.series.some((s) => s.values.length !== data.categories.length)) {
    fail(`${data.chartType} chart: each series.values must have the same length as categories (${data.categories.length})`);
  }
});
var ImageCropSchema = external_exports.object({
  left: external_exports.number().min(0).max(100).optional(),
  top: external_exports.number().min(0).max(100).optional(),
  right: external_exports.number().min(0).max(100).optional(),
  bottom: external_exports.number().min(0).max(100).optional()
});
var SolidBackgroundSchema = external_exports.object({
  type: external_exports.literal("solid"),
  color: ColorSchema
});
var GradientBackgroundSchema = external_exports.object({
  type: external_exports.literal("gradient"),
  angle: external_exports.number().optional(),
  stops: external_exports.array(GradientStopSchema).min(2).max(20)
});
var PatternBackgroundSchema = external_exports.object({
  type: external_exports.literal("pattern"),
  pattern: external_exports.enum(PATTERN_TYPES),
  foreground: ColorSchema,
  background: ColorSchema
});
var ImageBackgroundSchema = external_exports.object({
  type: external_exports.literal("image"),
  src: external_exports.string(),
  tile: external_exports.boolean().optional()
});
var SlideBackgroundSchema = external_exports.discriminatedUnion("type", [SolidBackgroundSchema, GradientBackgroundSchema, PatternBackgroundSchema, ImageBackgroundSchema]);
var SlideTransitionSchema = external_exports.object({
  type: external_exports.enum(["fade", "push", "wipe", "cover", "zoom", "morph", "split", "blinds", "checker", "dissolve", "comb"]),
  duration: external_exports.number().min(0).optional(),
  direction: external_exports.enum(["up", "down", "left", "right"]).optional(),
  advanceOnClick: external_exports.boolean().optional(),
  advanceAfterTime: external_exports.number().min(0).optional()
});
var MotionPathSchema = external_exports.object({
  path: external_exports.string(),
  pathType: external_exports.enum(["line", "arc", "custom"]).optional(),
  origin: external_exports.enum(["layout", "parent"]).optional()
});
var AnimationBuildSchema = external_exports.object({
  nested: external_exports.boolean().optional(),
  grouping: external_exports.enum(["byParagraph", "byFirstLevel", "allAtOnce"]).optional(),
  dimAfter: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});
var AnimationIntentSchema = external_exports.object({
  type: external_exports.enum(["entrance", "exit", "emphasis"]),
  effect: external_exports.enum([
    "fade",
    "fly",
    "zoom",
    "spin",
    "appear",
    "bounce",
    "float",
    "grow",
    "shrink",
    "growShrink",
    "pulse",
    "teeter",
    "wipe",
    "split",
    "dissolve",
    "swivel",
    "motionPath",
    "colorReveal",
    "colorChange",
    "boldFlash",
    "wave",
    "flip"
  ]),
  trigger: external_exports.enum(["onClick", "withPrevious", "afterPrevious"]),
  duration: external_exports.number().min(0).optional(),
  delay: external_exports.number().min(0).optional(),
  direction: external_exports.enum(["up", "down", "left", "right"]).optional(),
  easing: external_exports.enum(["linear", "easeIn", "easeOut", "easeInOut", "bounce"]).optional(),
  motionPath: MotionPathSchema.optional(),
  autoReverse: external_exports.boolean().optional(),
  toColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  scaleFactor: external_exports.number().positive().optional(),
  rotationAngle: external_exports.number().optional(),
  repeat: external_exports.union([external_exports.number().min(1), external_exports.literal("indefinite")]).optional(),
  repeatCount: external_exports.union([external_exports.number().min(1), external_exports.literal("indefinite")]).optional(),
  build: AnimationBuildSchema.optional(),
  buildType: external_exports.enum(["byParagraph", "byFirstLevel", "allAtOnce"]).optional()
}).superRefine((value, ctx) => {
  if (value.effect === "motionPath" && !value.motionPath?.path) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'Animation effect "motionPath" requires a motionPath object with a path string',
      path: ["motionPath"]
    });
  }
  if (value.effect === "colorChange" && !value.toColor) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'Animation effect "colorChange" requires toColor',
      path: ["toColor"]
    });
  }
});
var AnimationGroupSchema = external_exports.object({
  type: external_exports.enum(["parallel", "sequence"]),
  animations: external_exports.array(AnimationIntentSchema).max(100),
  trigger: external_exports.enum(["onClick", "withPrevious", "afterPrevious"]).optional()
});
var ConnectorPointSchema = external_exports.object({
  x: external_exports.number(),
  y: external_exports.number()
});
var HeaderFooterSchema = external_exports.object({
  slideNumber: external_exports.boolean().optional(),
  footer: external_exports.string().optional(),
  dateTime: external_exports.boolean().optional()
});
var ShapeLocksSchema = external_exports.object({
  noGrp: external_exports.boolean().optional(),
  noSelect: external_exports.boolean().optional(),
  noRot: external_exports.boolean().optional(),
  noChangeAspect: external_exports.boolean().optional(),
  noMove: external_exports.boolean().optional(),
  noResize: external_exports.boolean().optional(),
  noEditPoints: external_exports.boolean().optional(),
  noAdjustHandles: external_exports.boolean().optional(),
  noChangeArrowheads: external_exports.boolean().optional(),
  noChangeShapeType: external_exports.boolean().optional(),
  noTextEdit: external_exports.boolean().optional()
});
var PathCommandSchema = external_exports.discriminatedUnion("type", [
  external_exports.object({ type: external_exports.literal("moveTo"), x: external_exports.number(), y: external_exports.number() }),
  external_exports.object({ type: external_exports.literal("lineTo"), x: external_exports.number(), y: external_exports.number() }),
  external_exports.object({ type: external_exports.literal("cubicBezTo"), cp1x: external_exports.number(), cp1y: external_exports.number(), cp2x: external_exports.number(), cp2y: external_exports.number(), x: external_exports.number(), y: external_exports.number() }),
  external_exports.object({ type: external_exports.literal("quadBezTo"), cpx: external_exports.number(), cpy: external_exports.number(), x: external_exports.number(), y: external_exports.number() }),
  external_exports.object({ type: external_exports.literal("arcTo"), wR: external_exports.number(), hR: external_exports.number(), stAng: external_exports.number(), swAng: external_exports.number() }),
  external_exports.object({ type: external_exports.literal("close") })
]);
var CustomGeometryPathSchema = external_exports.object({
  commands: external_exports.array(PathCommandSchema).min(1).max(1e4),
  width: external_exports.number().optional(),
  height: external_exports.number().optional(),
  fill: external_exports.enum(["norm", "none", "lighten", "darken"]).optional()
});
var CustomGeometrySchema = external_exports.object({
  paths: external_exports.array(CustomGeometryPathSchema).min(1).max(100)
});
var PaperNodeSchema = external_exports.lazy(
  () => external_exports.discriminatedUnion("type", [
    external_exports.object({
      type: external_exports.literal("View"),
      style: FlexStyleSchema.optional(),
      children: external_exports.array(PaperNodeSchema).max(1e3).optional(),
      shapeType: ShapeTypeSchema.optional(),
      shapeAdjustments: external_exports.array(external_exports.number()).optional(),
      shapeAdjustmentMap: external_exports.record(external_exports.string(), external_exports.number()).optional(),
      customGeometry: CustomGeometrySchema.optional(),
      placeholder: PlaceholderRefSchema.optional(),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      hyperlink: HyperlinkSchema.optional(),
      altText: external_exports.string().optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional(),
      textContent: external_exports.union([external_exports.string().max(1e5), external_exports.array(TextRunSchema).max(1e3)]).optional(),
      textParagraphs: external_exports.array(ParagraphSchema).max(500).optional(),
      textStyle: TextStyleSchema.optional()
    }),
    external_exports.object({
      type: external_exports.literal("Text"),
      style: TextStyleSchema.optional(),
      content: external_exports.union([external_exports.string().max(1e5), external_exports.array(TextRunSchema).max(1e3)]).optional(),
      paragraphs: external_exports.array(ParagraphSchema).max(500).optional(),
      autoFit: external_exports.boolean().optional(),
      placeholder: PlaceholderRefSchema.optional(),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional()
    }),
    external_exports.object({
      type: external_exports.literal("Image"),
      style: FlexStyleSchema.optional(),
      src: external_exports.string().url().or(external_exports.string().startsWith("data:image/")),
      svgSrc: external_exports.string().url().or(external_exports.string().startsWith("data:image/svg+xml")).optional(),
      crop: ImageCropSchema.optional(),
      borderRadius: external_exports.number().min(0).optional(),
      placeholder: PlaceholderRefSchema.optional(),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      altText: external_exports.string().optional(),
      hyperlink: HyperlinkSchema.optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional(),
      imageEffects: external_exports.object({
        brightness: external_exports.number().optional(),
        contrast: external_exports.number().optional(),
        grayscale: external_exports.boolean().optional(),
        biLevel: external_exports.number().optional(),
        duotone: external_exports.object({ color1: ColorSchema, color2: ColorSchema }).optional(),
        blur: external_exports.number().optional()
      }).optional()
    }),
    external_exports.object({
      type: external_exports.literal("Table"),
      style: FlexStyleSchema.optional(),
      tableData: TableDataSchema,
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      altText: external_exports.string().optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional()
    }),
    external_exports.object({
      type: external_exports.literal("Chart"),
      style: FlexStyleSchema.optional(),
      chartData: ChartDataSchema,
      chartAnimation: external_exports.object({
        buildType: external_exports.enum(["bySeries", "byCategory", "byElement", "allAtOnce"]),
        trigger: external_exports.enum(["onClick", "withPrevious", "afterPrevious"]).optional(),
        effect: external_exports.string().optional(),
        duration: external_exports.number().optional()
      }).optional(),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      altText: external_exports.string().optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional()
    }),
    external_exports.object({
      type: external_exports.literal("Group"),
      style: FlexStyleSchema.optional(),
      children: external_exports.array(PaperNodeSchema).max(1e3),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      altText: external_exports.string().optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional()
    }),
    external_exports.object({
      type: external_exports.literal("Connector"),
      style: FlexStyleSchema.optional(),
      connectorType: external_exports.enum(CONNECTOR_TYPES),
      start: ConnectorPointSchema,
      end: ConnectorPointSchema,
      lineWidth: external_exports.number().optional(),
      lineColor: ColorSchema.optional(),
      lineDashStyle: external_exports.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
      arrowStart: external_exports.union([
        external_exports.boolean(),
        external_exports.object({
          type: external_exports.enum(ARROW_HEAD_TYPES),
          width: external_exports.enum(ARROW_HEAD_SIZES).optional(),
          length: external_exports.enum(ARROW_HEAD_SIZES).optional()
        })
      ]).optional(),
      arrowEnd: external_exports.union([
        external_exports.boolean(),
        external_exports.object({
          type: external_exports.enum(ARROW_HEAD_TYPES),
          width: external_exports.enum(ARROW_HEAD_SIZES).optional(),
          length: external_exports.enum(ARROW_HEAD_SIZES).optional()
        })
      ]).optional(),
      startShape: external_exports.object({
        shapeId: external_exports.number().int(),
        site: external_exports.number().int().min(0).optional()
      }).optional(),
      endShape: external_exports.object({
        shapeId: external_exports.number().int(),
        site: external_exports.number().int().min(0).optional()
      }).optional(),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      altText: external_exports.string().optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional()
    }),
    external_exports.object({
      type: external_exports.literal("Video"),
      style: FlexStyleSchema.optional(),
      src: external_exports.string(),
      poster: external_exports.string().optional(),
      mimeType: external_exports.string().optional(),
      playback: external_exports.object({
        loop: external_exports.boolean().optional(),
        volume: external_exports.number().min(0).max(100).optional(),
        trimStart: external_exports.number().min(0).optional(),
        trimEnd: external_exports.number().min(0).optional(),
        autoPlay: external_exports.boolean().optional(),
        hideOnClick: external_exports.boolean().optional()
      }).optional(),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      altText: external_exports.string().optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional()
    }),
    external_exports.object({
      type: external_exports.literal("Audio"),
      style: FlexStyleSchema.optional(),
      src: external_exports.string(),
      mimeType: external_exports.string().optional(),
      playback: external_exports.object({
        loop: external_exports.boolean().optional(),
        volume: external_exports.number().min(0).max(100).optional(),
        trimStart: external_exports.number().min(0).optional(),
        trimEnd: external_exports.number().min(0).optional(),
        autoPlay: external_exports.boolean().optional(),
        hideOnClick: external_exports.boolean().optional()
      }).optional(),
      playAcrossSlides: external_exports.boolean().optional(),
      icon: external_exports.enum(["speaker", "none"]).optional(),
      animations: external_exports.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: external_exports.array(AnimationGroupSchema).max(50).optional(),
      morphId: external_exports.string().min(1).optional(),
      altText: external_exports.string().optional(),
      decorative: external_exports.boolean().optional(),
      readingOrder: external_exports.number().int().min(0).optional()
    })
  ])
);
var SlideCommentSchema = external_exports.object({
  author: external_exports.string(),
  text: external_exports.string().default(""),
  date: external_exports.string().optional(),
  x: external_exports.number().optional(),
  y: external_exports.number().optional()
});
var PaperSlideSchema = external_exports.object({
  type: external_exports.literal("Slide"),
  agentPattern: external_exports.enum(["title", "statement", "dashboard", "comparison", "chart-focus", "bullets"]).optional(),
  style: FlexStyleSchema.optional(),
  layoutName: external_exports.string().optional(),
  masterName: external_exports.string().optional(),
  transition: SlideTransitionSchema.optional(),
  background: SlideBackgroundSchema.optional(),
  notes: external_exports.union([external_exports.string(), external_exports.array(ParagraphSchema).max(500)]).optional(),
  headerFooter: HeaderFooterSchema.optional(),
  comments: external_exports.array(SlideCommentSchema).max(1e3).optional(),
  children: external_exports.array(PaperNodeSchema).max(500)
});
var SlideSizeSchema = external_exports.object({
  // Max ~5600px keeps EMU values within 32-bit signed int range (5600 * 9525 ≈ 53M < 2^31)
  width: external_exports.number().positive().max(5600),
  height: external_exports.number().positive().max(5600)
});
var ThemeColorSchemeSchema = external_exports.object({
  dk1: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  lt1: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  dk2: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  lt2: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent1: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent2: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent3: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent4: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent5: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent6: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  hlink: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folHlink: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});
var ThemeFontSchemeSchema = external_exports.object({
  majorLatin: external_exports.string().optional(),
  minorLatin: external_exports.string().optional(),
  majorEa: external_exports.string().optional(),
  minorEa: external_exports.string().optional()
});
var ThemeConfigSchema = external_exports.object({
  name: external_exports.string().optional(),
  colorScheme: ThemeColorSchemeSchema.optional(),
  fontScheme: ThemeFontSchemeSchema.optional()
});
var SlideSectionSchema = external_exports.object({
  name: external_exports.string(),
  slideIndices: external_exports.array(external_exports.number().int().min(0)).max(500)
});
var SlideLayoutConfigSchema = external_exports.object({
  name: external_exports.string(),
  placeholders: external_exports.array(PlaceholderRefSchema).max(50).optional()
});
var SlideMasterConfigSchema = external_exports.object({
  name: external_exports.string(),
  layouts: external_exports.array(SlideLayoutConfigSchema).min(1).max(50),
  background: SlideBackgroundSchema.optional()
});
var FontEmbedConfigSchema = external_exports.object({
  fontFamily: external_exports.string(),
  src: external_exports.string(),
  bold: external_exports.boolean().optional(),
  italic: external_exports.boolean().optional()
});
var FontStrategySchema = external_exports.enum([
  "portable",
  "system",
  "user-embedded",
  "named-with-fallback",
  "system-safe",
  "embedded"
]);
var DocumentProtectionSchema = external_exports.object({
  modifyPassword: external_exports.string().optional(),
  readOnly: external_exports.boolean().optional()
});
var CustomShowSchema = external_exports.object({
  name: external_exports.string(),
  slideIndices: external_exports.array(external_exports.number().int().min(0)).max(500)
});
var PaperDocumentSchema = external_exports.object({
  version: external_exports.literal("1.0").default("1.0"),
  type: external_exports.literal("Document"),
  meta: external_exports.object({
    title: external_exports.string().optional(),
    author: external_exports.string().optional(),
    language: external_exports.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/).optional()
  }),
  template: external_exports.instanceof(Buffer).optional(),
  slideSize: SlideSizeSchema.optional(),
  notesSize: SlideSizeSchema.optional(),
  theme: ThemeConfigSchema.optional(),
  fontStrategy: FontStrategySchema.optional(),
  sections: external_exports.array(SlideSectionSchema).max(100).optional(),
  masters: external_exports.array(SlideMasterConfigSchema).max(20).optional(),
  embeddedFonts: external_exports.array(FontEmbedConfigSchema).max(50).optional(),
  protection: DocumentProtectionSchema.optional(),
  customShows: external_exports.array(CustomShowSchema).max(100).optional(),
  customProperties: external_exports.array(external_exports.object({
    name: external_exports.string(),
    value: external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean(), external_exports.date()])
  })).max(100).optional(),
  handoutLayout: external_exports.enum(["1", "2", "3", "4", "6", "9"]).optional(),
  printSettings: external_exports.object({
    colorMode: external_exports.enum(["clr", "gray", "bw"]).optional(),
    frameSlides: external_exports.boolean().optional(),
    scaleToFitPaper: external_exports.boolean().optional()
  }).optional(),
  chartFallbackImages: external_exports.boolean().optional(),
  slides: external_exports.array(PaperSlideSchema).min(1).max(200)
});

export {
  PaperNodeSchema,
  PaperSlideSchema,
  PaperDocumentSchema
};
//# sourceMappingURL=chunk-7V4ECWKA.js.map
