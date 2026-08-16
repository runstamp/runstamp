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
type AccessibilityLevel = "A" | "AA" | "AAA";
interface AccessibilityConfig {
    level: AccessibilityLevel;
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

interface AutoFitResult {
    fontScale: number;
    lnSpcReduction: number;
    overflow: boolean;
    measuredHeight?: number;
    lineCount?: number;
}

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
type VisualNode = {
    type: string;
    style?: {
        backgroundColor?: unknown;
        fill?: unknown;
        effects?: unknown;
        borderWidth?: number;
    };
    shapeType?: unknown;
    customGeometry?: unknown;
    textContent?: unknown;
    textParagraphs?: unknown[];
    hyperlink?: unknown;
    altText?: unknown;
    decorative?: boolean;
    locks?: unknown;
};
declare function hasVisualProperties(node: VisualNode): boolean;

interface SlideCompatibilityReport {
    slideIndex: number;
    compatibilityVerdict: PptxCompatibilityMode;
    fallbackReason?: string;
    issues: CompatibilityIssue[];
    fontSubstitutions: Record<string, string>;
    fonts: string[];
    pixelGateEligible: boolean;
}
interface DocumentCompatibilityReport {
    compatibilityVerdict: PptxCompatibilityMode;
    slides: SlideCompatibilityReport[];
    fontSubstitutions: Record<string, string>;
    pixelGateEligible: boolean;
}

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
declare function compatibilityModeToFallbackLevel(mode: PptxCompatibilityMode): PptxFallbackLevel;
declare function getDefaultMaxFallbackLevel(outputMode?: PptxOutputMode): PptxFallbackLevel;
declare function resolveQualityOptions(options?: EngineQualityOptions): Required<EngineQualityOptions>;
declare function buildQualityReport(compatibility: DocumentCompatibilityReport, options?: EngineQualityOptions, extras?: {
    structuralValidation?: StructuralValidationSummary;
    desktopValidation?: DesktopValidationSummary;
    templateReport?: TemplatePreflightReport;
    repairSummary?: RepairSummary;
}): QualityReport;
declare function mergeDesktopValidationIntoQualityReport(report: QualityReport, desktopValidation: DesktopValidationSummary, overrides?: {
    validationMode?: PptxValidationMode;
    desktopValidationId?: string;
}): QualityReport;
declare function assertQualityContract(report: QualityReport): void;

declare function validatePptxStructure(buffer: Buffer): Promise<StructuralValidationSummary>;

interface RepairExecutionResult {
    buffer: Buffer;
    repairSummary: RepairSummary;
    initialValidation: StructuralValidationSummary;
    finalValidation: StructuralValidationSummary;
}
declare function repairPptxStructure(buffer: Buffer): Promise<{
    buffer: Buffer;
    actions: RepairAction[];
}>;
declare function validateAndRepairPptx(buffer: Buffer): Promise<RepairExecutionResult>;

interface PackageDiffIssue {
    path: string;
    type: "added" | "removed" | "modified";
}
interface PackageDiffReport {
    passed: boolean;
    issues: PackageDiffIssue[];
}
declare function diffNormalizedPackages(original: Buffer, candidate: Buffer): Promise<PackageDiffReport>;

type ChangeKind = "added" | "removed" | "modified" | "moved";
type ChangeSeverity = "major" | "minor" | "cosmetic";
interface Change {
    type: ChangeKind;
    path: string;
    description: string;
    before?: unknown;
    after?: unknown;
    severity: ChangeSeverity;
}
interface DiffStatistics {
    added: number;
    removed: number;
    modified: number;
    moved: number;
}
interface ChangeSet {
    changes: Change[];
    summary: string;
    statistics: DiffStatistics;
}
interface DiffOptions {
    includeSummary?: boolean;
}

declare function diffDocuments(before: PaperDocument, after: PaperDocument, options?: DiffOptions): ChangeSet;

type DesktopValidationWorkerStatus = "queued" | "running" | "passed" | "failed" | "worker_failed" | "timeout" | "unavailable";
interface DesktopValidationArtifactPaths {
    generatedPptxPath?: string;
    pdfPath?: string;
    savedCopyPath?: string;
    screenshotPath?: string;
}
interface DesktopValidationExportRecord {
    attempted: boolean;
    succeeded: boolean;
    artifactPath?: string;
    pageCount?: number;
    errors: string[];
}
interface DesktopValidationSavedCopyRecord {
    attempted: boolean;
    succeeded: boolean;
    artifactPath?: string;
    normalizedPackageDiffPassed?: boolean;
    errors: string[];
}
interface DesktopValidationRecord {
    id: string;
    contentHash: string;
    backend: DesktopValidationBackend;
    platform: DesktopValidationPlatform;
    workerVersion?: string;
    status: DesktopValidationWorkerStatus;
    requestedAt: string;
    completedAt?: string;
    opened: boolean;
    repairDialogDetected: boolean;
    pdfExport: DesktopValidationExportRecord;
    savedCopy: DesktopValidationSavedCopyRecord;
    checks: DesktopValidationCheck[];
    artifactPaths: DesktopValidationArtifactPaths;
    details: string[];
}
declare function computeDesktopValidationContentHash(buffer: Buffer): string;
declare function desktopValidationRecordToSummary(record: DesktopValidationRecord, options?: {
    recordUrl?: string;
}): DesktopValidationSummary;

type PptxEditableComponentKind = "native_chart" | "native_table" | "native_bullet_paragraph" | "native_connector" | "preset_geometry" | "picture";
interface PptxEditableComponentProbe {
    slideIndex: number;
    kind: PptxEditableComponentKind;
    count: number;
    native: boolean;
}
interface PptxSlideEditabilityProbe {
    slideIndex: number;
    nativeChartCount: number;
    nativeTableCount: number;
    nativeBulletParagraphCount: number;
    nativeConnectorCount: number;
    presetGeometryCount: number;
    pictureCount: number;
    components: PptxEditableComponentProbe[];
}
interface PptxEditabilityProbeReport {
    status: "passed" | "failed";
    slideCount: number;
    nativeComponentCount: number;
    visualOnlyComponentCount: number;
    slides: PptxSlideEditabilityProbe[];
    failures: string[];
}
interface QualityReportWithEditabilityProbe extends QualityReport {
    editabilityProbe?: PptxEditabilityProbeReport;
}
declare function inspectPptxEditability(buffer: Buffer): Promise<PptxEditabilityProbeReport>;
declare function mergeEditabilityProbeIntoQualityReport(report: QualityReport, editabilityProbe: PptxEditabilityProbeReport): QualityReportWithEditabilityProbe;

type ChartFamily = "classic" | "chartex" | "unknown";
type ChartEditabilitySupport = "supported" | "unsupported";
interface ChartInventoryItem {
    slideIndex: number;
    chartPart: string;
    family: ChartFamily;
    kind: string;
    embeddedWorkbook: boolean;
    workbookPaths: string[];
    editabilitySupport: ChartEditabilitySupport;
}
interface ChartInventory {
    hasCharts: boolean;
    totalCount: number;
    supportedCount: number;
    unsupportedCount: number;
    items: ChartInventoryItem[];
}
declare function inspectChartInventory(buffer: Buffer): Promise<ChartInventory>;

export { assertQualityContract, buildQualityReport, compatibilityModeToFallbackLevel, computeDesktopValidationContentHash, desktopValidationRecordToSummary, diffDocuments, diffNormalizedPackages, getDefaultMaxFallbackLevel, hasVisualProperties, inspectChartInventory, inspectPptxEditability, mergeDesktopValidationIntoQualityReport, mergeEditabilityProbeIntoQualityReport, repairPptxStructure, resolveQualityOptions, validateAndRepairPptx, validatePptxStructure };
export type { Change, ChangeSet, ChartEditabilitySupport, ChartFamily, ChartInventory, ChartInventoryItem, CompatibilityIssue, CompatibilityIssueClass, DesktopValidationArtifactPaths, DesktopValidationBackend, DesktopValidationCheck, DesktopValidationExportRecord, DesktopValidationPlatform, DesktopValidationRecord, DesktopValidationSavedCopyRecord, DesktopValidationStatus, DesktopValidationSummary, DesktopValidationWorkerStatus, DiffOptions, EditabilityVerdict, EngineQualityOptions, InternalAutoFitPolicy, LayoutCompatibilityMeta, LayoutRuntimeProps, PackageDiffIssue, PackageDiffReport, PptxCompatibilityMode, PptxEditabilityProbeReport, PptxEditableComponentKind, PptxEditableComponentProbe, PptxFallbackLevel, PptxOutputMode, PptxRepairMode, PptxSlideEditabilityProbe, PptxValidationMode, QualityDocumentVerdict, QualityFinding, QualityFindingCode, QualityRepairRisk, QualityReport, QualityReportWithEditabilityProbe, RepairAction, RepairState, RepairSummary, SlideFallbackReport, SlideQualityReport, StructuralValidationCheck, StructuralValidationSummary, TemplatePreflightReport, TemplateSupportLevel, TextCompositionMode };
