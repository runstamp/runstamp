// types/ast.ts — Core PaperAST schema (the "God Contract")

import {
  ACTION_BUTTON_SHAPES,
  ARROW_CALLOUT_SHAPES,
  ARROW_HEAD_SIZES,
  ARROW_HEAD_TYPES,
  ARROW_SHAPES,
  BASIC_SHAPES,
  BRACKET_BRACE_SHAPES,
  CALLOUT_SHAPES,
  CHART_TYPES,
  CONNECTOR_SHAPES,
  CONNECTOR_TYPES,
  FLOWCHART_SHAPES,
  MATH_SHAPES,
  PATTERN_TYPES,
  PLACEHOLDER_TYPES,
  STAR_SHAPES,
  TAB_SHAPES,
} from "./literals.js";

export type Dimension = number | `${number}%`;

// ---------------------------------------------------------------------------
// Shape Geometry
// ---------------------------------------------------------------------------

// Sub-unions for ShapeType, grouped by ECMA-376 §20.1.10.56 categories.
// Use ShapeType for the full union, or sub-unions for narrower type constraints.

export type BasicShape = (typeof BASIC_SHAPES)[number];

export type ArrowShape = (typeof ARROW_SHAPES)[number];

export type ArrowCalloutShape = (typeof ARROW_CALLOUT_SHAPES)[number];

export type FlowchartShape = (typeof FLOWCHART_SHAPES)[number];

export type ActionButtonShape = (typeof ACTION_BUTTON_SHAPES)[number];

export type CalloutShape = (typeof CALLOUT_SHAPES)[number];

export type MathShape = (typeof MATH_SHAPES)[number];

export type StarShape = (typeof STAR_SHAPES)[number];

export type BracketBraceShape = (typeof BRACKET_BRACE_SHAPES)[number];

export type TabShape = (typeof TAB_SHAPES)[number];

export type ConnectorShape = (typeof CONNECTOR_SHAPES)[number];

/** Full ECMA-376 §20.1.10.56 shape type union. */
export type ShapeType =
  | BasicShape | ArrowShape | ArrowCalloutShape | FlowchartShape
  | ActionButtonShape | CalloutShape | MathShape | StarShape
  | BracketBraceShape | TabShape | ConnectorShape;

// ---------------------------------------------------------------------------
// Placeholders
// ---------------------------------------------------------------------------

/** OOXML placeholder types per ECMA-376 §19.7.9 (ST_PlaceholderType). */
export type PlaceholderType =
  (typeof PLACEHOLDER_TYPES)[number];

export interface PlaceholderRef {
  type?: PlaceholderType;
  idx?: number;   // placeholder index from layout XML
}

// ---------------------------------------------------------------------------
// Theme Color Modifiers
// ---------------------------------------------------------------------------

export interface ColorModifier {
  scheme: string;   // "accent1", "dk1", "bg1", "tx1", etc.
  tint?: number;    // 0-100 (percentage, converted to OOXML 0-100000)
  shade?: number;   // 0-100 (percentage, converted to OOXML 0-100000)
  // Phase 5: Extended color modifiers
  lumMod?: number;  // 0-100+ (luminance modulation, percentage * 1000 for OOXML)
  lumOff?: number;  // 0-100 (luminance offset)
  satMod?: number;  // 0-200+ (saturation modulation)
  satOff?: number;  // saturation offset
  hueMod?: number;  // hue modulation
  hueOff?: number;  // hue offset (degrees * 60000)
  comp?: boolean;   // complement color
  inv?: boolean;    // inverse color
  gray?: boolean;   // grayscale
}

export type ColorValue = string | ColorModifier;

// ---------------------------------------------------------------------------
// Fills
// ---------------------------------------------------------------------------

export interface GradientStop {
  color: ColorValue;    // hex, theme token, or color modifier
  position: number; // 0-100
  alpha?: number;   // 0-1, opacity for this stop
}

export interface GradientFill {
  type: "linear" | "gradient" | "radial";
  angle?: number;   // 0-360 degrees (for linear / gradient alias)
  stops: GradientStop[];
}

export interface SolidFill {
  type: "solid";
  color: ColorValue;    // hex, theme token, or color modifier
}

export type PatternType = (typeof PATTERN_TYPES)[number];

export interface PatternFill {
  type: "pattern";
  pattern: PatternType;
  foreground: ColorValue;
  background: ColorValue;
}

export interface ImageFill {
  type: "image";
  src: string;  // Base64 data URL or HTTPS URL
  tile?: boolean;
  stretch?: boolean;
}

export type Fill = SolidFill | GradientFill | PatternFill | ImageFill;

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export interface DropShadow {
  color: ColorValue;    // hex, theme token, or color modifier
  offsetX: number;  // pixels
  offsetY: number;  // pixels
  blurRadius: number; // pixels
  opacity?: number; // 0-1, defaults to 1
}

export interface Glow {
  color: ColorValue;    // hex, theme token, or color modifier
  radius: number;   // pixels
  opacity?: number; // 0-1, defaults to 1
}

export interface Reflection {
  blurRadius?: number;    // pixels
  startOpacity?: number;  // 0-1
  endOpacity?: number;    // 0-1
  distance?: number;      // pixels
  direction?: number;     // degrees
  size?: number;          // percentage 0-100
}

export interface SoftEdge {
  radius: number;  // pixels
}

export interface InnerShadow {
  color: ColorValue;
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  opacity?: number; // 0-1
}

// ---------------------------------------------------------------------------
// 3D Effects
// ---------------------------------------------------------------------------

export type CameraPreset =
  | "orthographicFront" | "isometricTopUp" | "isometricTopDown"
  | "isometricBottomUp" | "isometricBottomDown" | "isometricLeftUp"
  | "isometricLeftDown" | "isometricRightUp" | "isometricRightDown"
  | "isometricOffAxis1Left" | "isometricOffAxis1Right" | "isometricOffAxis1Top"
  | "isometricOffAxis2Left" | "isometricOffAxis2Right" | "isometricOffAxis2Top"
  | "isometricOffAxis3Left" | "isometricOffAxis3Bottom" | "isometricOffAxis4Left"
  | "isometricOffAxis4Bottom" | "obliqueTopLeft" | "obliqueTop" | "obliqueTopRight"
  | "obliqueLeft" | "obliqueRight" | "obliqueBottomLeft" | "obliqueBottom"
  | "obliqueBottomRight" | "perspectiveFront" | "perspectiveLeft" | "perspectiveRight"
  | "perspectiveAbove" | "perspectiveBelow" | "perspectiveAboveLeftFacing"
  | "perspectiveAboveRightFacing" | "perspectiveContrastingLeftFacing"
  | "perspectiveContrastingRightFacing" | "perspectiveHeroicLeftFacing"
  | "perspectiveHeroicRightFacing" | "perspectiveHeroicExtremeLeftFacing"
  | "perspectiveHeroicExtremeRightFacing" | "perspectiveRelaxed"
  | "perspectiveRelaxedModerately";

export type LightRigType =
  | "balanced" | "brightRoom" | "chilly" | "contrasting" | "flat"
  | "flood" | "freezing" | "glow" | "harsh" | "legacyFlat1" | "legacyFlat2"
  | "legacyFlat3" | "legacyFlat4" | "legacyHarsh1" | "legacyHarsh2"
  | "legacyHarsh3" | "legacyHarsh4" | "legacyNormal1" | "legacyNormal2"
  | "legacyNormal3" | "legacyNormal4" | "morning" | "soft" | "sunrise"
  | "sunset" | "threePt" | "twoPt";

export type LightRigDirection = "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br";

export type BevelPreset =
  | "angle" | "artDeco" | "circle" | "convex" | "coolSlant" | "cross"
  | "divot" | "hardEdge" | "relaxedInset" | "riblet" | "slope"
  | "softRound";

export type MaterialPreset =
  | "clear" | "dkEdge" | "flat" | "legacyMatte" | "legacyMetal"
  | "legacyPlastic" | "legacyWireframe" | "matte" | "metal"
  | "plastic" | "powder" | "softEdge" | "softmetal" | "translucentPowder"
  | "warmMatte";

export interface Scene3D {
  camera: {
    preset: CameraPreset;
    fov?: number;       // field of view in degrees
  };
  lightRig: {
    type: LightRigType;
    direction: LightRigDirection;
  };
}

export interface BevelConfig {
  width?: number;     // pixels
  height?: number;    // pixels
  preset: BevelPreset;
}

export interface Sp3D {
  material?: MaterialPreset;
  bevelTop?: BevelConfig;
  bevelBottom?: BevelConfig;
  extrudeHeight?: number;    // pixels
  extrudeColor?: ColorValue;
  contourWidth?: number;     // pixels
  contourColor?: ColorValue;
}

// ---------------------------------------------------------------------------
// Image Effects
// ---------------------------------------------------------------------------

export interface ImageEffects {
  brightness?: number;   // -100 to 100 (percentage)
  contrast?: number;     // -100 to 100 (percentage)
  grayscale?: boolean;
  biLevel?: number;      // threshold 0-100000
  duotone?: { color1: ColorValue; color2: ColorValue };
  blur?: number;         // blur radius in pixels
}

export interface Effects {
  dropShadow?: DropShadow;
  innerShadow?: InnerShadow;
  glow?: Glow;
  reflection?: Reflection;
  softEdge?: SoftEdge;
  // Phase 5: 3D Effects
  scene3d?: Scene3D;
  sp3d?: Sp3D;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export interface FlexStyle {
  flexDirection?: "row" | "column";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch";
  width?: Dimension;
  height?: Dimension;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  position?: "relative" | "absolute";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  backgroundColor?: ColorValue; // hex (#FFFFFF), theme token (accent1, dk1, etc.), or color modifier

  // Phase 1: Flex API
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Dimension;
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  minWidth?: Dimension;
  maxWidth?: Dimension;
  minHeight?: Dimension;
  maxHeight?: Dimension;
  alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch";
  aspectRatio?: number;
  display?: "flex" | "none";

  // Phase 2: Visual Properties
  fill?: Fill;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: ColorValue;
  borderStyle?: "solid" | "dashed" | "dotted" | "dotDash";
  borderCap?: "flat" | "round" | "square";
  borderCompound?: "single" | "double" | "thickThin" | "thinThick" | "triple";
  effects?: Effects;

  // Phase 3: Transform Properties
  rotation?: number;   // degrees (0-360), converted to 60000ths for OOXML
  opacity?: number;    // 0-1, applied to fill as alpha modifier
  flipH?: boolean;
  flipV?: boolean;
}

export interface TextInsets {
  left?: number;    // pixels
  top?: number;     // pixels
  right?: number;   // pixels
  bottom?: number;  // pixels
}

export type TextFitPolicy = "strict" | "fitHeight" | "fitFontSize" | "truncate" | "overflow";

export interface TextFitConfig {
  policy: TextFitPolicy;
  minFontSize?: number;
  maxLines?: number;
  marker?: string;
}

export type TextWarpPreset =
  | "textNoShape" | "textPlain" | "textStop" | "textTriangle"
  | "textTriangleInverted" | "textChevron" | "textChevronInverted"
  | "textRingInside" | "textRingOutside" | "textArchUp" | "textArchDown"
  | "textCircle" | "textButton" | "textArchUpPour" | "textArchDownPour"
  | "textCirclePour" | "textButtonPour" | "textCurveUp" | "textCurveDown"
  | "textCanUp" | "textCanDown" | "textWave1" | "textWave2"
  | "textDoubleWave1" | "textWave4" | "textInflate" | "textDeflate"
  | "textInflateBottom" | "textDeflateBottom" | "textInflateTop"
  | "textDeflateTop" | "textDeflateInflate" | "textDeflateInflateDeflate"
  | "textFadeRight" | "textFadeLeft" | "textFadeUp" | "textFadeDown"
  | "textSlantUp" | "textSlantDown" | "textCascadeUp" | "textCascadeDown";

export interface TextStyle extends FlexStyle {
  color?: ColorValue; // hex, theme token, or color modifier
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right" | "justify";
  /**
   * Line height as a multiple of font size (e.g. 1.4 for 1.4× spacing).
   * Values < 4 are treated as multipliers. Values ≥ 4 are treated as legacy
   * pixel/point absolutes and emit a deprecation warning at render time.
   */
  lineHeight?: number;
  fontFallback?: string[];
  textDecorationLine?: "none" | "underline" | "strikethrough" | "underline-strikethrough";
  textDecorationStyle?: "solid" | "double" | "dotted" | "dashed";

  // Text body properties
  verticalAlign?: "top" | "middle" | "bottom";
  textInsets?: TextInsets;
  textDirection?: "horizontal" | "vertical" | "verticalEA";
  rtl?: boolean;
  columns?: number;         // 1-16, text columns
  columnSpacing?: number;   // pixels, spacing between columns
  lang?: string;            // BCP 47 language tag default for all runs
  textWarp?: TextWarpPreset;  // Phase 5: WordArt text warp preset
  textFit?: TextFitConfig;
  /** @internal Concrete font decision made before layout. */
  resolvedFont?: import("../typography/fontRegistry.js").ResolvedFontIdentity;
}

// ---------------------------------------------------------------------------
// Rich Text Runs
// ---------------------------------------------------------------------------

export interface TextRunStyle {
  color?: ColorValue;       // hex, theme token, or color modifier
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecorationLine?: "none" | "underline" | "strikethrough" | "underline-strikethrough";
  textDecorationStyle?: "solid" | "double" | "dotted" | "dashed";
  baseline?: "superscript" | "subscript";
  letterSpacing?: number;   // pixels, converted to EMU * 100
  shadow?: DropShadow;
  outline?: { width: number; color: ColorValue };
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
  gradientFill?: GradientFill;
  lang?: string;            // BCP 47 language tag (e.g. "ja-JP", "fr-FR")
  altLang?: string;         // alternate language tag
  // Phase 5: Enterprise text features
  highlight?: ColorValue;   // text highlight/shading color
  kerning?: number;         // kerning threshold in points (e.g. 12 → kern="1200")
  /** @internal Concrete font decision made before shaping and serialization. */
  resolvedFont?: import("../typography/fontRegistry.js").ResolvedFontIdentity;
}

/**
 * Hyperlink target. Specify exactly one of: url, mailto, slide, action.
 * If multiple are set, resolution priority is: action > slide > mailto > url.
 */
export interface HyperlinkTarget {
  url?: string;           // External URL (https://, http://)
  mailto?: string;        // Email: "user@example.com" (optional subject/body)
  slide?: number;         // Internal: 1-based slide index
  action?: "firstSlide" | "lastSlide" | "nextSlide" | "previousSlide" | "endShow";
  tooltip?: string;       // screenTip attribute
}

export interface TextRun {
  text: string;
  style?: TextRunStyle;
  hyperlink?: string | HyperlinkTarget;   // URL for <a:hlinkClick> or rich hyperlink target
}

// ---------------------------------------------------------------------------
// Bullet / Numbering
// ---------------------------------------------------------------------------

export interface BulletChar {
  type?: "char";
  char: string;         // e.g. "•", "–", "▸"
  color?: ColorValue;
  size?: number;        // percentage of font size (e.g. 100 = same size)
  fontFamily?: string;  // font for the bullet character
}

export interface BulletAutoNum {
  type: "autoNum";
  scheme: AutoNumScheme;
  startAt?: number;     // starting number (default 1)
}

export type AutoNumScheme =
  | "arabicPeriod"   // 1. 2. 3.
  | "arabicParenR"   // 1) 2) 3)
  | "romanUcPeriod"  // I. II. III.
  | "romanLcPeriod"  // i. ii. iii.
  | "alphaUcPeriod"  // A. B. C.
  | "alphaLcPeriod"  // a. b. c.
  | "alphaLcParenR"  // a) b) c)
  | "alphaUcParenR"; // A) B) C)

export interface BulletNone {
  type: "none";
}

export type BulletConfig = BulletChar | BulletAutoNum | BulletNone;

// ---------------------------------------------------------------------------
// Tab Stops
// ---------------------------------------------------------------------------

export type TabAlignType = "l" | "ctr" | "r" | "dec";

export interface TabStop {
  position: number;  // pixels
  align?: TabAlignType;
}

// ---------------------------------------------------------------------------
// Paragraphs
// ---------------------------------------------------------------------------

export interface Paragraph {
  runs: TextRun[];
  align?: "left" | "center" | "right" | "justify";
  /**
   * Line spacing. Values < 4 are treated as multipliers (CSS-style: 1.4 → 140%).
   * Values ≥ 4 are treated as legacy points (deprecated; emits a warning).
   * Set lineSpacingMode="percentage" to opt into explicit percentage values.
   */
  lineHeight?: number;
  lineSpacingMode?: "points" | "percentage";  // Phase 5: "points" (default) or "percentage"
  spaceBefore?: number;       // space before paragraph in points
  spaceAfter?: number;        // space after paragraph in points
  spaceBeforePercent?: number;  // Phase 5: space before as percentage of font size
  spaceAfterPercent?: number;   // Phase 5: space after as percentage of font size
  level?: number;             // indentation level (0-8)
  indent?: number;            // first-line indent in pixels
  marginLeft?: number;        // left margin in pixels
  bullet?: BulletConfig;
  rtl?: boolean;              // right-to-left paragraph direction
  tabStops?: TabStop[];       // custom tab stop positions
  hangingIndent?: number;     // hanging indent in pixels (negative indent)
}

// ---------------------------------------------------------------------------
// Shape Locks
// ---------------------------------------------------------------------------

export interface ShapeLocks {
  noGrp?: boolean;
  noSelect?: boolean;
  noRot?: boolean;
  noChangeAspect?: boolean;
  noMove?: boolean;
  noResize?: boolean;
  noEditPoints?: boolean;
  noAdjustHandles?: boolean;
  noChangeArrowheads?: boolean;
  noChangeShapeType?: boolean;
  noTextEdit?: boolean;
}

// ---------------------------------------------------------------------------
// Custom Geometry
// ---------------------------------------------------------------------------

export type PathCommand =
  | { type: "moveTo"; x: number; y: number }
  | { type: "lineTo"; x: number; y: number }
  | { type: "cubicBezTo"; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { type: "quadBezTo"; cpx: number; cpy: number; x: number; y: number }
  | { type: "arcTo"; wR: number; hR: number; stAng: number; swAng: number }
  | { type: "close" };

export interface CustomGeometryPath {
  commands: PathCommand[];
  width?: number;   // coordinate space (default 1000000)
  height?: number;
  fill?: "norm" | "none" | "lighten" | "darken";
}

export interface CustomGeometry {
  paths: CustomGeometryPath[];
}

export interface PaperView {
  type: "View";
  style?: FlexStyle;
  children?: PaperNode[];
  shapeType?: ShapeType;
  shapeAdjustments?: number[];
  shapeAdjustmentMap?: Record<string, number>;
  customGeometry?: CustomGeometry;
  placeholder?: PlaceholderRef;
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  hyperlink?: string | HyperlinkTarget;
  altText?: string;
  decorative?: boolean;
  readingOrder?: number;
  locks?: ShapeLocks;
  // Shape text: text body inside View shapes
  textContent?: string | TextRun[];
  textParagraphs?: Paragraph[];
  textStyle?: TextStyle;
}

export interface PaperText {
  type: "Text";
  style?: TextStyle;
  content?: string | TextRun[];
  paragraphs?: Paragraph[];       // Multi-paragraph mode (takes precedence over content)
  autoFit?: boolean;
  placeholder?: PlaceholderRef;
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  decorative?: boolean;
  readingOrder?: number;
}

export interface ImageCrop {
  left?: number;    // percentage 0-100
  top?: number;     // percentage 0-100
  right?: number;   // percentage 0-100
  bottom?: number;  // percentage 0-100
}

export interface PaperImage {
  type: "Image";
  style?: FlexStyle;
  src: string; // Base64 or https URL (PNG fallback when svgSrc is present)
  svgSrc?: string; // Base64 data URL or https URL of raw SVG for native embedding
  crop?: ImageCrop;
  borderRadius?: number; // pixels, uses roundRect geometry
  placeholder?: PlaceholderRef;
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  altText?: string;
  hyperlink?: string | HyperlinkTarget;
  decorative?: boolean;
  readingOrder?: number;
  locks?: ShapeLocks;
  imageEffects?: ImageEffects;
}

export interface TableCellBorder {
  width?: number;     // pixels
  color?: ColorValue;
}

export interface TableCellBorders {
  top?: TableCellBorder;
  right?: TableCellBorder;
  bottom?: TableCellBorder;
  left?: TableCellBorder;
  // Phase 5: Diagonal borders
  diagonalDown?: TableCellBorder;  // top-left to bottom-right → <a:lnTlToBr>
  diagonalUp?: TableCellBorder;    // bottom-left to top-right → <a:lnBlToTr>
}

export interface TableCellStyle {
  fill?: ColorValue | GradientFill;
  borders?: TableCellBorders;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  fontSize?: number;
  fontFamily?: string;
  fontFallback?: string[];
  color?: ColorValue;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  padding?: number;   // uniform padding in pixels
  textDirection?: "horizontal" | "vertical" | "verticalEA";
  rtl?: boolean;
  lang?: string;
}

export interface TableCell {
  text: string;
  style?: TableCellStyle;
  colSpan?: number;   // maps to gridSpan in OOXML
  rowSpan?: number;   // maps to rowSpan in OOXML
  vMerge?: boolean;   // ghost cell for vertical merge continuation
  hMerge?: boolean;   // ghost cell for horizontal merge continuation
  content?: TextRun[];        // rich text runs (takes precedence over text)
  paragraphs?: Paragraph[];   // multi-paragraph rich text (takes precedence over content)
}

export interface TableRow {
  height?: number;    // row height in pixels
  minHeight?: number; // minimum row height in pixels
  cells: TableCell[];
}

export interface TableStyle {
  bandRow?: boolean;
  bandCol?: boolean;
  firstRow?: boolean;
  lastRow?: boolean;
  firstCol?: boolean;
  lastCol?: boolean;
  headerRowStyle?: TableCellStyle;
  footerRowStyle?: TableCellStyle;
  firstColStyle?: TableCellStyle;
  lastColStyle?: TableCellStyle;
  bandRowEvenStyle?: TableCellStyle;
  bandRowOddStyle?: TableCellStyle;
  outerBorder?: TableCellBorder;
  innerBorderH?: TableCellBorder;
  innerBorderV?: TableCellBorder;
}

export interface TableRowLayoutPolicy {
  /** Natural leaves short rows compact; fill distributes extra height. Default: fill. */
  mode?: "natural" | "fill";
  /** Table-wide minimum row height in pixels. Row-level minHeight still wins. */
  minRowHeight?: number;
  /** Allow overfull tables without a layout warning. Default: warn. */
  overflow?: "warn" | "allow";
}

export interface TableData {
  columns: number[];  // pixel widths per column
  rows: TableRow[];
  style?: TableStyle;
  autoFit?: boolean | "distribute";  // auto-size column widths
  rowLayout?: TableRowLayoutPolicy;
}

export interface PaperTable {
  type: "Table";
  style?: FlexStyle;
  tableData: TableData;
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  altText?: string;
  decorative?: boolean;
  readingOrder?: number;
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

export type ChartType = (typeof CHART_TYPES)[number];

// ---------------------------------------------------------------------------
// Modern Chart Types (ChartEx — cx:chart namespace)
// ---------------------------------------------------------------------------

export interface TreemapCategory {
  name: string;
  value?: number;  // optional for branch nodes (value derived from children)
  children?: TreemapCategory[];
  color?: string;
}

export interface TreemapData {
  categories: TreemapCategory[];
  dataLabels?: ChartDataLabels;
}

export interface SunburstData {
  categories: TreemapCategory[];  // Same hierarchical structure as treemap
  dataLabels?: ChartDataLabels;
}

export interface HistogramData {
  values: number[];
  binCount?: number;       // auto if not specified
  binWidth?: number;        // manual bin width
  overflow?: number;        // overflow bin boundary
  underflow?: number;       // underflow bin boundary
  seriesName?: string;
  color?: string;
  dataLabels?: ChartDataLabels;
}

export interface BoxWhiskerData {
  categories: string[];
  series: Array<{
    name: string;
    values: number[];
    color?: string;
  }>;
  quartileMethod?: "inclusive" | "exclusive";
  showOutliers?: boolean;
  showMeanMarker?: boolean;
  showMeanLine?: boolean;
  showInnerPoints?: boolean;
  showConnectorLines?: boolean;
  dataLabels?: ChartDataLabels;
}
export type BarGrouping = "clustered" | "stacked" | "percentStacked";
export type LineGrouping = "standard" | "stacked" | "percentStacked";
export type AreaGrouping = "standard" | "stacked" | "percentStacked";

export interface XYDataPoint {
  x: number;
  y: number;
  size?: number;  // bubble only
}

export interface XYSeries {
  name: string;
  dataPoints: XYDataPoint[];
  color?: string;
}

export type MarkerSymbol = "circle" | "square" | "diamond" | "triangle" | "x" | "star" | "plus" | "dot" | "dash" | "none";

export interface MarkerConfig {
  symbol: MarkerSymbol;
  size?: number;        // 2-72, default 5
  color?: string;       // hex color
}

export interface TrendlineConfig {
  type: "linear" | "exponential" | "logarithmic" | "polynomial" | "power" | "movingAvg";
  order?: number;       // polynomial order (2-6)
  period?: number;      // moving average period
  forward?: number;     // forecast forward periods
  backward?: number;    // forecast backward periods
  displayEquation?: boolean;
  displayRSquared?: boolean;
  color?: string;       // hex color
}

export interface ErrorBarsConfig {
  direction: "x" | "y" | "both";
  type: "fixedVal" | "percentage" | "stdDev" | "stdErr";
  value?: number;       // fixed value or percentage
}

export interface ChartSeries {
  name: string;
  values: number[];
  color?: string;  // hex override; defaults to theme accent cycle
  overrideType?: "bar" | "line" | "area";  // combo: render this series differently
  targetAxis?: "primary" | "secondary";     // combo: dual axis binding
  pointColors?: string[];  // per-data-point hex colors
  marker?: MarkerConfig;   // per-series marker override
  trendline?: TrendlineConfig;
  errorBars?: ErrorBarsConfig;
  dataLabels?: ChartDataLabels;
}

export interface ChartGridlines {
  major?: boolean;
  minor?: boolean;
  color?: string;       // hex color for gridlines
}

export interface ChartAxisConfig {
  title?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  min?: number;
  max?: number;
  visible?: boolean;
  numberFormat?: string;         // e.g. "$#,##0", "0%"
  gridlines?: ChartGridlines;
  tickMark?: { major?: "cross"|"in"|"out"|"none"; minor?: "cross"|"in"|"out"|"none" };
  labelRotation?: number;  // degrees
  labelFont?: { fontFamily?: string; fontSize?: number; fontColor?: string; bold?: boolean; italic?: boolean };
  crossesAt?: number;
}

export interface ChartDataLabels {
  showVal?: boolean;
  showCatName?: boolean;
  showSerName?: boolean;
  showPercent?: boolean;
  formatCode?: string;
  position?: "outEnd" | "inEnd" | "ctr" | "inBase" | "bestFit";
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
}

export interface ChartAreaStyle {
  fill?: string;         // hex
  borderColor?: string;  // hex
  borderWidth?: number;  // pixels
}

export interface WaterfallData {
  categories: string[];
  values: number[];
  totalIndices?: number[];  // indices that are running totals (not deltas)
  increaseColor?: string;
  decreaseColor?: string;
  totalColor?: string;
  connectorLines?: boolean;
}

export interface StockData {
  categories: string[];       // date labels
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  hiLowLines?: boolean;       // show high-low lines (default true)
  upDownBars?: boolean;        // show up-down bars (default true)
  upColor?: string;            // hex color for up bars
  downColor?: string;          // hex color for down bars
}

export interface FunnelData {
  categories: string[];
  values: number[];
  colors?: string[];           // per-segment hex colors
}

export interface ChartDataTable {
  showKeys?: boolean;         // show legend keys in table
  showHorzBorder?: boolean;
  showVertBorder?: boolean;
  showOutline?: boolean;
  fontFamily?: string;
  fontSize?: number;
}

export interface ChartData {
  chartType: ChartType;
  dataLabels?: ChartDataLabels;
  barGrouping?: BarGrouping;
  lineGrouping?: LineGrouping;
  areaGrouping?: AreaGrouping;
  barDirection?: "col" | "bar";           // col=vertical (default), bar=horizontal
  smooth?: boolean;                       // smooth/spline lines
  marker?: MarkerConfig;                  // chart-level default marker
  explosion?: number;                     // pie/doughnut explosion 0-400
  categories?: string[];
  series?: ChartSeries[];
  xySeries?: XYSeries[];                 // scatter/bubble (used instead of categories/series)
  holeSize?: number;                     // 10-90 for doughnut
  title?: { text?: string; fontFamily?: string; fontSize?: number; fontColor?: string; bold?: boolean };
  categoryAxis?: ChartAxisConfig;
  valueAxis?: ChartAxisConfig;
  secondaryValueAxis?: ChartAxisConfig;  // dual-axis combo charts
  secondaryCategoryAxis?: ChartAxisConfig;  // dual-axis combo charts (secondary cat axis)
  legend?: { position?: "bottom" | "top" | "left" | "right" | "none"; fontFamily?: string; fontSize?: number; fontColor?: string; border?: { color?: string; width?: number }; fill?: string };
  // Phase 3: Bar chart spacing
  gapWidth?: number;   // 0-500, gap between bars
  overlap?: number;    // -100 to 100, overlap between bars
  // Phase 3: Pie/doughnut first slice angle
  firstSliceAng?: number;  // 0-360
  // Phase 3: Plot area & chart area styling
  plotArea?: ChartAreaStyle;
  chartArea?: ChartAreaStyle;
  // Phase 3: Display blanks as
  dispBlanksAs?: "gap"|"zero"|"span";
  // Phase 3: Radar chart
  radarStyle?: "radar"|"filled";
  // Phase 3: Waterfall chart
  waterfallData?: WaterfallData;
  // Phase 4: Stock chart
  stockData?: StockData;
  // Phase 4: Funnel chart
  funnelData?: FunnelData;
  // Phase 4: Data table below chart
  dataTable?: ChartDataTable;
  // Modern chart types (ChartEx — cx:chart namespace)
  treemapData?: TreemapData;
  sunburstData?: SunburstData;
  histogramData?: HistogramData;
  boxWhiskerData?: BoxWhiskerData;
  // Chart annotations (overlaid text/shape labels on chart area)
  annotations?: ChartAnnotation[];
}

/**
 * Anchor for a category-bound chart annotation. `categoryIndex` may be
 * fractional (e.g. 0.5 = midpoint between cat 0 and cat 1). `seriesIndex`
 * defaults to 0. `anchor` selects which y-coord on the bar/point to use:
 *   - "barTop"  → top of the bar at (categoryIndex, seriesIndex)
 *   - "barBottom" → axis baseline (value-axis min, or 0)
 *   - "value" → uses the explicit `value` field instead of the data point
 */
export interface ChartCategoryAnchor {
  categoryIndex: number;
  seriesIndex?: number;
  anchor?: "barTop" | "barBottom" | "value";
  value?: number;
}

/**
 * Free-floating text annotation (legacy form). Positioned in chart-area
 * percentages 0..100. Emitted via OOXML user shapes (cdr:userShapes).
 */
export interface ChartTextAnnotation {
  kind?: "text";
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  shapeType?: "rect" | "roundRect" | "ellipse" | "wedgeRectCallout";
}

/**
 * Trend arrow that anchors to category positions. The engine resolves
 * `from`/`to` to plot-area pixel coords during chart rendering, so the
 * arrow stays glued to the bars across resizes.
 */
export interface ChartTrendArrowAnnotation {
  kind: "trendArrow";
  from: ChartCategoryAnchor;
  to: ChartCategoryAnchor;
  label?: string;
  /** Hex color for line + arrow head (and label, unless `labelColor` set). */
  color?: string;
  /** Line width in pixels. Default 1.5. */
  width?: number;
  /** Optional dash pattern. Default solid. */
  dashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
  labelFontFamily?: string;
  labelFontSize?: number;
  labelColor?: string;
}

/**
 * Horizontal value line at a fixed value-axis coord. Spans the plot area
 * width. Engine resolves `value` to a plot-area pixel y-coord.
 */
export interface ChartTargetLineAnnotation {
  kind: "targetLine";
  value: number;
  label?: string;
  color?: string;
  width?: number;
  dashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
  labelFontFamily?: string;
  labelFontSize?: number;
  labelColor?: string;
}

export type ChartAnnotation =
  | ChartTextAnnotation
  | ChartTrendArrowAnnotation
  | ChartTargetLineAnnotation;

export interface ChartAnimation {
  buildType: "bySeries" | "byCategory" | "byElement" | "allAtOnce";
  trigger?: AnimationTrigger;
  effect?: AnimationEffect;
  duration?: number;
}

export interface PaperChart {
  type: "Chart";
  style?: FlexStyle;
  chartData: ChartData;
  chartAnimation?: ChartAnimation;
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  altText?: string;
  decorative?: boolean;
  readingOrder?: number;
}

// ---------------------------------------------------------------------------
// Group Shapes
// ---------------------------------------------------------------------------

export interface PaperGroup {
  type: "Group";
  style?: FlexStyle;
  children: PaperNode[];
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  altText?: string;
  decorative?: boolean;
  readingOrder?: number;
  locks?: ShapeLocks;
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export interface ConnectorPoint {
  x: number;  // pixels
  y: number;  // pixels
}

export type ArrowHeadType = (typeof ARROW_HEAD_TYPES)[number];
export type ArrowHeadSize = (typeof ARROW_HEAD_SIZES)[number];

export interface ArrowHeadConfig {
  type: ArrowHeadType;
  width?: ArrowHeadSize;
  length?: ArrowHeadSize;
}

export interface ConnectorShapeRef {
  shapeId: number;     // cNvPr id of the target shape
  site: number;        // connection site index (0=top, 1=right, 2=bottom, 3=left for rect)
}

export interface PaperConnector {
  type: "Connector";
  style?: FlexStyle;  // FlexStyle for LayoutNode compatibility (position/size)
  connectorType: ConnectorType;
  start: ConnectorPoint;
  end: ConnectorPoint;
  lineWidth?: number;       // line width in pixels
  lineColor?: ColorValue;
  lineDashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
  arrowStart?: boolean | ArrowHeadConfig;
  arrowEnd?: boolean | ArrowHeadConfig;
  startShape?: ConnectorShapeRef;   // snap start to shape connection point
  endShape?: ConnectorShapeRef;     // snap end to shape connection point
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  altText?: string;
  decorative?: boolean;
  readingOrder?: number;
  locks?: ShapeLocks;
}

// ---------------------------------------------------------------------------
// Video/Audio
// ---------------------------------------------------------------------------

export interface MediaPlaybackOptions {
  loop?: boolean;
  volume?: number;      // 0-100
  trimStart?: number;   // ms
  trimEnd?: number;     // ms
  autoPlay?: boolean;
  hideOnClick?: boolean;
}

export interface PaperVideo {
  type: "Video";
  style?: FlexStyle;
  src: string;          // URL or data: URI of video
  poster?: string;      // poster frame image (URL or data: URI)
  mimeType?: string;    // e.g. "video/mp4"
  playback?: MediaPlaybackOptions;
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  altText?: string;
  decorative?: boolean;
  readingOrder?: number;
}

export interface PaperAudio {
  type: "Audio";
  style?: FlexStyle;
  src: string;          // URL or data: URI of audio
  mimeType?: string;    // e.g. "audio/mp3"
  playback?: MediaPlaybackOptions;
  playAcrossSlides?: boolean;  // continue audio across slide transitions
  icon?: "speaker" | "none";  // visual indicator, default: 'speaker'
  animations?: AnimationIntent[];
  animationGroups?: AnimationGroup[];
  morphId?: string;
  altText?: string;
  decorative?: boolean;
  readingOrder?: number;
}

// ---------------------------------------------------------------------------
// Header/Footer
// ---------------------------------------------------------------------------

export interface HeaderFooter {
  slideNumber?: boolean;
  footer?: string;
  dateTime?: boolean;
}

// ---------------------------------------------------------------------------
// Slide Transitions
// ---------------------------------------------------------------------------

export type TransitionType = "fade" | "push" | "wipe" | "cover" | "zoom" | "morph" | "split" | "blinds" | "checker" | "dissolve" | "comb";
export type TransitionDirection = "up" | "down" | "left" | "right";

export interface SlideTransition {
  type: TransitionType;
  duration?: number;          // ms, default 500
  direction?: TransitionDirection;
  advanceOnClick?: boolean;   // default true
  advanceAfterTime?: number;  // ms, auto-advance
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

export type AnimationType = "entrance" | "exit" | "emphasis";
export type AnimationEffect =
  | "fade" | "fly" | "zoom" | "spin" | "appear"
  | "bounce" | "float" | "grow" | "shrink" | "growShrink" | "pulse"
  | "teeter" | "wipe" | "split" | "dissolve" | "swivel"
  | "motionPath"
  | "colorReveal" | "colorChange" | "boldFlash" | "wave" | "flip";
export type AnimationTrigger = "onClick" | "withPrevious" | "afterPrevious";
export type AnimationDirection = "up" | "down" | "left" | "right";
export type AnimationEasing = "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce";
export type MotionPathType = "line" | "arc" | "custom";
export type AnimationBuildGrouping = "byParagraph" | "byFirstLevel" | "allAtOnce";

export interface MotionPath {
  path: string;                      // SVG-like path: "M 0 0 L 0.5 0.5"
  pathType?: MotionPathType;
  origin?: "layout" | "parent";
}

export interface AnimationBuild {
  nested?: boolean;
  grouping?: AnimationBuildGrouping;
  dimAfter?: string;
}

export interface AnimationIntent {
  type: AnimationType;
  effect: AnimationEffect;
  trigger: AnimationTrigger;
  duration?: number;    // ms, default 500
  delay?: number;       // ms, default 0
  direction?: AnimationDirection;
  easing?: AnimationEasing;
  motionPath?: MotionPath;
  autoReverse?: boolean;
  toColor?: string;
  scaleFactor?: number;
  rotationAngle?: number;
  repeat?: number | "indefinite";
  repeatCount?: number | "indefinite";  // repeat count (or "indefinite" for infinite loop)
  build?: AnimationBuild;
  buildType?: AnimationBuildGrouping;  // legacy text build mode alias
}

export interface AnimationGroup {
  type: "parallel" | "sequence";
  animations: AnimationIntent[];
  trigger?: AnimationTrigger;
}

// ---------------------------------------------------------------------------
// Union & Document
// ---------------------------------------------------------------------------

export type PaperNode = PaperView | PaperText | PaperImage | PaperTable | PaperChart | PaperGroup | PaperConnector | PaperVideo | PaperAudio;

// ---------------------------------------------------------------------------
// Slide Background
// ---------------------------------------------------------------------------

export interface SolidBackground {
  type: "solid";
  color: ColorValue;
}

export interface GradientBackground {
  type: "gradient";
  angle?: number;
  stops: GradientStop[];
}

export interface PatternBackground {
  type: "pattern";
  pattern: PatternType;
  foreground: ColorValue;
  background: ColorValue;
}

export interface ImageBackground {
  type: "image";
  src: string;    // Base64 data URL or HTTPS URL
  tile?: boolean;
}

export type SlideBackground = SolidBackground | GradientBackground | PatternBackground | ImageBackground;

export interface SlideComment {
  author: string;
  text: string;
  date?: string;      // ISO 8601 date string
  x?: number;         // position in pixels
  y?: number;
}

export interface PaperSlide {
  type: "Slide";
  /** @internal Identifies compiler-owned recipes for post-layout quality gates. */
  agentPattern?: "title" | "statement" | "dashboard" | "comparison" | "chart-focus" | "bullets";
  style?: FlexStyle; // Usually defines slide dimensions, default 960x540
  layoutName?: string;
  masterName?: string;  // Phase 4: multi-master support
  transition?: SlideTransition;
  background?: SlideBackground;
  notes?: string | Paragraph[];     // Speaker notes text (string for plain text, Paragraph[] for rich text)
  headerFooter?: HeaderFooter;
  comments?: SlideComment[];
  children: PaperNode[];
}

export interface SlideSize {
  width: number;   // pixels
  height: number;  // pixels
}

// ---------------------------------------------------------------------------
// Theme Configuration
// ---------------------------------------------------------------------------

export interface ThemeColorScheme {
  dk1?: string; lt1?: string; dk2?: string; lt2?: string;
  accent1?: string; accent2?: string; accent3?: string;
  accent4?: string; accent5?: string; accent6?: string;
  hlink?: string; folHlink?: string;
}

export interface ThemeFontScheme {
  majorLatin?: string; minorLatin?: string;
  majorEa?: string; minorEa?: string;
}

export interface ThemeConfig {
  name?: string;
  colorScheme?: ThemeColorScheme;
  fontScheme?: ThemeFontScheme;
}

// ---------------------------------------------------------------------------
// Slide Masters & Layouts
// ---------------------------------------------------------------------------

export interface SlideLayoutConfig {
  name: string;
  placeholders?: PlaceholderRef[];
}

export interface SlideMasterConfig {
  name: string;
  layouts: SlideLayoutConfig[];
  background?: SlideBackground;
}

// ---------------------------------------------------------------------------
// Font Embedding
// ---------------------------------------------------------------------------

export interface FontEmbedConfig {
  fontFamily: string;
  /**
   * URL or data URI of a font file. PPTX rendering currently rejects this
   * explicit embedding request until a validated EOT/MicroType Express
   * encoder is available; raw sfnt bytes are not written into PowerPoint.
   */
  src: string;
  bold?: boolean;
  italic?: boolean;
}

export type FontStrategy =
  /** Uses admitted font bytes for measurement, but currently references the resolved name without embedding it in PPTX. */
  | "portable"
  /** References fonts installed in the viewing environment and emits no font streams. */
  | "system"
  /** Currently fails closed for PPTX until a validated EOT/MicroType Express encoder is available. */
  | "user-embedded"
  /** @deprecated Use "portable". */
  | "named-with-fallback"
  /** @deprecated Use "portable". */
  | "system-safe"
  /** @deprecated Use "user-embedded". */
  | "embedded";

// ---------------------------------------------------------------------------
// Slide Sections
// ---------------------------------------------------------------------------

export interface SlideSection {
  name: string;
  slideIndices: number[];  // 0-based slide indices
}

// ---------------------------------------------------------------------------
// Document Protection
// ---------------------------------------------------------------------------

export interface DocumentProtection {
  modifyPassword?: string;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Custom Shows
// ---------------------------------------------------------------------------

export interface CustomShow {
  name: string;
  slideIndices: number[];
}

// ---------------------------------------------------------------------------
// Custom Document Properties
// ---------------------------------------------------------------------------

export interface CustomProperty {
  name: string;
  value: string | number | boolean | Date;
}

// ---------------------------------------------------------------------------
// Print Settings
// ---------------------------------------------------------------------------

export interface PrintSettings {
  colorMode?: "clr" | "gray" | "bw";  // color, grayscale, black & white
  frameSlides?: boolean;
  scaleToFitPaper?: boolean;
}

// ---------------------------------------------------------------------------
// Diagram Configuration
// ---------------------------------------------------------------------------

export interface DiagramItem {
  text: string;
  children?: DiagramItem[];  // for hierarchy
  color?: ColorValue;
  icon?: string;  // preset icon name
}

export interface DiagramStyle {
  accentColor?: ColorValue;
  fontFamily?: string;
  fontSize?: number;
  connectorStyle?: "arrow" | "line" | "none";
  spacing?: number;
}

export interface DiagramConfig {
  type: "process" | "hierarchy" | "cycle" | "matrix" | "pyramid" | "list";
  items: DiagramItem[];
  style?: DiagramStyle;
  direction?: "horizontal" | "vertical";  // for process/list
}

export type AccessibilityLevel = "A" | "AA" | "AAA";

export interface AccessibilityConfig {
  level: AccessibilityLevel;
  language?: string;
  title?: string;
  autoAltText?: boolean;
  enforceHeadingHierarchy?: boolean;
  enforceTableHeaders?: boolean;
}

export interface PaperDocument {
  type: "Document";
  meta: {
    title?: string;
    author?: string;
    language?: string;
  };
  accessible?: boolean | AccessibilityConfig;
  template?: Buffer;
  slideSize?: SlideSize;
  notesSize?: SlideSize;
  theme?: ThemeConfig;
  /** Font portability policy. Defaults to portable, or user-embedded when legacy embeddedFonts are supplied. */
  fontStrategy?: FontStrategy;
  sections?: SlideSection[];
  masters?: SlideMasterConfig[];
  embeddedFonts?: FontEmbedConfig[];
  /** @internal Unique concrete faces used by resolved text runs. */
  resolvedFonts?: import("../typography/fontRegistry.js").ResolvedFontIdentity[];
  /** @internal False when system fonts or unresolved coverage make pixel gating nondeterministic. */
  fontPixelGateEligible?: boolean;
  protection?: DocumentProtection;
  customShows?: CustomShow[];
  customProperties?: CustomProperty[];
  handoutLayout?: "1" | "2" | "3" | "4" | "6" | "9";
  printSettings?: PrintSettings;
  chartFallbackImages?: boolean;

  slides: PaperSlide[];
}

// ---------------------------------------------------------------------------
// Slide-to-Image Rendering (PRD-14)
// ---------------------------------------------------------------------------

export type ImageFormat = "png" | "jpeg";

export interface ImageRenderOptions {
  /** Output width in pixels. Default: 400 (free) / 1920 (pro). */
  width?: number;
  /** Output height in pixels. Auto-calculated from aspect ratio if omitted. */
  height?: number;
  /** Output format. Default: 'png'. */
  format?: ImageFormat;
  /** JPEG quality 0–100. Default: 85. Ignored for PNG. */
  quality?: number;
  /** Override slide background with a solid hex color (e.g. '#FFFFFF'). */
  background?: string;
  /** Scale factor applied after width/height. Default: 1.0. */
  scale?: number;
  /** Specific slide indices to render (0-based). Default: all slides. */
  slides?: number[];
  /** Cancellation signal — checked before each slide render. */
  signal?: AbortSignal;
  /** Progress callback fired after each slide completes. */
  onProgress?: (slideIndex: number, totalSlides: number) => void;
}

export interface SlideImage {
  /** 0-based index of the slide in the original document. */
  slideIndex: number;
  /** Rendered image data (PNG or JPEG). */
  buffer: Buffer;
  /** Actual pixel width of the rendered image. */
  width: number;
  /** Actual pixel height of the rendered image. */
  height: number;
  /** Format of the rendered image. */
  format: ImageFormat;
}

export interface SvgRenderOptions {
  /** Output width in pixels. Default: slide width. */
  width?: number;
  /** Output height in pixels. Auto-calculated from aspect ratio if omitted. */
  height?: number;
  /** Scale factor applied after width/height. Default: 1.0. */
  scale?: number;
  /** Override slide background with a solid hex color or CSS color. */
  background?: string;
  /** Specific slide indices to render (0-based). Default: all slides. */
  slides?: number[];
  /** Cancellation signal — checked before each slide render. */
  signal?: AbortSignal;
  /** Progress callback fired after each slide completes. */
  onProgress?: (slideIndex: number, totalSlides: number) => void;
}

export interface SlideSvg {
  /** 0-based index of the slide in the original document. */
  slideIndex: number;
  /** Standalone SVG markup for the slide. */
  svg: string;
  /** Actual pixel width of the rendered SVG viewport. */
  width: number;
  /** Actual pixel height of the rendered SVG viewport. */
  height: number;
}

// ---------------------------------------------------------------------------
// Benchmark 1: Type-Guard Exhaustiveness
// If a new type is added to PaperNode without updating this switch, TypeScript
// will error on the assertNever call in the default branch.
// ---------------------------------------------------------------------------

function assertNever(x: never): never {
  throw new Error(`Unhandled PaperNode type: ${(x as { type: string }).type}`);
}

export function traverseAST(node: PaperNode): void {
  switch (node.type) {
    case "View":
      node.children?.forEach(traverseAST);
      break;
    case "Text":
      // leaf — nothing to recurse into
      break;
    case "Image":
      // leaf — nothing to recurse into
      break;
    case "Table":
      // leaf — tableData holds content, no children to recurse into
      break;
    case "Chart":
      // leaf — chartData holds content, no children to recurse into
      break;
    case "Group":
      node.children.forEach(traverseAST);
      break;
    case "Connector":
      // leaf — start/end define position, no children
      break;
    case "Video":
      // leaf — media reference, no children
      break;
    case "Audio":
      // leaf — media reference, no children
      break;
    default:
      assertNever(node);
  }
}
