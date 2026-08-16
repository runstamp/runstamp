import { z } from "zod";
import {
  ARROW_HEAD_SIZES,
  ARROW_HEAD_TYPES,
  CHART_TYPES,
  CONNECTOR_TYPES,
  PATTERN_TYPES,
  PLACEHOLDER_TYPES,
  SCHEME_COLORS,
  SHAPE_TYPES,
} from "../types/literals.js";

const DimensionSchema = z.union([z.number(), z.string().regex(/^\d+%$/)]);

const ColorModifierSchema = z.object({
  scheme: z.enum(SCHEME_COLORS),
  tint: z.number().min(0).max(100).optional(),
  shade: z.number().min(0).max(100).optional(),
  lumMod: z.number().optional(),
  lumOff: z.number().optional(),
  satMod: z.number().optional(),
  satOff: z.number().optional(),
  hueMod: z.number().optional(),
  hueOff: z.number().optional(),
  comp: z.boolean().optional(),
  inv: z.boolean().optional(),
  gray: z.boolean().optional(),
});

const ColorSchema = z.union([
  z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  z.enum(SCHEME_COLORS),
  ColorModifierSchema,
]);

const PlaceholderRefSchema = z.object({
  type: z.enum(PLACEHOLDER_TYPES).optional(),
  idx: z.number().int().min(0).optional(),
});

// Shape Geometry
const ShapeTypeSchema = z.enum(SHAPE_TYPES);

// Fills
const GradientStopSchema = z.object({
  color: ColorSchema,
  position: z.number().min(0).max(100),
  alpha: z.number().min(0).max(1).optional(),
});

const GradientFillSchema = z.object({
  type: z.enum(["linear", "gradient", "radial"]),
  angle: z.number().min(0).max(360).optional(),
  stops: z.array(GradientStopSchema).min(2).max(20),
});

const SolidFillSchema = z.object({
  type: z.literal("solid"),
  color: ColorSchema,
});

const PatternFillSchema = z.object({
  type: z.literal("pattern"),
  pattern: z.enum(PATTERN_TYPES),
  foreground: ColorSchema,
  background: ColorSchema,
});

const ImageFillSchema = z.object({
  type: z.literal("image"),
  src: z.string(),
  tile: z.boolean().optional(),
  stretch: z.boolean().optional(),
});

const FillSchema = z.discriminatedUnion("type", [SolidFillSchema, GradientFillSchema, PatternFillSchema, ImageFillSchema]);

// Effects
const DropShadowSchema = z.object({
  color: ColorSchema,
  offsetX: z.number(),
  offsetY: z.number(),
  blurRadius: z.number(),
  opacity: z.number().min(0).max(1).optional(),
});

const GlowSchema = z.object({
  color: ColorSchema,
  radius: z.number(),
  opacity: z.number().min(0).max(1).optional(),
});

const ReflectionSchema = z.object({
  blurRadius: z.number().optional(),
  startOpacity: z.number().min(0).max(1).optional(),
  endOpacity: z.number().min(0).max(1).optional(),
  distance: z.number().optional(),
  direction: z.number().optional(),
  size: z.number().min(0).max(100).optional(),
});

const SoftEdgeSchema = z.object({
  radius: z.number(),
});

const InnerShadowSchema = z.object({
  color: ColorSchema,
  offsetX: z.number(),
  offsetY: z.number(),
  blurRadius: z.number(),
  opacity: z.number().min(0).max(1).optional(),
});

const Scene3dSchema = z.object({
  camera: z.object({
    preset: z.string(),
    fov: z.number().optional(),
    zoom: z.number().optional(),
    rotation: z.object({
      lat: z.number().optional(),
      lon: z.number().optional(),
      rev: z.number().optional(),
    }).optional(),
  }),
  lightRig: z.object({
    type: z.string(),
    direction: z.string().optional(),
    rotation: z.object({
      lat: z.number().optional(),
      lon: z.number().optional(),
      rev: z.number().optional(),
    }).optional(),
  }).optional(),
});

const Sp3dSchema = z.object({
  extrudeHeight: z.number().optional(),
  contourWidth: z.number().optional(),
  contourColor: ColorSchema.optional(),
  bevelTop: z.object({
    preset: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  bevelBottom: z.object({
    preset: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  extrudeColor: ColorSchema.optional(),
  material: z.string().optional(),
});

const EffectsSchema = z.object({
  dropShadow: DropShadowSchema.optional(),
  innerShadow: InnerShadowSchema.optional(),
  glow: GlowSchema.optional(),
  reflection: ReflectionSchema.optional(),
  softEdge: SoftEdgeSchema.optional(),
  scene3d: Scene3dSchema.optional(),
  sp3d: Sp3dSchema.optional(),
});

const FlexStyleSchema = z.object({
  flexDirection: z.enum(["row", "column"]).optional(),
  justifyContent: z
    .enum(["flex-start", "flex-end", "center", "space-between", "space-around"])
    .optional(),
  alignItems: z.enum(["flex-start", "flex-end", "center", "stretch"]).optional(),
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  padding: z.number().optional(),
  paddingTop: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),
  margin: z.number().optional(),
  marginTop: z.number().optional(),
  marginRight: z.number().optional(),
  marginBottom: z.number().optional(),
  marginLeft: z.number().optional(),
  position: z.enum(["relative", "absolute"]).optional(),
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
  zIndex: z.number().optional(),
  backgroundColor: ColorSchema.optional(),
  // Phase 1: Flex API
  flexWrap: z.enum(["nowrap", "wrap", "wrap-reverse"]).optional(),
  flexGrow: z.number().min(0).optional(),
  flexShrink: z.number().min(0).optional(),
  flexBasis: DimensionSchema.optional(),
  gap: z.number().min(0).optional(),
  rowGap: z.number().min(0).optional(),
  columnGap: z.number().min(0).optional(),
  minWidth: DimensionSchema.optional(),
  maxWidth: DimensionSchema.optional(),
  minHeight: DimensionSchema.optional(),
  maxHeight: DimensionSchema.optional(),
  alignSelf: z.enum(["auto", "flex-start", "flex-end", "center", "stretch"]).optional(),
  aspectRatio: z.number().positive().optional(),
  display: z.enum(["flex", "none"]).optional(),
  // Phase 2: Visual Properties
  fill: FillSchema.optional(),
  borderRadius: z.number().min(0).optional(),
  borderWidth: z.number().min(0).optional(),
  borderColor: ColorSchema.optional(),
  borderStyle: z.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
  borderCap: z.enum(["flat", "round", "square"]).optional(),
  borderCompound: z.enum(["single", "double", "thickThin", "thinThick", "triple"]).optional(),
  effects: EffectsSchema.optional(),
  // Phase 3: Transform Properties
  rotation: z.number().min(-360).max(360).optional(),
  opacity: z.number().min(0).max(1).optional(),
  flipH: z.boolean().optional(),
  flipV: z.boolean().optional(),
});

const TextDecorationLineSchema = z.enum(["none", "underline", "strikethrough", "underline-strikethrough"]).optional();
const TextDecorationStyleSchema = z.enum(["solid", "double", "dotted", "dashed"]).optional();

const TextInsetsSchema = z.object({
  left: z.number().optional(),
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
});

const TextFitConfigSchema = z.object({
  policy: z.enum(["strict", "fitHeight", "fitFontSize", "truncate", "overflow"]),
  minFontSize: z.number().min(1).max(4000).optional(),
  maxLines: z.number().int().min(1).max(1000).optional(),
  marker: z.string().max(20).optional(),
});

const TextStyleSchema = FlexStyleSchema.extend({
  color: ColorSchema.optional(),
  fontSize: z.number().min(1).max(4000).optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
  lineHeight: z.number().optional(),
  fontFallback: z.array(z.string()).max(20).optional(),
  textDecorationLine: TextDecorationLineSchema,
  textDecorationStyle: TextDecorationStyleSchema,
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  textInsets: TextInsetsSchema.optional(),
  textDirection: z.enum(["horizontal", "vertical", "verticalEA"]).optional(),
  rtl: z.boolean().optional(),
  columns: z.number().int().min(1).max(16).optional(),
  columnSpacing: z.number().min(0).optional(),
  lang: z.string().optional(),
  textWarp: z.string().optional(),
  textFit: TextFitConfigSchema.optional(),
});

const TextRunStyleSchema = z.object({
  color: ColorSchema.optional(),
  fontSize: z.number().min(1).max(4000).optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textDecorationLine: TextDecorationLineSchema,
  textDecorationStyle: TextDecorationStyleSchema,
  baseline: z.enum(["superscript", "subscript"]).optional(),
  letterSpacing: z.number().optional(),
  shadow: DropShadowSchema.optional(),
  outline: z.object({ width: z.number(), color: ColorSchema }).optional(),
  textTransform: z.enum(["uppercase", "lowercase", "capitalize", "none"]).optional(),
  gradientFill: GradientFillSchema.optional(),
  lang: z.string().optional(),
  altLang: z.string().optional(),
  highlight: ColorSchema.optional(),
  kerning: z.number().optional(),
});

const HyperlinkTargetSchema = z.object({
  url: z.string().optional(),
  mailto: z.string().optional(),
  slide: z.number().int().min(1).optional(),
  action: z.enum(["firstSlide", "lastSlide", "nextSlide", "previousSlide", "endShow"]).optional(),
  tooltip: z.string().optional(),
}).refine(
  (t) => [t.url, t.mailto, t.slide, t.action].filter(v => v !== undefined).length <= 1,
  { message: "HyperlinkTarget must specify at most one of: url, mailto, slide, action" },
);

const HyperlinkSchema = z.union([z.string(), HyperlinkTargetSchema]);


const TextRunSchema = z.object({
  text: z.string().default(""),
  style: TextRunStyleSchema.optional(),
  hyperlink: HyperlinkSchema.optional(),
});

// Bullet / Numbering
const BulletCharSchema = z.object({
  type: z.literal("char").optional(),
  char: z.string(),
  color: ColorSchema.optional(),
  size: z.number().optional(),
  fontFamily: z.string().optional(),
});

const AutoNumSchemeSchema = z.enum([
  "arabicPeriod", "arabicParenR",
  "romanUcPeriod", "romanLcPeriod",
  "alphaUcPeriod", "alphaLcPeriod",
  "alphaLcParenR", "alphaUcParenR",
]);

const BulletAutoNumSchema = z.object({
  type: z.literal("autoNum"),
  scheme: AutoNumSchemeSchema,
  startAt: z.number().int().min(1).optional(),
});

const BulletNoneSchema = z.object({
  type: z.literal("none"),
});

const BulletConfigSchema = z.union([BulletCharSchema, BulletAutoNumSchema, BulletNoneSchema]);

const TabStopSchema = z.object({
  position: z.number(),
  align: z.enum(["l", "ctr", "r", "dec"]).optional(),
});

const ParagraphSchema = z.object({
  runs: z.array(TextRunSchema).max(1000),
  align: z.enum(["left", "center", "right", "justify"]).optional(),
  lineHeight: z.number().optional(),
  spaceBefore: z.number().optional(),
  spaceAfter: z.number().optional(),
  level: z.number().int().min(0).max(8).optional(),
  indent: z.number().optional(),
  marginLeft: z.number().optional(),
  bullet: BulletConfigSchema.optional(),
  rtl: z.boolean().optional(),
  tabStops: z.array(TabStopSchema).max(50).optional(),
  hangingIndent: z.number().optional(),
  lineSpacingMode: z.enum(["points", "percentage"]).optional(),
  spaceBeforePercent: z.number().optional(),
  spaceAfterPercent: z.number().optional(),
});

// Table cell styling
const TableCellBorderSchema = z.object({
  width: z.number().optional(),
  color: ColorSchema.optional(),
});

const TableCellBordersSchema = z.object({
  top: TableCellBorderSchema.optional(),
  right: TableCellBorderSchema.optional(),
  bottom: TableCellBorderSchema.optional(),
  left: TableCellBorderSchema.optional(),
  diagonalDown: TableCellBorderSchema.optional(),
  diagonalUp: TableCellBorderSchema.optional(),
});

const TableCellStyleSchema = z.object({
  fill: z.union([ColorSchema, GradientFillSchema]).optional(),
  borders: TableCellBordersSchema.optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  fontSize: z.number().min(1).max(4000).optional(),
  fontFamily: z.string().optional(),
  fontFallback: z.array(z.string()).max(20).optional(),
  color: ColorSchema.optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  padding: z.number().optional(),
  textDirection: z.enum(["horizontal", "vertical", "verticalEA"]).optional(),
  rtl: z.boolean().optional(),
  lang: z.string().optional(),
});

const TableCellSchema = z.object({
  text: z.string().default(""),
  style: TableCellStyleSchema.optional(),
  colSpan: z.number().int().min(1).optional(),
  rowSpan: z.number().int().min(1).optional(),
  vMerge: z.boolean().optional(),
  hMerge: z.boolean().optional(),
  content: z.array(TextRunSchema).max(1000).optional(),
  paragraphs: z.array(ParagraphSchema).max(500).optional(),
});

const TableRowSchema = z.object({
  height: z.number().optional(),
  minHeight: z.number().min(0).optional(),
  cells: z.array(TableCellSchema).max(100),
});

const TableStyleSchema = z.object({
  bandRow: z.boolean().optional(),
  bandCol: z.boolean().optional(),
  firstRow: z.boolean().optional(),
  lastRow: z.boolean().optional(),
  firstCol: z.boolean().optional(),
  lastCol: z.boolean().optional(),
  headerRowStyle: TableCellStyleSchema.optional(),
  footerRowStyle: TableCellStyleSchema.optional(),
  firstColStyle: TableCellStyleSchema.optional(),
  lastColStyle: TableCellStyleSchema.optional(),
  bandRowEvenStyle: TableCellStyleSchema.optional(),
  bandRowOddStyle: TableCellStyleSchema.optional(),
  outerBorder: TableCellBorderSchema.optional(),
  innerBorderH: TableCellBorderSchema.optional(),
  innerBorderV: TableCellBorderSchema.optional(),
});

const TableRowLayoutPolicySchema = z.object({
  mode: z.enum(["natural", "fill"]).optional(),
  minRowHeight: z.number().min(0).optional(),
  overflow: z.enum(["warn", "allow"]).optional(),
});

const TableDataSchema = z.object({
  columns: z.array(z.number().positive()).min(1).max(100),
  rows: z.array(TableRowSchema).min(1).max(1000),
  style: TableStyleSchema.optional(),
  autoFit: z.union([z.boolean(), z.literal("distribute")]).optional(),
  rowLayout: TableRowLayoutPolicySchema.optional(),
}).refine(data => data.rows.every(r => r.cells.length === data.columns.length),
  { message: "Each row must have exactly as many cells as columns" });

// Chart schemas
const MarkerConfigSchema = z.object({
  symbol: z.enum(["circle", "square", "diamond", "triangle", "x", "star", "plus", "dot", "dash", "none"]),
  size: z.number().min(2).max(72).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const TrendlineConfigSchema = z.object({
  type: z.enum(["linear", "exponential", "logarithmic", "polynomial", "power", "movingAvg"]),
  order: z.number().int().min(2).max(6).optional(),
  period: z.number().int().min(2).optional(),
  forward: z.number().optional(),
  backward: z.number().optional(),
  displayEquation: z.boolean().optional(),
  displayRSquared: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const ErrorBarsConfigSchema = z.object({
  direction: z.enum(["x", "y", "both"]),
  type: z.enum(["fixedVal", "percentage", "stdDev", "stdErr"]),
  value: z.number().optional(),
});

const ChartDataLabelsSchema = z.object({
  showVal: z.boolean().optional(),
  showCatName: z.boolean().optional(),
  showSerName: z.boolean().optional(),
  showPercent: z.boolean().optional(),
  formatCode: z.string().optional(),
  position: z.enum(["outEnd", "inEnd", "ctr", "inBase", "bestFit"]).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
});

const ChartSeriesSchema = z.object({
  name: z.string(),
  values: z.array(z.number()).max(16384),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  overrideType: z.enum(["bar", "line", "area"]).optional(),
  targetAxis: z.enum(["primary", "secondary"]).optional(),
  pointColors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(16384).optional(),
  marker: MarkerConfigSchema.optional(),
  trendline: TrendlineConfigSchema.optional(),
  errorBars: ErrorBarsConfigSchema.optional(),
  dataLabels: ChartDataLabelsSchema.optional(),
});

const XYDataPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  size: z.number().optional(),
});

const XYSeriesSchema = z.object({
  name: z.string(),
  dataPoints: z.array(XYDataPointSchema).max(32000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const ChartGridlinesSchema = z.object({
  major: z.boolean().optional(),
  minor: z.boolean().optional(),
  color: z.string().optional(),
});

const ChartAxisConfigSchema = z.object({
  title: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontColor: ColorSchema.optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  visible: z.boolean().optional(),
  numberFormat: z.string().optional(),
  gridlines: ChartGridlinesSchema.optional(),
  tickMark: z.object({
    major: z.enum(["cross", "in", "out", "none"]).optional(),
    minor: z.enum(["cross", "in", "out", "none"]).optional(),
  }).optional(),
  labelRotation: z.number().optional(),
  labelFont: z.object({
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    fontColor: z.string().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
  }).optional(),
  crossesAt: z.number().optional(),
});

const ChartAreaStyleSchema = z.object({
  fill: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderWidth: z.number().min(0).optional(),
});

const WaterfallDataSchema = z.object({
  categories: z.array(z.string()).min(1).max(16384),
  values: z.array(z.number()).min(1).max(16384),
  totalIndices: z.array(z.number().int().min(0)).max(16384).optional(),
  increaseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  decreaseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  totalColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  connectorLines: z.boolean().optional(),
});

const StockDataSchema = z.object({
  categories: z.array(z.string()).min(1).max(16384),
  open: z.array(z.number()).min(1).max(16384),
  high: z.array(z.number()).min(1).max(16384),
  low: z.array(z.number()).min(1).max(16384),
  close: z.array(z.number()).min(1).max(16384),
  hiLowLines: z.boolean().optional(),
  upDownBars: z.boolean().optional(),
  upColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  downColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const FunnelDataSchema = z.object({
  categories: z.array(z.string()).min(1).max(16384),
  values: z.array(z.number()).min(1).max(16384),
  colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(16384).optional(),
});

const ChartDataTableSchema = z.object({
  showKeys: z.boolean().optional(),
  showHorzBorder: z.boolean().optional(),
  showVertBorder: z.boolean().optional(),
  showOutline: z.boolean().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
});

const ChartCategoryAnchorSchema = z.object({
  categoryIndex: z.number(),
  seriesIndex: z.number().int().nonnegative().optional(),
  anchor: z.enum(["barTop", "barBottom", "value"]).optional(),
  value: z.number().optional(),
});

const ChartTextAnnotationSchema = z.object({
  kind: z.literal("text").optional(),
  text: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100).optional(),
  height: z.number().min(0).max(100).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontColor: ColorSchema.optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  fill: ColorSchema.optional(),
  borderColor: ColorSchema.optional(),
  borderWidth: z.number().optional(),
  shapeType: z.enum(["rect", "roundRect", "ellipse", "wedgeRectCallout"]).optional(),
});

const ChartTrendArrowAnnotationSchema = z.object({
  kind: z.literal("trendArrow"),
  from: ChartCategoryAnchorSchema,
  to: ChartCategoryAnchorSchema,
  label: z.string().optional(),
  color: ColorSchema.optional(),
  width: z.number().positive().optional(),
  dashStyle: z.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
  labelFontFamily: z.string().optional(),
  labelFontSize: z.number().positive().optional(),
  labelColor: ColorSchema.optional(),
});

const ChartTargetLineAnnotationSchema = z.object({
  kind: z.literal("targetLine"),
  value: z.number(),
  label: z.string().optional(),
  color: ColorSchema.optional(),
  width: z.number().positive().optional(),
  dashStyle: z.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
  labelFontFamily: z.string().optional(),
  labelFontSize: z.number().positive().optional(),
  labelColor: ColorSchema.optional(),
});

const ChartAnnotationSchema = z.union([
  ChartTrendArrowAnnotationSchema,
  ChartTargetLineAnnotationSchema,
  ChartTextAnnotationSchema,
]);

// Modern chart data schemas (ChartEx)
const TreemapCategorySchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    name: z.string(),
    value: z.number().optional(),  // optional for branch nodes (value derived from children)
    children: z.array(TreemapCategorySchema).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
);

const TreemapDataSchema = z.object({
  categories: z.array(TreemapCategorySchema).min(1),
  dataLabels: ChartDataLabelsSchema.optional(),
});

const SunburstDataSchema = z.object({
  categories: z.array(TreemapCategorySchema).min(1),
  dataLabels: ChartDataLabelsSchema.optional(),
});

const HistogramDataSchema = z.object({
  values: z.array(z.number()).min(1).max(32000),
  binCount: z.number().int().min(1).optional(),
  binWidth: z.number().positive().optional(),
  overflow: z.number().optional(),
  underflow: z.number().optional(),
  seriesName: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  dataLabels: ChartDataLabelsSchema.optional(),
});

const BoxWhiskerSeriesSchema = z.object({
  name: z.string(),
  values: z.array(z.number()).min(1).max(32000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const BoxWhiskerDataSchema = z.object({
  categories: z.array(z.string()).min(1).max(16384),
  series: z.array(BoxWhiskerSeriesSchema).min(1).max(255),
  quartileMethod: z.enum(["inclusive", "exclusive"]).optional(),
  showOutliers: z.boolean().optional(),
  showMeanMarker: z.boolean().optional(),
  showMeanLine: z.boolean().optional(),
  showInnerPoints: z.boolean().optional(),
  showConnectorLines: z.boolean().optional(),
  dataLabels: ChartDataLabelsSchema.optional(),
});

const ChartDataSchema = z.object({
  chartType: z.enum(CHART_TYPES),
  dataLabels: ChartDataLabelsSchema.optional(),
  barGrouping: z.enum(["clustered", "stacked", "percentStacked"]).optional(),
  lineGrouping: z.enum(["standard", "stacked", "percentStacked"]).optional(),
  areaGrouping: z.enum(["standard", "stacked", "percentStacked"]).optional(),
  barDirection: z.enum(["col", "bar"]).optional(),
  smooth: z.boolean().optional(),
  marker: MarkerConfigSchema.optional(),
  explosion: z.number().min(0).max(400).optional(),
  categories: z.array(z.string()).max(16384).optional(),
  series: z.array(ChartSeriesSchema).max(255).optional(),
  xySeries: z.array(XYSeriesSchema).max(255).optional(),
  holeSize: z.number().min(10).max(90).optional(),
  title: z.object({
    text: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    fontColor: ColorSchema.optional(),
    bold: z.boolean().optional(),
  }).optional(),
  categoryAxis: ChartAxisConfigSchema.optional(),
  valueAxis: ChartAxisConfigSchema.optional(),
  secondaryValueAxis: ChartAxisConfigSchema.optional(),
  secondaryCategoryAxis: ChartAxisConfigSchema.optional(),
  legend: z.object({
    position: z.enum(["bottom", "top", "left", "right", "none"]).optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    fontColor: ColorSchema.optional(),
    border: z.object({
      color: z.string().optional(),
      width: z.number().optional(),
    }).optional(),
    fill: z.string().optional(),
  }).optional(),
  // Phase 3: Bar chart spacing
  gapWidth: z.number().min(0).max(500).optional(),
  overlap: z.number().min(-100).max(100).optional(),
  // Phase 3: Pie/doughnut first slice angle
  firstSliceAng: z.number().min(0).max(360).optional(),
  // Phase 3: Plot area & chart area styling
  plotArea: ChartAreaStyleSchema.optional(),
  chartArea: ChartAreaStyleSchema.optional(),
  // Phase 3: Display blanks as
  dispBlanksAs: z.enum(["gap", "zero", "span"]).optional(),
  // Phase 3: Radar chart
  radarStyle: z.enum(["radar", "filled"]).optional(),
  // Phase 3: Waterfall chart
  waterfallData: WaterfallDataSchema.optional(),
  // Phase 4: Stock chart
  stockData: StockDataSchema.optional(),
  // Phase 4: Funnel chart
  funnelData: FunnelDataSchema.optional(),
  // Phase 4: Data table
  dataTable: ChartDataTableSchema.optional(),
  // Modern chart types (ChartEx)
  treemapData: z.lazy(() => TreemapDataSchema).optional(),
  sunburstData: z.lazy(() => SunburstDataSchema).optional(),
  histogramData: HistogramDataSchema.optional(),
  boxWhiskerData: BoxWhiskerDataSchema.optional(),
  annotations: z.array(ChartAnnotationSchema).max(50).optional(),
}).superRefine((data, ctx) => {
  const fail = (msg: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });

  if (data.chartType === "scatter" || data.chartType === "bubble") {
    if (!data.xySeries || data.xySeries.length === 0) {
      fail(`${data.chartType} chart requires xySeries with at least one entry`);
    }
    return;
  }
  if (data.chartType === "waterfall") { if (!data.waterfallData) fail("waterfall chart requires waterfallData"); return; }
  if (data.chartType === "stock") { if (!data.stockData) fail("stock chart requires stockData"); return; }
  if (data.chartType === "funnel") { if (!data.funnelData) fail("funnel chart requires funnelData"); return; }
  if (data.chartType === "treemap") { if (!data.treemapData) fail("treemap chart requires treemapData"); return; }
  if (data.chartType === "sunburst") { if (!data.sunburstData) fail("sunburst chart requires sunburstData"); return; }
  if (data.chartType === "histogram") { if (!data.histogramData) fail("histogram chart requires histogramData"); return; }
  if (data.chartType === "boxWhisker") { if (!data.boxWhiskerData) fail("boxWhisker chart requires boxWhiskerData"); return; }

  // Category-based charts (bar, line, pie, area, doughnut, radar)
  if (!data.categories) { fail(`${data.chartType} chart requires categories`); return; }
  if (!data.series) { fail(`${data.chartType} chart requires series`); return; }
  if (data.series.some((s) => s.values.length !== data.categories!.length)) {
    fail(`${data.chartType} chart: each series.values must have the same length as categories (${data.categories.length})`);
  }
});

// Image properties
const ImageCropSchema = z.object({
  left: z.number().min(0).max(100).optional(),
  top: z.number().min(0).max(100).optional(),
  right: z.number().min(0).max(100).optional(),
  bottom: z.number().min(0).max(100).optional(),
});

// Slide Background
const SolidBackgroundSchema = z.object({
  type: z.literal("solid"),
  color: ColorSchema,
});

const GradientBackgroundSchema = z.object({
  type: z.literal("gradient"),
  angle: z.number().optional(),
  stops: z.array(GradientStopSchema).min(2).max(20),
});

const PatternBackgroundSchema = z.object({
  type: z.literal("pattern"),
  pattern: z.enum(PATTERN_TYPES),
  foreground: ColorSchema,
  background: ColorSchema,
});

const ImageBackgroundSchema = z.object({
  type: z.literal("image"),
  src: z.string(),
  tile: z.boolean().optional(),
});

const SlideBackgroundSchema = z.discriminatedUnion("type", [SolidBackgroundSchema, GradientBackgroundSchema, PatternBackgroundSchema, ImageBackgroundSchema]);

// Slide Transitions
const SlideTransitionSchema = z.object({
  type: z.enum(["fade", "push", "wipe", "cover", "zoom", "morph", "split", "blinds", "checker", "dissolve", "comb"]),
  duration: z.number().min(0).optional(),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  advanceOnClick: z.boolean().optional(),
  advanceAfterTime: z.number().min(0).optional(),
});

// Animations
const MotionPathSchema = z.object({
  path: z.string(),
  pathType: z.enum(["line", "arc", "custom"]).optional(),
  origin: z.enum(["layout", "parent"]).optional(),
});

const AnimationBuildSchema = z.object({
  nested: z.boolean().optional(),
  grouping: z.enum(["byParagraph", "byFirstLevel", "allAtOnce"]).optional(),
  dimAfter: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const AnimationIntentSchema = z.object({
  type: z.enum(["entrance", "exit", "emphasis"]),
  effect: z.enum(["fade", "fly", "zoom", "spin", "appear",
    "bounce", "float", "grow", "shrink", "growShrink", "pulse",
    "teeter", "wipe", "split", "dissolve", "swivel", "motionPath",
    "colorReveal", "colorChange", "boldFlash", "wave", "flip"]),
  trigger: z.enum(["onClick", "withPrevious", "afterPrevious"]),
  duration: z.number().min(0).optional(),
  delay: z.number().min(0).optional(),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut", "bounce"]).optional(),
  motionPath: MotionPathSchema.optional(),
  autoReverse: z.boolean().optional(),
  toColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  scaleFactor: z.number().positive().optional(),
  rotationAngle: z.number().optional(),
  repeat: z.union([z.number().min(1), z.literal("indefinite")]).optional(),
  repeatCount: z.union([z.number().min(1), z.literal("indefinite")]).optional(),
  build: AnimationBuildSchema.optional(),
  buildType: z.enum(["byParagraph", "byFirstLevel", "allAtOnce"]).optional(),
}).superRefine((value, ctx) => {
  if (value.effect === "motionPath" && !value.motionPath?.path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Animation effect "motionPath" requires a motionPath object with a path string',
      path: ["motionPath"],
    });
  }

  if (value.effect === "colorChange" && !value.toColor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Animation effect "colorChange" requires toColor',
      path: ["toColor"],
    });
  }
});

const AnimationGroupSchema = z.object({
  type: z.enum(["parallel", "sequence"]),
  animations: z.array(AnimationIntentSchema).max(100),
  trigger: z.enum(["onClick", "withPrevious", "afterPrevious"]).optional(),
});

// Connector schema
const ConnectorPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Header/Footer
const HeaderFooterSchema = z.object({
  slideNumber: z.boolean().optional(),
  footer: z.string().optional(),
  dateTime: z.boolean().optional(),
});

// Shape Locks
const ShapeLocksSchema = z.object({
  noGrp: z.boolean().optional(),
  noSelect: z.boolean().optional(),
  noRot: z.boolean().optional(),
  noChangeAspect: z.boolean().optional(),
  noMove: z.boolean().optional(),
  noResize: z.boolean().optional(),
  noEditPoints: z.boolean().optional(),
  noAdjustHandles: z.boolean().optional(),
  noChangeArrowheads: z.boolean().optional(),
  noChangeShapeType: z.boolean().optional(),
  noTextEdit: z.boolean().optional(),
});

// Custom Geometry
const PathCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("moveTo"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("lineTo"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("cubicBezTo"), cp1x: z.number(), cp1y: z.number(), cp2x: z.number(), cp2y: z.number(), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("quadBezTo"), cpx: z.number(), cpy: z.number(), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("arcTo"), wR: z.number(), hR: z.number(), stAng: z.number(), swAng: z.number() }),
  z.object({ type: z.literal("close") }),
]);

const CustomGeometryPathSchema = z.object({
  commands: z.array(PathCommandSchema).min(1).max(10000),
  width: z.number().optional(),
  height: z.number().optional(),
  fill: z.enum(["norm", "none", "lighten", "darken"]).optional(),
});

const CustomGeometrySchema = z.object({
  paths: z.array(CustomGeometryPathSchema).min(1).max(100),
});

// z.lazy() breaks the circular reference so TypeScript doesn't recurse infinitely
// at schema-definition time.
export const PaperNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("View"),
      style: FlexStyleSchema.optional(),
      children: z.array(PaperNodeSchema).max(1000).optional(),
      shapeType: ShapeTypeSchema.optional(),
      shapeAdjustments: z.array(z.number()).optional(),
      shapeAdjustmentMap: z.record(z.string(), z.number()).optional(),
      customGeometry: CustomGeometrySchema.optional(),
      placeholder: PlaceholderRefSchema.optional(),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      hyperlink: HyperlinkSchema.optional(),
      altText: z.string().optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional(),
      textContent: z.union([z.string().max(100_000), z.array(TextRunSchema).max(1000)]).optional(),
      textParagraphs: z.array(ParagraphSchema).max(500).optional(),
      textStyle: TextStyleSchema.optional(),
    }),
    z.object({
      type: z.literal("Text"),
      style: TextStyleSchema.optional(),
      content: z.union([z.string().max(100_000), z.array(TextRunSchema).max(1000)]).optional(),
      paragraphs: z.array(ParagraphSchema).max(500).optional(),
      autoFit: z.boolean().optional(),
      placeholder: PlaceholderRefSchema.optional(),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
    }),
    z.object({
      type: z.literal("Image"),
      style: FlexStyleSchema.optional(),
      src: z.string().url().or(z.string().startsWith("data:image/")),
      svgSrc: z.string().url().or(z.string().startsWith("data:image/svg+xml")).optional(),
      crop: ImageCropSchema.optional(),
      borderRadius: z.number().min(0).optional(),
      placeholder: PlaceholderRefSchema.optional(),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      altText: z.string().optional(),
      hyperlink: HyperlinkSchema.optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional(),
      imageEffects: z.object({
        brightness: z.number().optional(),
        contrast: z.number().optional(),
        grayscale: z.boolean().optional(),
        biLevel: z.number().optional(),
        duotone: z.object({ color1: ColorSchema, color2: ColorSchema }).optional(),
        blur: z.number().optional(),
      }).optional(),
    }),
    z.object({
      type: z.literal("Table"),
      style: FlexStyleSchema.optional(),
      tableData: TableDataSchema,
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      altText: z.string().optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
    }),
    z.object({
      type: z.literal("Chart"),
      style: FlexStyleSchema.optional(),
      chartData: ChartDataSchema,
      chartAnimation: z.object({
        buildType: z.enum(["bySeries", "byCategory", "byElement", "allAtOnce"]),
        trigger: z.enum(["onClick", "withPrevious", "afterPrevious"]).optional(),
        effect: z.string().optional(),
        duration: z.number().optional(),
      }).optional(),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      altText: z.string().optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
    }),
    z.object({
      type: z.literal("Group"),
      style: FlexStyleSchema.optional(),
      children: z.array(PaperNodeSchema).max(1000),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      altText: z.string().optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional(),
    }),
    z.object({
      type: z.literal("Connector"),
      style: FlexStyleSchema.optional(),
      connectorType: z.enum(CONNECTOR_TYPES),
      start: ConnectorPointSchema,
      end: ConnectorPointSchema,
      lineWidth: z.number().optional(),
      lineColor: ColorSchema.optional(),
      lineDashStyle: z.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
      arrowStart: z.union([
        z.boolean(),
        z.object({
          type: z.enum(ARROW_HEAD_TYPES),
          width: z.enum(ARROW_HEAD_SIZES).optional(),
          length: z.enum(ARROW_HEAD_SIZES).optional(),
        }),
      ]).optional(),
      arrowEnd: z.union([
        z.boolean(),
        z.object({
          type: z.enum(ARROW_HEAD_TYPES),
          width: z.enum(ARROW_HEAD_SIZES).optional(),
          length: z.enum(ARROW_HEAD_SIZES).optional(),
        }),
      ]).optional(),
      startShape: z.object({
        shapeId: z.number().int(),
        site: z.number().int().min(0).optional(),
      }).optional(),
      endShape: z.object({
        shapeId: z.number().int(),
        site: z.number().int().min(0).optional(),
      }).optional(),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      altText: z.string().optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
      locks: ShapeLocksSchema.optional(),
    }),
    z.object({
      type: z.literal("Video"),
      style: FlexStyleSchema.optional(),
      src: z.string(),
      poster: z.string().optional(),
      mimeType: z.string().optional(),
      playback: z.object({
        loop: z.boolean().optional(),
        volume: z.number().min(0).max(100).optional(),
        trimStart: z.number().min(0).optional(),
        trimEnd: z.number().min(0).optional(),
        autoPlay: z.boolean().optional(),
        hideOnClick: z.boolean().optional(),
      }).optional(),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      altText: z.string().optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
    }),
    z.object({
      type: z.literal("Audio"),
      style: FlexStyleSchema.optional(),
      src: z.string(),
      mimeType: z.string().optional(),
      playback: z.object({
        loop: z.boolean().optional(),
        volume: z.number().min(0).max(100).optional(),
        trimStart: z.number().min(0).optional(),
        trimEnd: z.number().min(0).optional(),
        autoPlay: z.boolean().optional(),
        hideOnClick: z.boolean().optional(),
      }).optional(),
      playAcrossSlides: z.boolean().optional(),
      icon: z.enum(["speaker", "none"]).optional(),
      animations: z.array(AnimationIntentSchema).max(100).optional(),
      animationGroups: z.array(AnimationGroupSchema).max(50).optional(),
      morphId: z.string().min(1).optional(),
      altText: z.string().optional(),
      decorative: z.boolean().optional(),
      readingOrder: z.number().int().min(0).optional(),
    }),
  ]),
);

const SlideCommentSchema = z.object({
  author: z.string(),
  text: z.string().default(""),
  date: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const PaperSlideSchema = z.object({
  type: z.literal("Slide"),
  agentPattern: z.enum(["title", "statement", "dashboard", "comparison", "chart-focus", "bullets"]).optional(),
  style: FlexStyleSchema.optional(),
  layoutName: z.string().optional(),
  masterName: z.string().optional(),
  transition: SlideTransitionSchema.optional(),
  background: SlideBackgroundSchema.optional(),
  notes: z.union([z.string(), z.array(ParagraphSchema).max(500)]).optional(),
  headerFooter: HeaderFooterSchema.optional(),
  comments: z.array(SlideCommentSchema).max(1000).optional(),
  children: z.array(PaperNodeSchema).max(500),
});

const SlideSizeSchema = z.object({
  // Max ~5600px keeps EMU values within 32-bit signed int range (5600 * 9525 ≈ 53M < 2^31)
  width: z.number().positive().max(5600),
  height: z.number().positive().max(5600),
});

const ThemeColorSchemeSchema = z.object({
  dk1: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  lt1: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  dk2: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  lt2: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent1: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent2: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent3: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent4: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent5: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent6: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  hlink: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folHlink: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const ThemeFontSchemeSchema = z.object({
  majorLatin: z.string().optional(),
  minorLatin: z.string().optional(),
  majorEa: z.string().optional(),
  minorEa: z.string().optional(),
});

const ThemeConfigSchema = z.object({
  name: z.string().optional(),
  colorScheme: ThemeColorSchemeSchema.optional(),
  fontScheme: ThemeFontSchemeSchema.optional(),
});

const SlideSectionSchema = z.object({
  name: z.string(),
  slideIndices: z.array(z.number().int().min(0)).max(500),
});

const SlideLayoutConfigSchema = z.object({
  name: z.string(),
  placeholders: z.array(PlaceholderRefSchema).max(50).optional(),
});

const SlideMasterConfigSchema = z.object({
  name: z.string(),
  layouts: z.array(SlideLayoutConfigSchema).min(1).max(50),
  background: SlideBackgroundSchema.optional(),
});

const FontEmbedConfigSchema = z.object({
  fontFamily: z.string(),
  src: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

const FontStrategySchema = z.enum([
  "portable",
  "system",
  "user-embedded",
  "named-with-fallback",
  "system-safe",
  "embedded",
]);

const DocumentProtectionSchema = z.object({
  modifyPassword: z.string().optional(),
  readOnly: z.boolean().optional(),
});

const CustomShowSchema = z.object({
  name: z.string(),
  slideIndices: z.array(z.number().int().min(0)).max(500),
});

export const PaperDocumentSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  type: z.literal("Document"),
  meta: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    language: z.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/).optional(),
  }),
  template: z.instanceof(Buffer).optional(),
  slideSize: SlideSizeSchema.optional(),
  notesSize: SlideSizeSchema.optional(),
  theme: ThemeConfigSchema.optional(),
  fontStrategy: FontStrategySchema.optional(),
  sections: z.array(SlideSectionSchema).max(100).optional(),
  masters: z.array(SlideMasterConfigSchema).max(20).optional(),
  embeddedFonts: z.array(FontEmbedConfigSchema).max(50).optional(),
  protection: DocumentProtectionSchema.optional(),
  customShows: z.array(CustomShowSchema).max(100).optional(),
  customProperties: z.array(z.object({
    name: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.date()]),
  })).max(100).optional(),
  handoutLayout: z.enum(["1", "2", "3", "4", "6", "9"]).optional(),
  printSettings: z.object({
    colorMode: z.enum(["clr", "gray", "bw"]).optional(),
    frameSlides: z.boolean().optional(),
    scaleToFitPaper: z.boolean().optional(),
  }).optional(),
  chartFallbackImages: z.boolean().optional(),

  slides: z.array(PaperSlideSchema).min(1).max(200),
});
