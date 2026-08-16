/// <reference types="node" />
import { Readable } from 'node:stream';

type FontFace = "Regular" | "Bold" | "Italic" | "BoldItalic";
type FontDiagnosticCode = "FONT_SYSTEM_OPT_IN" | "FONT_EMBEDDING_UNAVAILABLE" | "FONT_REQUESTED_FAMILY_NOT_EMBEDDED" | "FONT_MISSING_FACE_VARIANT" | "FONT_COVERAGE_FALLBACK_USED";
interface FontDiagnostic {
    code: FontDiagnosticCode;
    message: string;
}
interface ResolvedFontIdentity {
    requestedFamily: string;
    family: string;
    face: FontFace;
    source: "registry" | "user" | "system";
    path?: string;
    sha256?: string;
    byteLength?: number;
    fsType?: number;
    coverage?: Record<string, number>;
    diagnostics?: FontDiagnostic[];
    pixelGateEligible: boolean;
}

declare const PLACEHOLDER_TYPES: readonly ["title", "body", "ctrTitle", "subTitle", "pic", "obj", "chart", "tbl", "dgm", "media", "clipArt", "dt", "ftr", "hdr", "sldNum", "sldImg"];
declare const BASIC_SHAPES: readonly ["rect", "ellipse", "roundRect", "triangle", "rtTriangle", "rightTriangle", "diamond", "parallelogram", "trapezoid", "nonIsoscelesTrapezoid", "heart", "plus", "cross", "chevron", "homePlate", "donut", "cloud", "hexagon", "pentagon", "octagon", "decagon", "heptagon", "dodecagon", "snip1Rect", "snip2SameRect", "snip2DiagRect", "snip2SameRect2", "snipRoundRect", "snipRound2SameRect", "round1Rect", "round2SameRect", "round2DiagRect", "round1Rect2", "bevel", "noSmoking", "blockArc", "pie", "pieWedge", "arc", "chord", "corner", "diagStripe", "halfFrame", "frame", "foldedCorner", "can", "cube", "teardrop", "gear6", "gear9", "plaque", "smileyFace", "irregularSeal1", "irregularSeal2", "ribbon", "ribbon2", "leftRightRibbon", "lightningBolt", "moon", "sun", "funnel", "wave", "doubleWave", "ellipseRibbon", "ellipseRibbon2", "verticalScroll", "horizontalScroll", "line", "lineInv", "heptagram", "decaStar"];
declare const ARROW_SHAPES: readonly ["rightArrow", "leftArrow", "upArrow", "downArrow", "leftRightArrow", "upDownArrow", "bentArrow", "uturnArrow", "bentUpArrow", "curvedRightArrow", "curvedLeftArrow", "curvedUpArrow", "curvedDownArrow", "stripedRightArrow", "notchedRightArrow", "circularArrow", "leftCircularArrow", "swooshArrow", "leftRightUpArrow", "quadArrow", "leftUpArrow"];
declare const ARROW_CALLOUT_SHAPES: readonly ["quadArrowCallout", "leftRightArrowCallout", "upDownArrowCallout", "leftArrowCallout", "rightArrowCallout", "upArrowCallout", "downArrowCallout"];
declare const FLOWCHART_SHAPES: readonly ["flowChartProcess", "flowChartDecision", "flowChartDocument", "flowChartTerminator", "flowChartConnector", "flowChartMerge", "flowChartSort", "flowChartExtract", "flowChartPreparation", "flowChartManualInput", "flowChartManualOperation", "flowChartPredefinedProcess", "flowChartInternalStorage", "flowChartMultidocument", "flowChartOffpageConnector", "flowChartPunchedTape", "flowChartSummingJunction", "flowChartOr", "flowChartDelay", "flowChartAlternateProcess", "flowChartMagneticDisk", "flowChartMagneticDrum", "flowChartMagneticTape", "flowChartDisplay", "flowChartOnlineStorage", "flowChartCollate", "flowChartInputOutput", "flowChartOfflineStorage"];
declare const ACTION_BUTTON_SHAPES: readonly ["actionButtonBlank", "actionButtonHome", "actionButtonHelp", "actionButtonInformation", "actionButtonBackPrevious", "actionButtonForwardNext", "actionButtonBeginning", "actionButtonEnd", "actionButtonReturn", "actionButtonSound", "actionButtonMovie"];
declare const CALLOUT_SHAPES: readonly ["wedgeRoundRectCallout", "wedgeRectCallout", "wedgeEllipseCallout", "wedgeRoundRectCallout2", "cloudCallout", "borderCallout1", "borderCallout2", "borderCallout3", "callout1", "callout2", "callout3", "accentCallout1", "accentCallout2", "accentCallout3", "accentBorderCallout1", "accentBorderCallout2", "accentBorderCallout3"];
declare const MATH_SHAPES: readonly ["mathPlus", "mathMinus", "mathMultiply", "mathDivide", "mathEqual", "mathNotEqual", "mathNotEqual2"];
declare const STAR_SHAPES: readonly ["star4", "star5", "star6", "star7", "star8", "star10", "star12", "star16", "star24", "star32"];
declare const BRACKET_BRACE_SHAPES: readonly ["leftBrace", "rightBrace", "leftBracket", "rightBracket", "bracePair", "bracketPair"];
declare const TAB_SHAPES: readonly ["plaqueTabs", "squareTabs", "roundTab"];
declare const CONNECTOR_SHAPES: readonly ["curvedConnector2", "curvedConnector3", "curvedConnector4", "curvedConnector5", "straightConnector1", "bentConnector2", "bentConnector3", "bentConnector4", "bentConnector5"];
declare const PATTERN_TYPES: readonly ["ltDnDiag", "ltUpDiag", "dkDnDiag", "dkUpDiag", "ltHorz", "ltVert", "dkHorz", "dkVert", "cross", "dnDiag", "upDiag", "diagCross", "smCheck", "lgCheck", "pct25", "pct50"];
declare const CHART_TYPES: readonly ["bar", "line", "pie", "scatter", "bubble", "area", "doughnut", "radar", "waterfall", "stock", "funnel", "treemap", "sunburst", "histogram", "boxWhisker"];
declare const CONNECTOR_TYPES: readonly ["straight", "elbow", "curved"];
declare const ARROW_HEAD_TYPES: readonly ["none", "triangle", "stealth", "diamond", "oval", "arrow"];
declare const ARROW_HEAD_SIZES: readonly ["sm", "med", "lg"];

type Dimension = number | `${number}%`;
type BasicShape = (typeof BASIC_SHAPES)[number];
type ArrowShape = (typeof ARROW_SHAPES)[number];
type ArrowCalloutShape = (typeof ARROW_CALLOUT_SHAPES)[number];
type FlowchartShape = (typeof FLOWCHART_SHAPES)[number];
type ActionButtonShape = (typeof ACTION_BUTTON_SHAPES)[number];
type CalloutShape = (typeof CALLOUT_SHAPES)[number];
type MathShape = (typeof MATH_SHAPES)[number];
type StarShape = (typeof STAR_SHAPES)[number];
type BracketBraceShape = (typeof BRACKET_BRACE_SHAPES)[number];
type TabShape = (typeof TAB_SHAPES)[number];
type ConnectorShape = (typeof CONNECTOR_SHAPES)[number];
/** Full ECMA-376 §20.1.10.56 shape type union. */
type ShapeType = BasicShape | ArrowShape | ArrowCalloutShape | FlowchartShape | ActionButtonShape | CalloutShape | MathShape | StarShape | BracketBraceShape | TabShape | ConnectorShape;
/** OOXML placeholder types per ECMA-376 §19.7.9 (ST_PlaceholderType). */
type PlaceholderType = (typeof PLACEHOLDER_TYPES)[number];
interface PlaceholderRef {
    type?: PlaceholderType;
    idx?: number;
}
interface ColorModifier {
    scheme: string;
    tint?: number;
    shade?: number;
    lumMod?: number;
    lumOff?: number;
    satMod?: number;
    satOff?: number;
    hueMod?: number;
    hueOff?: number;
    comp?: boolean;
    inv?: boolean;
    gray?: boolean;
}
type ColorValue = string | ColorModifier;
interface GradientStop {
    color: ColorValue;
    position: number;
    alpha?: number;
}
interface GradientFill {
    type: "linear" | "gradient" | "radial";
    angle?: number;
    stops: GradientStop[];
}
interface SolidFill {
    type: "solid";
    color: ColorValue;
}
type PatternType = (typeof PATTERN_TYPES)[number];
interface PatternFill {
    type: "pattern";
    pattern: PatternType;
    foreground: ColorValue;
    background: ColorValue;
}
interface ImageFill {
    type: "image";
    src: string;
    tile?: boolean;
    stretch?: boolean;
}
type Fill = SolidFill | GradientFill | PatternFill | ImageFill;
interface DropShadow {
    color: ColorValue;
    offsetX: number;
    offsetY: number;
    blurRadius: number;
    opacity?: number;
}
interface Glow {
    color: ColorValue;
    radius: number;
    opacity?: number;
}
interface Reflection {
    blurRadius?: number;
    startOpacity?: number;
    endOpacity?: number;
    distance?: number;
    direction?: number;
    size?: number;
}
interface SoftEdge {
    radius: number;
}
interface InnerShadow {
    color: ColorValue;
    offsetX: number;
    offsetY: number;
    blurRadius: number;
    opacity?: number;
}
type CameraPreset = "orthographicFront" | "isometricTopUp" | "isometricTopDown" | "isometricBottomUp" | "isometricBottomDown" | "isometricLeftUp" | "isometricLeftDown" | "isometricRightUp" | "isometricRightDown" | "isometricOffAxis1Left" | "isometricOffAxis1Right" | "isometricOffAxis1Top" | "isometricOffAxis2Left" | "isometricOffAxis2Right" | "isometricOffAxis2Top" | "isometricOffAxis3Left" | "isometricOffAxis3Bottom" | "isometricOffAxis4Left" | "isometricOffAxis4Bottom" | "obliqueTopLeft" | "obliqueTop" | "obliqueTopRight" | "obliqueLeft" | "obliqueRight" | "obliqueBottomLeft" | "obliqueBottom" | "obliqueBottomRight" | "perspectiveFront" | "perspectiveLeft" | "perspectiveRight" | "perspectiveAbove" | "perspectiveBelow" | "perspectiveAboveLeftFacing" | "perspectiveAboveRightFacing" | "perspectiveContrastingLeftFacing" | "perspectiveContrastingRightFacing" | "perspectiveHeroicLeftFacing" | "perspectiveHeroicRightFacing" | "perspectiveHeroicExtremeLeftFacing" | "perspectiveHeroicExtremeRightFacing" | "perspectiveRelaxed" | "perspectiveRelaxedModerately";
type LightRigType = "balanced" | "brightRoom" | "chilly" | "contrasting" | "flat" | "flood" | "freezing" | "glow" | "harsh" | "legacyFlat1" | "legacyFlat2" | "legacyFlat3" | "legacyFlat4" | "legacyHarsh1" | "legacyHarsh2" | "legacyHarsh3" | "legacyHarsh4" | "legacyNormal1" | "legacyNormal2" | "legacyNormal3" | "legacyNormal4" | "morning" | "soft" | "sunrise" | "sunset" | "threePt" | "twoPt";
type LightRigDirection = "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br";
type BevelPreset = "angle" | "artDeco" | "circle" | "convex" | "coolSlant" | "cross" | "divot" | "hardEdge" | "relaxedInset" | "riblet" | "slope" | "softRound";
type MaterialPreset = "clear" | "dkEdge" | "flat" | "legacyMatte" | "legacyMetal" | "legacyPlastic" | "legacyWireframe" | "matte" | "metal" | "plastic" | "powder" | "softEdge" | "softmetal" | "translucentPowder" | "warmMatte";
interface Scene3D {
    camera: {
        preset: CameraPreset;
        fov?: number;
    };
    lightRig: {
        type: LightRigType;
        direction: LightRigDirection;
    };
}
interface BevelConfig {
    width?: number;
    height?: number;
    preset: BevelPreset;
}
interface Sp3D {
    material?: MaterialPreset;
    bevelTop?: BevelConfig;
    bevelBottom?: BevelConfig;
    extrudeHeight?: number;
    extrudeColor?: ColorValue;
    contourWidth?: number;
    contourColor?: ColorValue;
}
interface ImageEffects {
    brightness?: number;
    contrast?: number;
    grayscale?: boolean;
    biLevel?: number;
    duotone?: {
        color1: ColorValue;
        color2: ColorValue;
    };
    blur?: number;
}
interface Effects {
    dropShadow?: DropShadow;
    innerShadow?: InnerShadow;
    glow?: Glow;
    reflection?: Reflection;
    softEdge?: SoftEdge;
    scene3d?: Scene3D;
    sp3d?: Sp3D;
}
interface FlexStyle {
    flexDirection?: "row" | "column";
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around";
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
    backgroundColor?: ColorValue;
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
    fill?: Fill;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: ColorValue;
    borderStyle?: "solid" | "dashed" | "dotted" | "dotDash";
    borderCap?: "flat" | "round" | "square";
    borderCompound?: "single" | "double" | "thickThin" | "thinThick" | "triple";
    effects?: Effects;
    rotation?: number;
    opacity?: number;
    flipH?: boolean;
    flipV?: boolean;
}
interface TextInsets {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
}
type TextFitPolicy = "strict" | "fitHeight" | "fitFontSize" | "truncate" | "overflow";
interface TextFitConfig {
    policy: TextFitPolicy;
    minFontSize?: number;
    maxLines?: number;
    marker?: string;
}
type TextWarpPreset = "textNoShape" | "textPlain" | "textStop" | "textTriangle" | "textTriangleInverted" | "textChevron" | "textChevronInverted" | "textRingInside" | "textRingOutside" | "textArchUp" | "textArchDown" | "textCircle" | "textButton" | "textArchUpPour" | "textArchDownPour" | "textCirclePour" | "textButtonPour" | "textCurveUp" | "textCurveDown" | "textCanUp" | "textCanDown" | "textWave1" | "textWave2" | "textDoubleWave1" | "textWave4" | "textInflate" | "textDeflate" | "textInflateBottom" | "textDeflateBottom" | "textInflateTop" | "textDeflateTop" | "textDeflateInflate" | "textDeflateInflateDeflate" | "textFadeRight" | "textFadeLeft" | "textFadeUp" | "textFadeDown" | "textSlantUp" | "textSlantDown" | "textCascadeUp" | "textCascadeDown";
interface TextStyle extends FlexStyle {
    color?: ColorValue;
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
    verticalAlign?: "top" | "middle" | "bottom";
    textInsets?: TextInsets;
    textDirection?: "horizontal" | "vertical" | "verticalEA";
    rtl?: boolean;
    columns?: number;
    columnSpacing?: number;
    lang?: string;
    textWarp?: TextWarpPreset;
    textFit?: TextFitConfig;
    /** @internal Concrete font decision made before layout. */
    resolvedFont?: ResolvedFontIdentity;
}
interface TextRunStyle {
    color?: ColorValue;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    textDecorationLine?: "none" | "underline" | "strikethrough" | "underline-strikethrough";
    textDecorationStyle?: "solid" | "double" | "dotted" | "dashed";
    baseline?: "superscript" | "subscript";
    letterSpacing?: number;
    shadow?: DropShadow;
    outline?: {
        width: number;
        color: ColorValue;
    };
    textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
    gradientFill?: GradientFill;
    lang?: string;
    altLang?: string;
    highlight?: ColorValue;
    kerning?: number;
    /** @internal Concrete font decision made before shaping and serialization. */
    resolvedFont?: ResolvedFontIdentity;
}
/**
 * Hyperlink target. Specify exactly one of: url, mailto, slide, action.
 * If multiple are set, resolution priority is: action > slide > mailto > url.
 */
interface HyperlinkTarget {
    url?: string;
    mailto?: string;
    slide?: number;
    action?: "firstSlide" | "lastSlide" | "nextSlide" | "previousSlide" | "endShow";
    tooltip?: string;
}
interface TextRun {
    text: string;
    style?: TextRunStyle;
    hyperlink?: string | HyperlinkTarget;
}
interface BulletChar {
    type?: "char";
    char: string;
    color?: ColorValue;
    size?: number;
    fontFamily?: string;
}
interface BulletAutoNum {
    type: "autoNum";
    scheme: AutoNumScheme;
    startAt?: number;
}
type AutoNumScheme = "arabicPeriod" | "arabicParenR" | "romanUcPeriod" | "romanLcPeriod" | "alphaUcPeriod" | "alphaLcPeriod" | "alphaLcParenR" | "alphaUcParenR";
interface BulletNone {
    type: "none";
}
type BulletConfig = BulletChar | BulletAutoNum | BulletNone;
type TabAlignType = "l" | "ctr" | "r" | "dec";
interface TabStop {
    position: number;
    align?: TabAlignType;
}
interface Paragraph {
    runs: TextRun[];
    align?: "left" | "center" | "right" | "justify";
    /**
     * Line spacing. Values < 4 are treated as multipliers (CSS-style: 1.4 → 140%).
     * Values ≥ 4 are treated as legacy points (deprecated; emits a warning).
     * Set lineSpacingMode="percentage" to opt into explicit percentage values.
     */
    lineHeight?: number;
    lineSpacingMode?: "points" | "percentage";
    spaceBefore?: number;
    spaceAfter?: number;
    spaceBeforePercent?: number;
    spaceAfterPercent?: number;
    level?: number;
    indent?: number;
    marginLeft?: number;
    bullet?: BulletConfig;
    rtl?: boolean;
    tabStops?: TabStop[];
    hangingIndent?: number;
}
interface ShapeLocks {
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
type PathCommand = {
    type: "moveTo";
    x: number;
    y: number;
} | {
    type: "lineTo";
    x: number;
    y: number;
} | {
    type: "cubicBezTo";
    cp1x: number;
    cp1y: number;
    cp2x: number;
    cp2y: number;
    x: number;
    y: number;
} | {
    type: "quadBezTo";
    cpx: number;
    cpy: number;
    x: number;
    y: number;
} | {
    type: "arcTo";
    wR: number;
    hR: number;
    stAng: number;
    swAng: number;
} | {
    type: "close";
};
interface CustomGeometryPath {
    commands: PathCommand[];
    width?: number;
    height?: number;
    fill?: "norm" | "none" | "lighten" | "darken";
}
interface CustomGeometry {
    paths: CustomGeometryPath[];
}
interface PaperView {
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
    textContent?: string | TextRun[];
    textParagraphs?: Paragraph[];
    textStyle?: TextStyle;
}
interface PaperText {
    type: "Text";
    style?: TextStyle;
    content?: string | TextRun[];
    paragraphs?: Paragraph[];
    autoFit?: boolean;
    placeholder?: PlaceholderRef;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    decorative?: boolean;
    readingOrder?: number;
}
interface ImageCrop {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
}
interface PaperImage {
    type: "Image";
    style?: FlexStyle;
    src: string;
    svgSrc?: string;
    crop?: ImageCrop;
    borderRadius?: number;
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
interface TableCellBorder {
    width?: number;
    color?: ColorValue;
}
interface TableCellBorders {
    top?: TableCellBorder;
    right?: TableCellBorder;
    bottom?: TableCellBorder;
    left?: TableCellBorder;
    diagonalDown?: TableCellBorder;
    diagonalUp?: TableCellBorder;
}
interface TableCellStyle {
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
    padding?: number;
    textDirection?: "horizontal" | "vertical" | "verticalEA";
    rtl?: boolean;
    lang?: string;
}
interface TableCell {
    text: string;
    style?: TableCellStyle;
    colSpan?: number;
    rowSpan?: number;
    vMerge?: boolean;
    hMerge?: boolean;
    content?: TextRun[];
    paragraphs?: Paragraph[];
}
interface TableRow {
    height?: number;
    minHeight?: number;
    cells: TableCell[];
}
interface TableStyle {
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
interface TableRowLayoutPolicy {
    /** Natural leaves short rows compact; fill distributes extra height. Default: fill. */
    mode?: "natural" | "fill";
    /** Table-wide minimum row height in pixels. Row-level minHeight still wins. */
    minRowHeight?: number;
    /** Allow overfull tables without a layout warning. Default: warn. */
    overflow?: "warn" | "allow";
}
interface TableData {
    columns: number[];
    rows: TableRow[];
    style?: TableStyle;
    autoFit?: boolean | "distribute";
    rowLayout?: TableRowLayoutPolicy;
}
interface PaperTable {
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
type ChartType = (typeof CHART_TYPES)[number];
interface TreemapCategory {
    name: string;
    value?: number;
    children?: TreemapCategory[];
    color?: string;
}
interface TreemapData {
    categories: TreemapCategory[];
    dataLabels?: ChartDataLabels;
}
interface SunburstData {
    categories: TreemapCategory[];
    dataLabels?: ChartDataLabels;
}
interface HistogramData {
    values: number[];
    binCount?: number;
    binWidth?: number;
    overflow?: number;
    underflow?: number;
    seriesName?: string;
    color?: string;
    dataLabels?: ChartDataLabels;
}
interface BoxWhiskerData {
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
type BarGrouping = "clustered" | "stacked" | "percentStacked";
type LineGrouping = "standard" | "stacked" | "percentStacked";
type AreaGrouping = "standard" | "stacked" | "percentStacked";
interface XYDataPoint {
    x: number;
    y: number;
    size?: number;
}
interface XYSeries {
    name: string;
    dataPoints: XYDataPoint[];
    color?: string;
}
type MarkerSymbol = "circle" | "square" | "diamond" | "triangle" | "x" | "star" | "plus" | "dot" | "dash" | "none";
interface MarkerConfig {
    symbol: MarkerSymbol;
    size?: number;
    color?: string;
}
interface TrendlineConfig {
    type: "linear" | "exponential" | "logarithmic" | "polynomial" | "power" | "movingAvg";
    order?: number;
    period?: number;
    forward?: number;
    backward?: number;
    displayEquation?: boolean;
    displayRSquared?: boolean;
    color?: string;
}
interface ErrorBarsConfig {
    direction: "x" | "y" | "both";
    type: "fixedVal" | "percentage" | "stdDev" | "stdErr";
    value?: number;
}
interface ChartSeries {
    name: string;
    values: number[];
    color?: string;
    overrideType?: "bar" | "line" | "area";
    targetAxis?: "primary" | "secondary";
    pointColors?: string[];
    marker?: MarkerConfig;
    trendline?: TrendlineConfig;
    errorBars?: ErrorBarsConfig;
    dataLabels?: ChartDataLabels;
}
interface ChartGridlines {
    major?: boolean;
    minor?: boolean;
    color?: string;
}
interface ChartAxisConfig {
    title?: string;
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    min?: number;
    max?: number;
    visible?: boolean;
    numberFormat?: string;
    gridlines?: ChartGridlines;
    tickMark?: {
        major?: "cross" | "in" | "out" | "none";
        minor?: "cross" | "in" | "out" | "none";
    };
    labelRotation?: number;
    labelFont?: {
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        bold?: boolean;
        italic?: boolean;
    };
    crossesAt?: number;
}
interface ChartDataLabels {
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
interface ChartAreaStyle {
    fill?: string;
    borderColor?: string;
    borderWidth?: number;
}
interface WaterfallData {
    categories: string[];
    values: number[];
    totalIndices?: number[];
    increaseColor?: string;
    decreaseColor?: string;
    totalColor?: string;
    connectorLines?: boolean;
}
interface StockData {
    categories: string[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    hiLowLines?: boolean;
    upDownBars?: boolean;
    upColor?: string;
    downColor?: string;
}
interface FunnelData {
    categories: string[];
    values: number[];
    colors?: string[];
}
interface ChartDataTable {
    showKeys?: boolean;
    showHorzBorder?: boolean;
    showVertBorder?: boolean;
    showOutline?: boolean;
    fontFamily?: string;
    fontSize?: number;
}
interface ChartData {
    chartType: ChartType;
    dataLabels?: ChartDataLabels;
    barGrouping?: BarGrouping;
    lineGrouping?: LineGrouping;
    areaGrouping?: AreaGrouping;
    barDirection?: "col" | "bar";
    smooth?: boolean;
    marker?: MarkerConfig;
    explosion?: number;
    categories?: string[];
    series?: ChartSeries[];
    xySeries?: XYSeries[];
    holeSize?: number;
    title?: {
        text?: string;
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        bold?: boolean;
    };
    categoryAxis?: ChartAxisConfig;
    valueAxis?: ChartAxisConfig;
    secondaryValueAxis?: ChartAxisConfig;
    secondaryCategoryAxis?: ChartAxisConfig;
    legend?: {
        position?: "bottom" | "top" | "left" | "right" | "none";
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        border?: {
            color?: string;
            width?: number;
        };
        fill?: string;
    };
    gapWidth?: number;
    overlap?: number;
    firstSliceAng?: number;
    plotArea?: ChartAreaStyle;
    chartArea?: ChartAreaStyle;
    dispBlanksAs?: "gap" | "zero" | "span";
    radarStyle?: "radar" | "filled";
    waterfallData?: WaterfallData;
    stockData?: StockData;
    funnelData?: FunnelData;
    dataTable?: ChartDataTable;
    treemapData?: TreemapData;
    sunburstData?: SunburstData;
    histogramData?: HistogramData;
    boxWhiskerData?: BoxWhiskerData;
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
interface ChartCategoryAnchor {
    categoryIndex: number;
    seriesIndex?: number;
    anchor?: "barTop" | "barBottom" | "value";
    value?: number;
}
/**
 * Free-floating text annotation (legacy form). Positioned in chart-area
 * percentages 0..100. Emitted via OOXML user shapes (cdr:userShapes).
 */
interface ChartTextAnnotation {
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
interface ChartTrendArrowAnnotation {
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
interface ChartTargetLineAnnotation {
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
type ChartAnnotation = ChartTextAnnotation | ChartTrendArrowAnnotation | ChartTargetLineAnnotation;
interface ChartAnimation {
    buildType: "bySeries" | "byCategory" | "byElement" | "allAtOnce";
    trigger?: AnimationTrigger;
    effect?: AnimationEffect;
    duration?: number;
}
interface PaperChart {
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
interface PaperGroup {
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
type ConnectorType = (typeof CONNECTOR_TYPES)[number];
interface ConnectorPoint {
    x: number;
    y: number;
}
type ArrowHeadType = (typeof ARROW_HEAD_TYPES)[number];
type ArrowHeadSize = (typeof ARROW_HEAD_SIZES)[number];
interface ArrowHeadConfig {
    type: ArrowHeadType;
    width?: ArrowHeadSize;
    length?: ArrowHeadSize;
}
interface ConnectorShapeRef {
    shapeId: number;
    site: number;
}
interface PaperConnector {
    type: "Connector";
    style?: FlexStyle;
    connectorType: ConnectorType;
    start: ConnectorPoint;
    end: ConnectorPoint;
    lineWidth?: number;
    lineColor?: ColorValue;
    lineDashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
    arrowStart?: boolean | ArrowHeadConfig;
    arrowEnd?: boolean | ArrowHeadConfig;
    startShape?: ConnectorShapeRef;
    endShape?: ConnectorShapeRef;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
    locks?: ShapeLocks;
}
interface MediaPlaybackOptions {
    loop?: boolean;
    volume?: number;
    trimStart?: number;
    trimEnd?: number;
    autoPlay?: boolean;
    hideOnClick?: boolean;
}
interface PaperVideo {
    type: "Video";
    style?: FlexStyle;
    src: string;
    poster?: string;
    mimeType?: string;
    playback?: MediaPlaybackOptions;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
}
interface PaperAudio {
    type: "Audio";
    style?: FlexStyle;
    src: string;
    mimeType?: string;
    playback?: MediaPlaybackOptions;
    playAcrossSlides?: boolean;
    icon?: "speaker" | "none";
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
}
interface HeaderFooter {
    slideNumber?: boolean;
    footer?: string;
    dateTime?: boolean;
}
type TransitionType = "fade" | "push" | "wipe" | "cover" | "zoom" | "morph" | "split" | "blinds" | "checker" | "dissolve" | "comb";
type TransitionDirection = "up" | "down" | "left" | "right";
interface SlideTransition {
    type: TransitionType;
    duration?: number;
    direction?: TransitionDirection;
    advanceOnClick?: boolean;
    advanceAfterTime?: number;
}
type AnimationType = "entrance" | "exit" | "emphasis";
type AnimationEffect = "fade" | "fly" | "zoom" | "spin" | "appear" | "bounce" | "float" | "grow" | "shrink" | "growShrink" | "pulse" | "teeter" | "wipe" | "split" | "dissolve" | "swivel" | "motionPath" | "colorReveal" | "colorChange" | "boldFlash" | "wave" | "flip";
type AnimationTrigger = "onClick" | "withPrevious" | "afterPrevious";
type AnimationDirection = "up" | "down" | "left" | "right";
type AnimationEasing = "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce";
type MotionPathType = "line" | "arc" | "custom";
type AnimationBuildGrouping = "byParagraph" | "byFirstLevel" | "allAtOnce";
interface MotionPath {
    path: string;
    pathType?: MotionPathType;
    origin?: "layout" | "parent";
}
interface AnimationBuild {
    nested?: boolean;
    grouping?: AnimationBuildGrouping;
    dimAfter?: string;
}
interface AnimationIntent {
    type: AnimationType;
    effect: AnimationEffect;
    trigger: AnimationTrigger;
    duration?: number;
    delay?: number;
    direction?: AnimationDirection;
    easing?: AnimationEasing;
    motionPath?: MotionPath;
    autoReverse?: boolean;
    toColor?: string;
    scaleFactor?: number;
    rotationAngle?: number;
    repeat?: number | "indefinite";
    repeatCount?: number | "indefinite";
    build?: AnimationBuild;
    buildType?: AnimationBuildGrouping;
}
interface AnimationGroup {
    type: "parallel" | "sequence";
    animations: AnimationIntent[];
    trigger?: AnimationTrigger;
}
type PaperNode = PaperView | PaperText | PaperImage | PaperTable | PaperChart | PaperGroup | PaperConnector | PaperVideo | PaperAudio;
interface SolidBackground {
    type: "solid";
    color: ColorValue;
}
interface GradientBackground {
    type: "gradient";
    angle?: number;
    stops: GradientStop[];
}
interface PatternBackground {
    type: "pattern";
    pattern: PatternType;
    foreground: ColorValue;
    background: ColorValue;
}
interface ImageBackground {
    type: "image";
    src: string;
    tile?: boolean;
}
type SlideBackground = SolidBackground | GradientBackground | PatternBackground | ImageBackground;
interface SlideComment {
    author: string;
    text: string;
    date?: string;
    x?: number;
    y?: number;
}
interface PaperSlide {
    type: "Slide";
    /** @internal Identifies compiler-owned recipes for post-layout quality gates. */
    agentPattern?: "title" | "statement" | "dashboard" | "comparison" | "chart-focus" | "bullets";
    style?: FlexStyle;
    layoutName?: string;
    masterName?: string;
    transition?: SlideTransition;
    background?: SlideBackground;
    notes?: string | Paragraph[];
    headerFooter?: HeaderFooter;
    comments?: SlideComment[];
    children: PaperNode[];
}
interface SlideSize {
    width: number;
    height: number;
}
interface ThemeColorScheme {
    dk1?: string;
    lt1?: string;
    dk2?: string;
    lt2?: string;
    accent1?: string;
    accent2?: string;
    accent3?: string;
    accent4?: string;
    accent5?: string;
    accent6?: string;
    hlink?: string;
    folHlink?: string;
}
interface ThemeFontScheme {
    majorLatin?: string;
    minorLatin?: string;
    majorEa?: string;
    minorEa?: string;
}
interface ThemeConfig {
    name?: string;
    colorScheme?: ThemeColorScheme;
    fontScheme?: ThemeFontScheme;
}
interface SlideLayoutConfig {
    name: string;
    placeholders?: PlaceholderRef[];
}
interface SlideMasterConfig {
    name: string;
    layouts: SlideLayoutConfig[];
    background?: SlideBackground;
}
interface FontEmbedConfig {
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
type FontStrategy = 
/** Uses admitted font bytes for measurement, but currently references the resolved name without embedding it in PPTX. */
"portable"
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
interface SlideSection {
    name: string;
    slideIndices: number[];
}
interface DocumentProtection {
    modifyPassword?: string;
    readOnly?: boolean;
}
interface CustomShow {
    name: string;
    slideIndices: number[];
}
interface CustomProperty {
    name: string;
    value: string | number | boolean | Date;
}
interface PrintSettings {
    colorMode?: "clr" | "gray" | "bw";
    frameSlides?: boolean;
    scaleToFitPaper?: boolean;
}
interface DiagramItem {
    text: string;
    children?: DiagramItem[];
    color?: ColorValue;
    icon?: string;
}
interface DiagramStyle {
    accentColor?: ColorValue;
    fontFamily?: string;
    fontSize?: number;
    connectorStyle?: "arrow" | "line" | "none";
    spacing?: number;
}
interface DiagramConfig {
    type: "process" | "hierarchy" | "cycle" | "matrix" | "pyramid" | "list";
    items: DiagramItem[];
    style?: DiagramStyle;
    direction?: "horizontal" | "vertical";
}
type AccessibilityLevel$1 = "A" | "AA" | "AAA";
interface AccessibilityConfig {
    level: AccessibilityLevel$1;
    language?: string;
    title?: string;
    autoAltText?: boolean;
    enforceHeadingHierarchy?: boolean;
    enforceTableHeaders?: boolean;
}
interface PaperDocument {
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
    resolvedFonts?: ResolvedFontIdentity[];
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
type ImageFormat = "png" | "jpeg";
interface ImageRenderOptions {
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
interface SlideImage {
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
interface SvgRenderOptions {
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
interface SlideSvg {
    /** 0-based index of the slide in the original document. */
    slideIndex: number;
    /** Standalone SVG markup for the slide. */
    svg: string;
    /** Actual pixel width of the rendered SVG viewport. */
    width: number;
    /** Actual pixel height of the rendered SVG viewport. */
    height: number;
}
declare function traverseAST(node: PaperNode): void;

interface AutoFitResult {
    fontScale: number;
    lnSpcReduction: number;
    overflow: boolean;
    measuredHeight?: number;
    lineCount?: number;
}
interface AutoFitOptions {
    minFontScale?: number;
    maxLnSpcReduction?: number;
    fontScaleStep?: number;
    lnSpcStep?: number;
    maxLines?: number;
}
/**
 * Computes auto-fit parameters to shrink text into a container.
 *
 * Algorithm (binary search):
 * 1. Fast path: fits at 100% with lnSpc=0 → return immediately
 * 2. Try lnSpc reduction at full size (0→20000, step 5000)
 * 3. Check if even MIN_FONT_SCALE fits (early overflow exit)
 * 4. Binary search: lo=MIN_FONT_SCALE, hi=100000-FONT_SCALE_STEP
 *    - At each probe, check fitsAtAnyLnSpc(mid)
 *    - If fits: lo=mid; else hi=mid-FONT_SCALE_STEP
 * 5. At final fontScale, find minimum lnSpc via linear scan (5 values max)
 *
 * Output contract: fontScale always multiple of FONT_SCALE_STEP (2500),
 * lnSpcReduction always multiple of LN_SPC_STEP (5000).
 * Priority: maximize fontScale first, then minimize lnSpcReduction.
 *
 * Worst case: ~30 measureAtScale calls (down from ~160 in linear scan).
 */
declare function computeAutoFit(content: string | TextRun[], defaultStyle: TextStyle | undefined, containerWidth: number, containerHeight: number, options?: AutoFitOptions): AutoFitResult;

type PptxCompatibilityMode = "native_safe" | "native_anchored" | "visual_fallback";
type PptxFallbackLevel = "native_editable" | "native_anchored" | "alternate_content" | "visual_fallback";
type TextCompositionMode = "shape_per_text" | "single_frame_card" | "rendered_visual";
type InternalAutoFitPolicy = "none" | "shrink_text" | "grow_shape" | "office_default" | "engine_conditional";
type CompatibilityIssueClass = "text_overflow_risk" | "font_substitution_risk" | "chart_layout_risk" | "template_placeholder_risk" | "relationship_risk" | "animation_risk";
interface CompatibilityIssue {
    code: string;
    message: string;
    severity: "info" | "warning" | "error";
    issueClass?: CompatibilityIssueClass;
    fallbackLevel?: PptxFallbackLevel;
    remediation?: string;
}
interface LayoutCompatibilityMeta {
    mode: PptxCompatibilityMode;
    reason?: string;
    issues?: CompatibilityIssue[];
    fallbackReason?: string;
    chartUtilization?: {
        widthRatio: number;
        heightRatio: number;
    };
    textCompositionMode?: TextCompositionMode;
    autoFitPolicy?: InternalAutoFitPolicy;
}
interface LayoutRuntimeProps {
    _autoFitResult?: AutoFitResult;
    _insideVisualView?: boolean;
    _omitTransform?: boolean;
    _singleLineShrinkWrappedWidth?: number;
    _compatibility?: LayoutCompatibilityMeta;
}

interface LayoutMetrics {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface LayoutNodeBase extends LayoutRuntimeProps {
    layout: LayoutMetrics;
    children?: LayoutNode[];
}
type LayoutNode = (Omit<PaperView, "children"> & LayoutNodeBase) | (Omit<PaperText, "children"> & LayoutNodeBase) | (PaperImage & LayoutNodeBase) | (PaperTable & LayoutNodeBase) | (PaperChart & LayoutNodeBase) | (Omit<PaperGroup, "children"> & LayoutNodeBase) | (PaperConnector & LayoutNodeBase) | (PaperVideo & LayoutNodeBase) | (PaperAudio & LayoutNodeBase) | (Omit<PaperSlide, "children"> & LayoutNodeBase);

type FindingCode = "SHARED_RELATIONSHIP_TARGET_MISSING" | "SHARED_CONTENT_TYPE_DUPLICATE" | "SHARED_CONTENT_TYPE_MISSING" | "SHARED_CONTENT_TYPE_UNEXPECTED" | "SHARED_RID_NOT_UNIQUE" | "SHARED_ZIP_BOMB_DETECTED" | "SHARED_XML_PARSE_FAILURE" | "SHARED_MEDIA_EMBED_MISSING" | "PPTX_NORMAUTOFIT_MISSING_FONTSCALE" | "PPTX_TABLE_CELL_TEXT_OVERFLOW" | "PPTX_CHART_FORMAT_CODE_UNESCAPED" | "PPTX_ELEMENT_POSITION_CASCADE" | "PPTX_CHART_WORKBOOK_MISSING" | "PPTX_CHART_LABEL_COLLISION" | "PPTX_OVERFLOW_BODY_TEXT" | "PPTX_LAYOUT_SHOULD_SPLIT" | "PPTX_FONT_FALLBACK_USED" | "PPTX_VISUAL_FALLBACK_MISSING" | "PPTX_CHART_FALLBACK_MISSING" | "PPTX_SLIDE_ID_NOT_UNIQUE" | "PPTX_SHAPE_ID_NOT_UNIQUE" | "PPTX_CUSTDATALIST_CONFLICT" | "PPTX_ELEMENT_ORDER_VIOLATION" | "PPTX_ANIMATION_REF_BROKEN" | "PPTX_HYPERLINK_DANGLING" | "PPTX_MASTER_REF_UNRESOLVED" | "PPTX_FONT_EMBED_FAILED" | "PPTX_STRUCTURAL_VALIDATION_FAILED" | "DOCX_NUMBERING_DEF_MISSING" | "DOCX_STYLE_REF_MISSING" | "DOCX_SECT_PR_MISSING" | "DOCX_TABLE_WIDTH_MISMATCH" | "DOCX_RUN_SPLIT_FORMATTING_LOSS" | "DOCX_TRACKED_CHANGE_MALFORMED" | "DOCX_HEADING_HIERARCHY_BROKEN" | "DOCX_IMAGE_REF_MISSING" | "DOCX_FONT_FALLBACK_USED" | "DOCX_PARAGRAPH_OVERFLOW" | "DOCX_CONTENT_CONTROL_REF_BROKEN" | "DOCX_RELATIONSHIP_TARGET_MISSING" | "XLSX_SHARED_STRING_INDEX_OOB" | "XLSX_STYLE_INDEX_OOB" | "XLSX_MERGE_OVERLAP" | "XLSX_NAMED_RANGE_DEAD_REF" | "XLSX_CHART_WORKBOOK_MISSING" | "XLSX_FORMULA_CACHED_VALUE_MISSING" | "XLSX_SHEET_NAME_INVALID" | "XLSX_DUPLICATE_SHEET_NAME" | "XLSX_RELATIONSHIP_TARGET_MISSING" | "XLSX_TABLE_RELATIONSHIP_BROKEN" | "XLSX_TABLE_NAME_DUPLICATE" | "XLSX_TABLE_REF_INVALID" | "XLSX_WORKSHEET_DIMENSION_MISMATCH" | "XLSX_RANGE_REF_INVALID" | "XLSX_MERGE_RANGE_OUT_OF_BOUNDS" | "XLSX_HYPERLINK_TARGET_INVALID" | "XLSX_MACRO_STRIPPED" | "XLSX_EXTERNAL_CONNECTION_STRIPPED" | "XLSX_GOOGLE_SHEETS_IMPORT_RISK" | "XLSX_NUMBERS_COMPATIBILITY_WARNING" | "XLSX_HIGH_UNIQUE_STRING_COUNT" | "XLSX_STYLE_CARDINALITY_EXCESSIVE" | "XLSX_STREAM_MODE_RECOMMENDED" | "XLSX_FORMULA_REF_BROKEN" | "XLSX_DATE_BEFORE_1900" | "XLSX_LARGE_FILE_WARNING" | "PDF_XREF_OFFSET_INCORRECT" | "PDF_XREF_ENTRY_ZERO_OFFSET" | "PDF_XREF_TABLE_MISSING" | "PDF_FONT_OBJECT_MISSING" | "PDF_FONT_NOT_EMBEDDED" | "PDF_IMAGE_REFERENCE_MISSING" | "PDF_STREAM_LENGTH_INCORRECT" | "PDF_EOF_MARKER_MISSING" | "PDF_ROOT_OBJECT_INVALID" | "PDF_FONT_SUBSET_INCOMPLETE" | "PDF_SIGNATURE_INVALID" | "PDF_SIGNATURE_MISSING" | "PDF_SIGNATURE_BYTERANGE_INVALID" | "PDF_TIMESTAMP_MISSING" | "PDF_TIMESTAMP_INVALID" | "PDF_PAGE_TREE_COUNT_MISMATCH" | "PDF_TAG_MCID_GAP" | "PDF_SELF_REFERENCE" | "PDF_METADATA_INFO_XMP_MISMATCH" | "PDF_OBJECT_NUMBER_REUSE";
interface RepairEntry {
    strategy: string;
    finding: FindingCode;
    description: string;
    success: boolean;
    slideIndex?: number;
    sheetIndex?: number;
    pageIndex?: number;
}

type PptxOutputMode = "strict_editable" | "editable_preferred" | "visual_safe";
type PptxValidationMode = "none" | "structural" | "desktop_async" | "desktop_blocking";
type PptxRepairMode = "none" | "structural";
type QualityDocumentVerdict = "native_editable" | "editable_with_constraints" | "visual_fallback" | "rejected";
type EditabilityVerdict = "editable" | "editable_with_constraints" | "visual_only";
type QualityRepairRisk = "low" | "medium" | "high";
type TemplateSupportLevel = "certified" | "supported" | "unsafe";
type RepairState = "not_requested" | "not_needed" | "repaired" | "failed";
type DesktopValidationStatus = "not_run" | "passed" | "failed";
type DesktopValidationPlatform = "windows" | "macos" | "linux";
type DesktopValidationBackend = "powerpoint_windows" | "powerpoint_macos" | "libreoffice" | "keynote_macos";
type QualityFindingCode = "OVERFLOW_BODY_TEXT" | "TABLE_TOO_DENSE" | "CHART_LABEL_COLLISION" | "BRAND_TOKEN_MISSING" | "BRAND_FONT_MISMATCH" | "BRAND_COLOR_MISMATCH" | "ASSET_MISSING" | "REQUIRED_LOGO_MISSING" | "UNSUPPORTED_LAYOUT_SELECTION" | "LAYOUT_SHOULD_SPLIT" | "FONT_FALLBACK_USED" | "FONT_SYSTEM_OPT_IN" | "FONT_EMBEDDING_UNAVAILABLE" | "FONT_REQUESTED_FAMILY_NOT_EMBEDDED" | "FONT_MISSING_FACE_VARIANT" | "FONT_COVERAGE_FALLBACK_USED" | "VISUAL_FALLBACK_MISSING" | "CHART_FALLBACK_MISSING" | "NORMAUTOFIT_MISSING_FONTSCALE" | "CHART_FORMAT_CODE_UNESCAPED" | "SLIDE_ID_NOT_UNIQUE" | "CUSTDATALIST_CONFLICT" | "ELEMENT_ORDER_VIOLATION" | "CHART_WORKBOOK_MISSING" | "RELATIONSHIP_TARGET_MISSING" | "RID_NOT_UNIQUE" | "CONTENT_TYPE_DUPLICATE" | "CONTENT_TYPE_MISSING" | "XML_PARSE_FAILURE" | "SHAPE_ID_NOT_UNIQUE" | "STRUCTURAL_VALIDATION_FAILED" | "MASTER_REF_UNRESOLVED" | "ELEMENT_POSITION_CASCADE" | "DESKTOP_VALIDATION_FAILED";
interface QualityFinding {
    code: QualityFindingCode;
    sharedCode?: FindingCode;
    severity: "info" | "warning" | "error";
    message: string;
    slideIndex?: number;
    componentPath?: string;
    category: "layout" | "brand" | "asset" | "chart" | "validation" | "typography";
    blocking: boolean;
    machineFixHint?: string;
    recommendedAction?: string;
    autoFixed?: boolean;
    repairDescription?: string;
}
interface RepairAction {
    id: string;
    description: string;
    file: string;
}
interface RepairSummary {
    state: RepairState;
    actions: RepairAction[];
    initialFailureCount?: number;
    finalFailureCount?: number;
}
interface EngineQualityOptions {
    outputMode?: PptxOutputMode;
    validationMode?: PptxValidationMode;
    maxFallbackLevel?: PptxFallbackLevel;
    desktopValidationId?: string;
    repairMode?: PptxRepairMode;
}
interface SlideFallbackReport {
    level: PptxFallbackLevel;
    reason?: string;
}
interface SlideQualityReport {
    slideIndex: number;
    compatibilityVerdict: PptxCompatibilityMode;
    issues: CompatibilityIssue[];
    fallbackApplied: SlideFallbackReport | null;
    editabilityVerdict: EditabilityVerdict;
    suggestedFix?: string;
    fonts: string[];
    fontSubstitutions: Record<string, string>;
}
interface StructuralValidationCheck {
    id: string;
    passed: boolean;
    severity: "info" | "warning" | "error";
    message: string;
}
interface StructuralValidationSummary {
    status: "not_run" | "pending" | "passed" | "failed";
    checks: StructuralValidationCheck[];
    failureCount: number;
}
interface DesktopValidationCheck {
    id: string;
    passed: boolean;
    severity: "info" | "warning" | "error";
    message: string;
}
interface DesktopValidationSummary {
    status: DesktopValidationStatus;
    available: boolean;
    backend?: DesktopValidationBackend;
    platform?: DesktopValidationPlatform;
    checks: DesktopValidationCheck[];
    failureCount: number;
    details?: string[];
    artifactPaths?: {
        pdfPath?: string;
        savedCopyPath?: string;
        screenshotPath?: string;
    };
    recordUrl?: string;
    recordedAt?: string;
}
interface TemplatePreflightReport {
    templateSupportLevel: TemplateSupportLevel;
    unsafeLayouts: string[];
    placeholderCoverage: number;
    expectedFallbackRisk: QualityRepairRisk;
    missingPlaceholderCount?: number;
}
interface QualityReport {
    verdict: QualityDocumentVerdict;
    requestedOutputMode: PptxOutputMode;
    validationMode: PptxValidationMode;
    maxFallbackLevel: PptxFallbackLevel;
    documentVerdict: QualityDocumentVerdict;
    repairRisk: QualityRepairRisk;
    editabilityScore: number;
    deckScore: number;
    fallbackCount: number;
    findings: QualityFinding[];
    slideReports: SlideQualityReport[];
    desktopValidationId?: string;
    structuralValidation: StructuralValidationSummary;
    desktopValidation?: DesktopValidationSummary;
    templateReport?: TemplatePreflightReport;
    repairSummary: RepairSummary;
    autoFixesApplied: number;
    repairLog: RepairEntry[];
    contractPassed: boolean;
}

interface RepairExecutionResult {
    buffer: Buffer;
    repairSummary: RepairSummary;
    initialValidation: StructuralValidationSummary;
    finalValidation: StructuralValidationSummary;
}

type AgentLayoutWarningCode = "POTENTIAL_OVERFLOW" | "POTENTIAL_CLIP" | "POTENTIAL_UNBREAKABLE_STRING" | "POTENTIAL_TIGHT_WRAP" | "POTENTIAL_CONTAINER_CLIP" | "POTENTIAL_COLLISION" | "POTENTIAL_UNOWNED_COMPARISON";
type AgentLayoutValidationMode = "off" | "warn" | "error";
interface AgentLayoutWarning {
    code: AgentLayoutWarningCode;
    message: string;
    slideIndex: number;
    nodePath: string;
    relatedNodePath?: string;
}

interface PptxInputWarning {
    code: string;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
}

interface PreviewRenderOptions {
    width?: number;
    height?: number;
    scale?: number;
    format?: "png" | "jpeg";
    quality?: number;
}

interface LockedBrandPalette {
    /** Allowed colors as 6-char uppercase hex without leading '#'. */
    allowedColors: ReadonlySet<string>;
    /** Allowed font family names. Substring/prefix matching is applied. */
    allowedFonts: ReadonlySet<string>;
}

type AccessibilitySeverity = "error" | "warning" | "info";
type AccessibilityIssueCode = "document.title_missing" | "document.language_missing" | "image.alt_missing" | "structure.heading_skipped" | "table.header_missing";
type AccessibilityFormat = "pptx" | "docx" | "xlsx" | "pdf";
interface AccessibilityLocation {
    elementPath?: string;
    pageIndex?: number;
    slideIndex?: number;
    sheetName?: string;
}
interface AccessibilityIssue {
    code: AccessibilityIssueCode;
    severity: AccessibilitySeverity;
    message: string;
    location?: AccessibilityLocation;
    suggestedFix?: string;
}
interface AccessibilitySummary {
    errors: number;
    warnings: number;
    infos: number;
}
interface AccessibilityReport$1 {
    valid: boolean;
    summary: AccessibilitySummary;
    issues: AccessibilityIssue[];
    format: AccessibilityFormat;
    standard?: string;
}
interface AccessibilityFix {
    code: AccessibilityIssueCode;
    action: string;
    applied: boolean;
    target?: string;
}
interface AccessibilityRemediationResult$1 {
    reportBefore: AccessibilityReport$1;
    reportAfter: AccessibilityReport$1;
    fixesApplied: AccessibilityFix[];
}

type AccessibilityLevel = "A" | "AA" | "AAA";
type AccessibilityViolationCode = "ALT_TEXT_MISSING" | "EMPTY_ALT_TEXT" | "TABLE_HEADER_MISSING" | "SLIDE_TITLE_MISSING" | "DOC_TITLE_MISSING" | "DOC_LANG_MISSING" | "READING_ORDER_VISUAL_MISMATCH" | "CONTRAST_RATIO";
interface AccessibilityViolation {
    code: AccessibilityViolationCode;
    severity: "error" | "warning";
    message: string;
    slideIndex?: number;
    elementPath?: string;
    remediation: string;
}
interface AccessibilityReport extends AccessibilityReport$1 {
    score: number;
    level: AccessibilityLevel;
    violations: AccessibilityViolation[];
    warnings: AccessibilityViolation[];
    summary: AccessibilitySummary & {
        totalElements: number;
        withAltText: number;
        withoutAltText: number;
        decorativeMarked: number;
        tablesWithHeaders: number;
        tablesWithoutHeaders: number;
        slidesWithTitle: number;
        slidesWithoutTitle: number;
        languageSet: boolean;
        documentTitleSet: boolean;
    };
}

interface AccessibilityRemediationResult extends AccessibilityRemediationResult$1 {
    document: PaperDocument;
    reportBefore: AccessibilityReport;
    reportAfter: AccessibilityReport;
}

interface EnginePdfRenderOptions {
    includeNotes?: boolean;
    onInputWarning?: (warning: PptxInputWarning) => void;
    onProgress?: (slideIndex: number, totalSlides: number) => void;
    pdfA?: "PDF/A-1b" | "PDF/A-2b";
    quality?: "print" | "screen";
    relaxed?: boolean;
    signal?: AbortSignal;
    tagged?: boolean;
}

interface EngineRenderOptions extends EngineQualityOptions {
    /** Produce byte-reproducible output. Defaults to true; set false to retain wall-clock metadata. */
    deterministic?: boolean;
    onInputWarning?: (warning: PptxInputWarning) => void;
    /**
     * Called for each pre-render layout warning (POTENTIAL_OVERFLOW / CLIP /
     * UNBREAKABLE_STRING / COLLISION) detected when input is an AgentDocument.
     */
    onLayoutWarning?: (warning: AgentLayoutWarning) => void;
    /**
     * Pre-render layout validation severity for AgentDocument inputs.
     *   - "warn"  (default) — log warnings via the configured logger.
     *   - "error" — throw AGENT_LAYOUT_VALIDATION_FAILED when any warning fires.
     *   - "off"   — skip validation entirely.
     */
    layoutValidation?: AgentLayoutValidationMode;
    signal?: AbortSignal;
    relaxed?: boolean;
    onProgress?: (slideIndex: number, totalSlides: number) => void;
    /**
     * Optional brand-palette lockdown. When set, the engine validates that
     * every color and font in the document is in the allowed sets BEFORE
     * rendering. Throws PaperError(code="LOCKED_TOKEN_VIOLATION") on the
     * first violation. Omit to disable the check (default).
     */
    lockedBrandPalette?: LockedBrandPalette;
}

/**
 * The public render input shape. Accepts either a fully-constructed
 * PaperDocument or an AgentDocument (auto-detected and compiled via
 * `compileAgentDocument`). `unknown` lets TypeScript callers pass raw
 * JSON without casting.
 */
type RenderInput = PaperDocument | unknown;
type PptxTemplateDocumentInput = Omit<PaperDocument, "template">;
interface RenderExecutionResult {
    pptx: Buffer;
    previews: Buffer[];
    layoutTrees: LayoutNode[];
    qualityReport: QualityReport;
}
/**
 * The module-level PaperEngine.
 *
 * Every method uses the ambient `RenderContext` (from `AsyncLocalStorage`
 * via `contextStorage.run`) when one is set, and falls back to a shared
 * default context when none is. The shared default is convenient for
 * one-off scripts and tests, but for SaaS / concurrent / multi-document
 * callers prefer {@link createEngine} — each instance gets its own
 * `RenderContext` so per-call state (font caches, chart-asset counters,
 * media dedup tables) cannot leak between calls. Without isolation,
 * back-to-back `PaperEngine.render` invocations on chart-heavy decks
 * can produce divergent output even with `setDeterministicMode(true)`.
 *
 * See `tests/determinismInvariant.test.ts` and
 * `tests/concurrentRenderSafety.test.ts` for the invariants this contract
 * guarantees when `createEngine` is used.
 */
declare const PaperEngine: {
    preflight(input: RenderInput, options?: EngineRenderOptions): Promise<QualityReport>;
    validate(buffer: Buffer): Promise<StructuralValidationSummary>;
    repair(buffer: Buffer): Promise<{
        buffer: Buffer;
        actions: RepairAction[];
    }>;
    validateAndRepair(buffer: Buffer): Promise<RepairExecutionResult>;
    /**
     * Render a document to a PPTX Buffer.
     *
     * Accepts either a `PaperDocument` or an `AgentDocument`; agent inputs
     * are auto-detected and compiled via `compileAgentDocument`.
     *
     * For concurrent or SaaS use, call this via {@link createEngine} so
     * each render gets its own `RenderContext`. Direct invocation here
     * uses the shared default context.
     */
    render(input: RenderInput, options?: EngineRenderOptions): Promise<Buffer>;
    renderStream(input: RenderInput, options?: EngineRenderOptions): Promise<Readable>;
    renderWithQualityReport(input: RenderInput, previewOptions?: PreviewRenderOptions, options?: EngineRenderOptions): Promise<RenderExecutionResult>;
    renderWithPreviews(input: RenderInput, previewOptions?: PreviewRenderOptions, options?: EngineRenderOptions): Promise<{
        pptx: Buffer;
        previews: Buffer[];
        layoutTrees: LayoutNode[];
        qualityReport: QualityReport;
    }>;
    renderToImages(input: RenderInput, options?: ImageRenderOptions): Promise<SlideImage[]>;
    renderToImage(input: RenderInput, slideIndex: number, options?: Omit<ImageRenderOptions, "slides" | "onProgress">): Promise<SlideImage>;
    renderToSvgSlides(input: RenderInput, options?: SvgRenderOptions): Promise<SlideSvg[]>;
    renderToSvgSlide(input: RenderInput, slideIndex: number, options?: Omit<SvgRenderOptions, "slides" | "onProgress">): Promise<SlideSvg>;
    renderToPdf(input: RenderInput, options?: EnginePdfRenderOptions): Promise<Buffer>;
    populatePptxTemplate(templateBuffer: Buffer, doc: PptxTemplateDocumentInput, options?: EngineRenderOptions): Promise<Buffer>;
    populatePptxTemplateToPdf(templateBuffer: Buffer, doc: PptxTemplateDocumentInput, options?: EnginePdfRenderOptions): Promise<Buffer>;
    validateAccessibility(input: RenderInput): Promise<AccessibilityReport>;
    remediateAccessibility(input: RenderInput): Promise<AccessibilityRemediationResult>;
};

/**
 * Error phases in the PaperEngine pipeline.
 */
type ErrorPhase = "validation" | "compilation" | "layout" | "typography" | "media" | "chart" | "serialization" | "archive" | "wasm-init" | "font" | "template" | "rendering";
/**
 * Structured error codes for machine-parseable error handling.
 */
type PaperErrorCode = "VALIDATION_FAILED" | "AGENT_INPUT_INVALID" | "AGENT_LAYOUT_VALIDATION_FAILED" | "RESOURCE_LIMIT_EXCEEDED" | "RENDER_CANCELLED" | "WASM_INIT_FAILED" | "FONT_NOT_FOUND" | "PPTX_FONT_EMBEDDING_UNAVAILABLE" | "MEDIA_FETCH_FAILED" | "MEDIA_CORRUPT" | "RENDER_TIMEOUT" | "QUEUE_TIMEOUT" | "QUEUE_FULL" | "COMPATIBILITY_CONTRACT_VIOLATION" | "PPTX_VISUAL_FALLBACK_MISSING" | "PPTX_CHART_FALLBACK_MISSING" | "STRUCTURAL_VALIDATION_FAILED" | "DESKTOP_VALIDATION_FAILED" | "VALIDATION_BACKEND_UNAVAILABLE" | "CANVAS_UNAVAILABLE" | "INVALID_SLIDE_INDEX" | "FEATURE_REQUIRES_UPGRADE" | "REGION_TOO_SMALL" | "CONTENT_PAGINATED" | "CONTENT_CLIPPED" | "REGION_COLLISION" | "LOCKED_TOKEN_VIOLATION";
/**
 * A single structured issue attached to a PaperError. When the error
 * originates from Zod validation, each issue becomes one entry; `path`
 * is the dotted/indexed schema path, and `remediation` is a one-sentence
 * hint for consumers (including LLM agents) on how to self-correct.
 */
interface PaperErrorIssue {
    path: string;
    code?: string;
    message: string;
    expected?: string;
    received?: string;
    remediation?: string;
    /** Slide index (0-based) for layout/composition issues. */
    slideIndex?: number;
    /** Composition-block index within `slide.composition.blocks[]`. */
    blockIndex?: number;
    /** Composition primitive name (e.g. "metricStack", "matrixTable"). */
    primitive?: string;
    /** Actual region dimensions in the input. */
    actual?: {
        colSpan?: number;
        rowSpan?: number;
    };
    /** Recommended minimum dimensions for the offending primitive. */
    minimum?: {
        colSpan?: number;
        rowSpan?: number;
    };
}
/**
 * Base error class for all Runstamp errors. Provides structured fields
 * for programmatic error handling — consumers can switch on `code` or
 * `phase` instead of string-matching error messages.
 *
 * `path` and `remediation` are populated whenever the error can be traced
 * to a specific input location (Zod validation, agent compile). `issues`
 * carries the full list of validation problems when more than one applies.
 */
declare class PaperError extends Error {
    readonly code: PaperErrorCode;
    readonly phase: ErrorPhase;
    readonly slideIndex?: number;
    readonly nodeId?: string;
    readonly path?: string[];
    readonly remediation?: string;
    readonly issues?: PaperErrorIssue[];
    constructor(message: string, opts: {
        code: PaperErrorCode;
        phase: ErrorPhase;
        slideIndex?: number;
        nodeId?: string;
        path?: string[];
        remediation?: string;
        issues?: PaperErrorIssue[];
        cause?: unknown;
    });
}

interface RichTextMetrics {
    width: number;
    height: number;
    lineCount: number;
    maxLineWidth: number;
}
/**
 * Measures rich text runs using UAX#14 segmentation, HarfBuzz shaping,
 * and Knuth-Plass line breaking — the same pipeline used for actual layout.
 *
 * This ensures auto-fit measurements match rendered output.
 */
declare function calculateRichTextMetrics(runs: TextRun[], defaultStyle: TextStyle | undefined, maxWidth?: number): RichTextMetrics;

type AbsoluteLayoutIssueCode = "TEXT_OVERFLOW" | "TEXT_CLIP" | "TEXT_BREAK_ANYWHERE" | "TEXT_WRAP_TIGHT" | "CONTAINER_CHILD_OUT_OF_BOUNDS" | "NODE_COLLISION" | "OUT_OF_BOUNDS" | "TABLE_ROW_COMPRESSED" | "TABLE_OVERFULL" | "CHART_LABEL_COLLISION" | "CHART_LEGEND_COLLISION" | "CHART_ANNOTATION_COLLISION" | "IMAGE_CROP_RISK" | "IMAGE_UPSCALE_RISK" | "IMAGE_ASPECT_RISK" | "REGION_TOO_SMALL" | "CONTENT_PAGINATED" | "CONTENT_CLIPPED" | "REGION_COLLISION";
interface AbsoluteLayoutIssue {
    code: AbsoluteLayoutIssueCode;
    message: string;
    slideIndex: number;
    nodePath: string;
    relatedNodePath?: string;
    rect?: Rect;
    /** Composition-block index within `slide.composition.blocks[]`, when applicable. */
    blockIndex?: number;
    /** Composition primitive name (e.g. "metricStack", "matrixTable"), when applicable. */
    primitive?: string;
    /** Actual region dimensions reported in the input, when applicable. */
    actual?: {
        colSpan?: number;
        rowSpan?: number;
    };
    /** Recommended minimum region dimensions for this primitive, when applicable. */
    minimum?: {
        colSpan?: number;
        rowSpan?: number;
    };
    /** Human-readable, action-oriented hint for self-correction. */
    remediation?: string;
}
interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}
declare function validateAbsoluteSlideLayout(slide: PaperSlide, slideIndex: number, slideSize: {
    width: number;
    height: number;
}): AbsoluteLayoutIssue[];
declare function validateAbsoluteDocumentLayout(document: PaperDocument): AbsoluteLayoutIssue[];

// Type definitions for JSZip 3.1
// Project: http://stuk.github.com/jszip/, https://github.com/stuk/jszip
// Definitions by: mzeiher <https://github.com/mzeiher>, forabi <https://github.com/forabi>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3


interface JSZipSupport {
    arraybuffer: boolean;
    uint8array: boolean;
    blob: boolean;
    nodebuffer: boolean;
}

type Compression = 'STORE' | 'DEFLATE';

/**
 * Depends on the compression type. With `STORE` (no compression), these options are ignored. With
 * `DEFLATE`, you can give the compression level between 1 (best speed) and 9 (best compression).
 */
interface CompressionOptions {
    level: number;
}

interface InputByType {
    base64: string;
    string: string;
    text: string;
    binarystring: string;
    array: number[];
    uint8array: Uint8Array;
    arraybuffer: ArrayBuffer;
    blob: Blob;
    stream: NodeJS.ReadableStream;
}

interface OutputByType {
    base64: string;
    string: string;
    text: string;
    binarystring: string;
    array: number[];
    uint8array: Uint8Array;
    arraybuffer: ArrayBuffer;
    blob: Blob;
    nodebuffer: Buffer;
}

// This private `_data` property on a JSZipObject uses this interface.
// If/when it is made public this should be uncommented.
// interface CompressedObject {
//     compressedSize: number;
//     uncompressedSize: number;
//     crc32: number;
//     compression: object;
//     compressedContent: string|ArrayBuffer|Uint8Array|Buffer;
// }

type InputFileFormat = InputByType[keyof InputByType] | Promise<InputByType[keyof InputByType]>;

declare namespace JSZip {
    type InputType = keyof InputByType;

    type OutputType = keyof OutputByType;

    interface JSZipMetadata {
        percent: number;
        currentFile: string | null;
    }

    type OnUpdateCallback = (metadata: JSZipMetadata) => void;

    interface JSZipObject {
        name: string;
        /**
         * Present for files loadded with `loadAsync`. May contain ".." path components that could
         * result in a zip-slip attack. See https://snyk.io/research/zip-slip-vulnerability
         */
        unsafeOriginalName?: string;
        dir: boolean;
        date: Date;
        comment: string;
        /** The UNIX permissions of the file, if any. */
        unixPermissions: number | string | null;
        /** The UNIX permissions of the file, if any. */
        dosPermissions: number | null;
        options: JSZipObjectOptions;

        /**
         * Prepare the content in the asked type.
         * @param type the type of the result.
         * @param onUpdate a function to call on each internal update.
         * @return Promise the promise of the result.
         */
        async<T extends OutputType>(type: T, onUpdate?: OnUpdateCallback): Promise<OutputByType[T]>;
        nodeStream(type?: 'nodebuffer', onUpdate?: OnUpdateCallback): NodeJS.ReadableStream;
    }

    interface JSZipFileOptions {
        /** Set to `true` if the data is `base64` encoded. For example image data from a `<canvas>` element. Plain text and HTML do not need this option. */
        base64?: boolean;
        /**
         * Set to `true` if the data should be treated as raw content, `false` if this is a text. If `base64` is used,
         * this defaults to `true`, if the data is not a `string`, this will be set to `true`.
         */
        binary?: boolean;
        /**
         * The last modification date, defaults to the current date.
         */
        date?: Date;
        /**
         * Sets per file compression. The `compressionOptions` parameter depends on the compression type.
         */
        compression?: Compression;
        /**
         * Sets per file compression level for `DEFLATE` compression.
         */
        compressionOptions?: null | CompressionOptions;
        comment?: string;
        /** Set to `true` if (and only if) the input is a "binary string" and has already been prepared with a `0xFF` mask. */
        optimizedBinaryString?: boolean;
        /** Set to `true` if folders in the file path should be automatically created, otherwise there will only be virtual folders that represent the path to the file. */
        createFolders?: boolean;
        /** Set to `true` if this is a directory and content should be ignored. */
        dir?: boolean;

        /** 6 bits number. The DOS permissions of the file, if any. */
        dosPermissions?: number | null;
        /**
         * 16 bits number. The UNIX permissions of the file, if any.
         * Also accepts a `string` representing the octal value: `"644"`, `"755"`, etc.
         */
        unixPermissions?: number | string | null;
    }

    interface JSZipObjectOptions {
        compression: Compression;
    }

    interface JSZipGeneratorOptions<T extends OutputType = OutputType> {
        /**
         * Sets compression option for all entries that have not specified their own `compression` option
         */
        compression?: Compression;
        /**
         * Sets compression level for `DEFLATE` compression.
         */
        compressionOptions?: null | CompressionOptions;
        type?: T;
        comment?: string;
        /**
         * mime-type for the generated file.
         * Useful when you need to generate a file with a different extension, ie: “.ods”.
         * @default 'application/zip'
         */
        mimeType?: string;
        encodeFileName?(filename: string): string;
        /** Stream the files and create file descriptors */
        streamFiles?: boolean;
        /** DOS (default) or UNIX */
        platform?: 'DOS' | 'UNIX';
    }

    interface JSZipLoadOptions {
        base64?: boolean;
        checkCRC32?: boolean;
        optimizedBinaryString?: boolean;
        createFolders?: boolean;
        decodeFileName?: (bytes: string[] | Uint8Array | Buffer) => string;
    }

    type DataEventCallback<T> = (dataChunk: T, metadata: JSZipMetadata) => void
    type EndEventCallback = () => void
    type ErrorEventCallback = (error: Error) => void

    interface JSZipStreamHelper<T> {
        /**
         * Register a listener on an event
         */
        on(event: 'data', callback: DataEventCallback<T>): this;
        on(event: 'end', callback: EndEventCallback): this;
        on(event: 'error', callback: ErrorEventCallback): this;

        /**
         * Read the whole stream and call a callback with the complete content
         *
         * @param updateCallback The function called every time the stream updates
         * @return A Promise of the full content
         */
        accumulate(updateCallback?: (metadata: JSZipMetadata) => void): Promise<T>;

        /**
         * Resume the stream if the stream is paused. Once resumed, the stream starts sending data events again
         *
         * @return The current StreamHelper object, for chaining
         */
        resume(): this;

        /**
         * Pause the stream if the stream is running. Once paused, the stream stops sending data events
         *
         * @return The current StreamHelper object, for chaining
         */
        pause(): this;
    }
}

interface JSZip {
    files: {[key: string]: JSZip.JSZipObject};

    /**
     * Get a file from the archive
     *
     * @param Path relative path to file
     * @return File matching path, null if no file found
     */
    file(path: string): JSZip.JSZipObject | null;

    /**
     * Get files matching a RegExp from archive
     *
     * @param path RegExp to match
     * @return Return all matching files or an empty array
     */
    file(path: RegExp): JSZip.JSZipObject[];

    /**
     * Add a file to the archive
     *
     * @param path Relative path to file
     * @param data Content of the file
     * @param options Optional information about the file
     * @return JSZip object
     */
    file<T extends JSZip.InputType>(path: string, data: InputByType[T] | Promise<InputByType[T]>, options?: JSZip.JSZipFileOptions): this;
    file<T extends JSZip.InputType>(path: string, data: null, options?: JSZip.JSZipFileOptions & { dir: true }): this;

    /**
     * Returns an new JSZip instance with the given folder as root
     *
     * @param name Name of the folder
     * @return New JSZip object with the given folder as root or null
     */
    folder(name: string): JSZip | null;

    /**
     * Returns new JSZip instances with the matching folders as root
     *
     * @param name RegExp to match
     * @return New array of JSZipFile objects which match the RegExp
     */
    folder(name: RegExp): JSZip.JSZipObject[];

    /**
     * Call a callback function for each entry at this folder level.
     *
     * @param callback function
     */
    forEach(callback: (relativePath: string, file: JSZip.JSZipObject) => void): void;

    /**
     * Get all files which match the given filter function
     *
     * @param predicate Filter function
     * @return Array of matched elements
     */
    filter(predicate: (relativePath: string, file: JSZip.JSZipObject) => boolean): JSZip.JSZipObject[];

    /**
     * Removes the file or folder from the archive
     *
     * @param path Relative path of file or folder
     * @return Returns the JSZip instance
     */
    remove(path: string): JSZip;

    /**
     * Generates a new archive asynchronously
     *
     * @param options Optional options for the generator
     * @param onUpdate The optional function called on each internal update with the metadata.
     * @return The serialized archive
     */
    generateAsync<T extends JSZip.OutputType>(options?: JSZip.JSZipGeneratorOptions<T>, onUpdate?: JSZip.OnUpdateCallback): Promise<OutputByType[T]>;

    /**
     * Generates a new archive asynchronously
     *
     * @param options Optional options for the generator
     * @param onUpdate The optional function called on each internal update with the metadata.
     * @return A Node.js `ReadableStream`
     */
    generateNodeStream(options?: JSZip.JSZipGeneratorOptions<'nodebuffer'>, onUpdate?: JSZip.OnUpdateCallback): NodeJS.ReadableStream;

    /**
     * Generates the complete zip file with the internal stream implementation
     *
     * @param options Optional options for the generator
     * @return a StreamHelper
     */
    generateInternalStream<T extends JSZip.OutputType>(options?: JSZip.JSZipGeneratorOptions<T>): JSZip.JSZipStreamHelper<OutputByType[T]>;

    /**
     * Deserialize zip file asynchronously
     *
     * @param data Serialized zip file
     * @param options Options for deserializing
     * @return Returns promise
     */
    loadAsync(data: InputFileFormat, options?: JSZip.JSZipLoadOptions): Promise<JSZip>;

    /**
     * Create JSZip instance
     */
    new(): this;

    (): JSZip;

    prototype: JSZip;
    support: JSZipSupport;
    external: {
        Promise: PromiseConstructorLike;
    };
    version: string;
}

declare var JSZip: JSZip;

interface ThemeData {
    colorScheme: Record<string, string>;
    fontScheme: {
        majorLatin: string;
        minorLatin: string;
        majorEa?: string;
        minorEa?: string;
    };
}
/**
 * Tests whether a color value is a known OOXML scheme color token or a ColorModifier object.
 */
declare function isSchemeColor(color: string | {
    scheme: string;
}): boolean;
/**
 * Resolves a color value to either an sRGB hex or a scheme reference.
 */
declare function resolveColor(color: string): {
    type: "srgb" | "scheme";
    value: string;
};
/**
 * Emits the OOXML XML for a color value.
 * Accepts plain hex strings, scheme color tokens, and ColorModifier objects
 * with tint/shade/lumMod/lumOff/satMod modifiers.
 */
declare function emitColorXml(color: string | {
    scheme: string;
    [key: string]: unknown;
}): string;

/**
 * Resolves a PlaceholderTextStyle by querying a 3-tier cascade:
 *   Tier 1: Layout placeholder text style (most specific)
 *   Tier 2: Master text styles (titleStyle / bodyStyle / otherStyle)
 *   Tier 3: Theme font scheme (least specific)
 *
 * Each property uses the first defined value across the tiers.
 */
declare function resolveTextStyle(placeholderType: string | undefined, layoutStyle: PlaceholderTextStyle | undefined, masterStyles: MasterTextStyles | undefined, theme: ThemeData): PlaceholderTextStyle;
/**
 * Parses a theme XML string to extract the color and font schemes.
 * Uses fast-xml-parser for robust OOXML handling.
 */
declare function parseThemeXml(themeXml: string): ThemeData;

interface PlaceholderTextStyle {
    fontFamily?: string;
    fontFamilyEa?: string;
    fontSize?: number;
    lineSpacing?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    bulletChar?: string;
}
interface PlaceholderInfo {
    idx?: string;
    type?: string;
    x: number;
    y: number;
    cx: number;
    cy: number;
    textStyle?: PlaceholderTextStyle;
}
interface MasterTextStyles {
    titleStyle?: PlaceholderTextStyle;
    bodyStyle?: PlaceholderTextStyle;
    otherStyle?: PlaceholderTextStyle;
}
interface SlideMasterInfo {
    xml: string;
    rels: string;
    textStyles: MasterTextStyles;
    /** Index into the TemplateIndex.themes array (0-based). */
    themeIndex: number;
}
interface LayoutInfo {
    name: string;
    xml: string;
    rels: string;
    placeholders: PlaceholderInfo[];
    /** Index into TemplateIndex.slideMasters (0-based). */
    masterIndex: number;
}
interface TemplateIndex {
    contentTypesXml: string;
    /** Primary theme (first master's theme). Backward-compat alias for themes[0].data. */
    theme: ThemeData;
    /** Primary theme XML. Backward-compat alias for themes[0].xml. */
    themeXml: string;
    /** Primary slide master XML. Backward-compat alias for slideMasters[0].xml. */
    slideMasterXml: string;
    /** Primary slide master rels. Backward-compat alias for slideMasters[0].rels. */
    slideMasterRels: string;
    layouts: LayoutInfo[];
    /** Primary master text styles. Backward-compat alias for slideMasters[0].textStyles. */
    masterTextStyles: MasterTextStyles;
    globalRels: string;
    presentationXml: string;
    presentationRels: string;
    /** Slide width in pixels, parsed from template's presentation.xml <p:sldSz>. Defaults to 960. */
    slideWidth: number;
    /** Slide height in pixels, parsed from template's presentation.xml <p:sldSz>. Defaults to 540. */
    slideHeight: number;
    zip: JSZip;
    /** All slide masters in the template (ordered by file index). */
    slideMasters: SlideMasterInfo[];
    /** All themes in the template (ordered by file index). */
    themes: Array<{
        data: ThemeData;
        xml: string;
    }>;
}
/**
 * Parses a PPTX template buffer and extracts its structural index.
 */
declare function parseTemplate(buffer: Buffer): Promise<TemplateIndex>;

export { PaperEngine, PaperError, calculateRichTextMetrics, computeAutoFit, emitColorXml, isSchemeColor, parseTemplate, parseThemeXml, resolveColor, resolveTextStyle, traverseAST, validateAbsoluteDocumentLayout, validateAbsoluteSlideLayout };
export type { AbsoluteLayoutIssue, AbsoluteLayoutIssueCode, AccessibilityConfig, AccessibilityLevel$1 as AccessibilityLevel, AccessibilityRemediationResult, ActionButtonShape, AnimationBuild, AnimationBuildGrouping, AnimationDirection, AnimationEasing, AnimationEffect, AnimationGroup, AnimationIntent, AnimationTrigger, AnimationType, AreaGrouping, ArrowCalloutShape, ArrowHeadConfig, ArrowHeadSize, ArrowHeadType, ArrowShape, AutoFitResult, AutoNumScheme, BarGrouping, BasicShape, BevelConfig, BevelPreset, BoxWhiskerData, BracketBraceShape, BulletAutoNum, BulletChar, BulletConfig, BulletNone, CalloutShape, CameraPreset, ChartAnimation, ChartAnnotation, ChartAreaStyle, ChartAxisConfig, ChartCategoryAnchor, ChartData, ChartDataLabels, ChartDataTable, ChartGridlines, ChartSeries, ChartTargetLineAnnotation, ChartTextAnnotation, ChartTrendArrowAnnotation, ChartType, ColorModifier, ColorValue, ConnectorPoint, ConnectorShape, ConnectorShapeRef, ConnectorType, CustomGeometry, CustomGeometryPath, CustomProperty, CustomShow, DiagramConfig, DiagramItem, DiagramStyle, Dimension, DocumentProtection, DropShadow, Effects, EnginePdfRenderOptions, EngineRenderOptions, ErrorBarsConfig, ErrorPhase, Fill, FlexStyle, FlowchartShape, FontEmbedConfig, FontStrategy, FunnelData, Glow, GradientBackground, GradientFill, GradientStop, HeaderFooter, HistogramData, HyperlinkTarget, ImageBackground, ImageCrop, ImageEffects, ImageFill, ImageFormat, ImageRenderOptions, InnerShadow, LayoutInfo, LightRigDirection, LightRigType, LineGrouping, MarkerConfig, MarkerSymbol, MasterTextStyles, MaterialPreset, MathShape, MediaPlaybackOptions, MotionPath, MotionPathType, PaperAudio, PaperChart, PaperConnector, PaperDocument, PaperErrorCode, PaperGroup, PaperImage, PaperNode, PaperSlide, PaperTable, PaperText, PaperVideo, PaperView, Paragraph, PathCommand, PatternBackground, PatternFill, PatternType, PlaceholderInfo, PlaceholderRef, PlaceholderTextStyle, PlaceholderType, PptxTemplateDocumentInput, PrintSettings, Reflection, RichTextMetrics, Scene3D, ShapeLocks, ShapeType, SlideBackground, SlideComment, SlideImage, SlideLayoutConfig, SlideMasterConfig, SlideMasterInfo, SlideSection, SlideSize, SlideSvg, SlideTransition, SoftEdge, SolidBackground, SolidFill, Sp3D, StarShape, StockData, SunburstData, SvgRenderOptions, TabAlignType, TabShape, TabStop, TableCell, TableCellBorder, TableCellBorders, TableCellStyle, TableData, TableRow, TableRowLayoutPolicy, TableStyle, TemplateIndex, TextFitConfig, TextFitPolicy, TextInsets, TextRun, TextRunStyle, TextStyle, TextWarpPreset, ThemeColorScheme, ThemeConfig, ThemeData, ThemeFontScheme, TransitionDirection, TransitionType, TreemapCategory, TreemapData, TrendlineConfig, WaterfallData, XYDataPoint, XYSeries };
