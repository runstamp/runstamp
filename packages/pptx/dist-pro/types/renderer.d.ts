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
type ImageFormat = "png" | "jpeg";
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

interface RenderOptions {
    /** Canvas width in CSS pixels (default 960) */
    width?: number;
    /** Canvas height in CSS pixels (default 540) */
    height?: number;
    /** DPR scale factor (default 2 → 1920×1080 actual pixels) */
    scale?: number;
    /** Theme color scheme for resolving scheme tokens */
    themeColors?: ThemeColorScheme;
    /** Output format — 'png' (default) or 'jpeg'. */
    format?: ImageFormat;
    /** JPEG quality 0–100 (default 85). Ignored for PNG. */
    quality?: number;
    /** Override slide background with a solid hex color. */
    backgroundOverride?: string;
}
/** Distinguish an unavailable optional canvas capability from a render defect. */
declare function isOptionalCanvasUnavailable(error: unknown): boolean;
/**
 * Render a single slide LayoutNode tree to a PNG buffer.
 * Uses @napi-rs/canvas (dynamic import — stays optional peer dep).
 * Returns `undefined` if canvas is unavailable or rendering fails.
 */
declare function renderSlideToBuffer(slideNode: LayoutNode, options?: RenderOptions): Promise<Buffer | undefined>;
/**
 * Render all slide LayoutNode trees to PNG buffers.
 * Returns `undefined` if canvas is unavailable or rendering fails.
 */
declare function renderAllSlidesToBuffers(slideNodes: LayoutNode[], options?: RenderOptions): Promise<Buffer[] | undefined>;
/**
 * Render a single slide LayoutNode tree to a SlideImage.
 * Supports PNG and JPEG output with configurable quality.
 * Returns `undefined` if @napi-rs/canvas is unavailable.
 * Throws on render failure (unlike renderSlideToBuffer which swallows errors).
 */
declare function renderSlideToImage(slideNode: LayoutNode, slideIndex: number, options?: RenderOptions): Promise<SlideImage | undefined>;
/**
 * Render multiple slide LayoutNode trees to SlideImage[].
 * Each entry in slideIndices maps to the corresponding slideNode.
 * Returns `undefined` if @napi-rs/canvas is unavailable.
 */
declare function renderSlidesToImages(slideNodes: LayoutNode[], slideIndices: number[], options?: RenderOptions): Promise<SlideImage[] | undefined>;

export { isOptionalCanvasUnavailable, renderAllSlidesToBuffers, renderSlideToBuffer, renderSlideToImage, renderSlidesToImages };
export type { RenderOptions };
