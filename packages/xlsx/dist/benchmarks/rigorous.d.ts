interface BenchmarkStats {
    p50: number;
    p95: number;
    max: number;
}
interface Phase1BenchmarkResult {
    name: string;
    stats: BenchmarkStats;
    rowsPerSecond: number;
    cellsPerSecond: number;
    fileSizeBytes: number;
    rssDeltaBytes: number;
}

interface SpreadsheetRenderStageMetrics$1 {
    worksheetSerializationTimeMs: number;
    stylesSerializationTimeMs: number;
    sharedStringsSerializationTimeMs: number;
    packageSerializationTimeMs: number;
    archiveFinalizationTimeMs: number;
}
interface SpreadsheetRenderKeyPartBytes$1 {
    sheet1XmlBytes: number;
    stylesXmlBytes: number;
    sharedStringsXmlBytes: number;
    zipBytes: number;
    sheet1XmlCompressedBytes?: number;
    stylesXmlCompressedBytes?: number;
    sharedStringsXmlCompressedBytes?: number;
    sheet1XmlZipContributionBytes?: number;
    stylesXmlZipContributionBytes?: number;
    sharedStringsXmlZipContributionBytes?: number;
    otherZipContributionBytes?: number;
}
interface Phase2BenchmarkDiagnostics {
    bottleneck?: "serializer-bound" | "archive-bound" | "mixed";
    classification?: "active-performance-debt" | "benchmark-target-mismatch-candidate";
    payloadDominantPart?: "worksheet" | "styles" | "sharedStrings" | "other";
    practicalFloorGapBytes?: number;
    keyPartBytes?: SpreadsheetRenderKeyPartBytes$1;
    stageMetrics?: SpreadsheetRenderStageMetrics$1;
    stylePart?: {
        bytes: number;
        componentCounts: {
            numFmts: number;
            fonts: number;
            fills: number;
            borders: number;
            cellXfs: number;
            dxfs: number;
        };
        bytesPerCellXf: number;
        bytesPerStyleComponent: number;
    };
}

interface SpreadsheetInputWarning {
    code: string;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
}

interface SpreadsheetMeta {
    title?: string;
    language?: string;
    creator?: string;
    company?: string;
    created?: Date;
    modified?: Date;
    description?: string;
    category?: string;
    keywords?: string[];
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
type AccessibilityLevel = "A" | "AA" | "AAA";
interface AccessibilityConfigBase {
    title?: string;
    language?: string;
}
interface AccessibilityConfig extends AccessibilityConfigBase {
    level: AccessibilityLevel;
    autoAltText?: boolean;
    enforceHeadingHierarchy?: boolean;
    enforceTableHeaders?: boolean;
}
interface SpreadsheetDefaults {
    font?: {
        family: string;
        size: number;
    };
    columnWidth?: number;
    rowHeight?: number;
}
interface SpreadsheetFontStyle {
    family?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean | "single" | "double" | "singleAccounting" | "doubleAccounting";
    strikethrough?: boolean;
    color?: string;
    vertAlign?: "superscript" | "subscript";
    charset?: number;
}
type SpreadsheetPatternType = "none" | "solid" | "darkGray" | "mediumGray" | "lightGray" | "gray125" | "gray0625" | "darkHorizontal" | "darkVertical" | "darkDown" | "darkUp" | "darkGrid" | "darkTrellis" | "lightHorizontal" | "lightVertical" | "lightDown" | "lightUp" | "lightGrid" | "lightTrellis";
interface SpreadsheetFillStyle {
    color?: string;
    type?: "solid" | "pattern";
    fgColor?: string;
    bgColor?: string;
    patternType?: SpreadsheetPatternType;
}
type SpreadsheetBorderLineStyle = "thin" | "medium" | "thick" | "double" | "dotted" | "dashed" | "dashDot" | "dashDotDot" | "hair" | "mediumDashed" | "mediumDashDot" | "mediumDashDotDot" | "slantDashDot";
interface SpreadsheetBorderEdge {
    style: SpreadsheetBorderLineStyle;
    color?: string;
}
interface SpreadsheetBorderDiagonal extends SpreadsheetBorderEdge {
    direction?: "up" | "down" | "both";
}
interface SpreadsheetBorderStyle {
    top?: SpreadsheetBorderEdge;
    bottom?: SpreadsheetBorderEdge;
    left?: SpreadsheetBorderEdge;
    right?: SpreadsheetBorderEdge;
    diagonal?: SpreadsheetBorderDiagonal;
}
interface SpreadsheetAlignmentStyle {
    horizontal?: "left" | "center" | "right" | "fill" | "justify" | "centerContinuous" | "distributed" | "general";
    vertical?: "top" | "center" | "bottom" | "justify" | "distributed";
    wrapText?: boolean;
    textRotation?: number;
    indent?: number;
    shrinkToFit?: boolean;
    readingOrder?: 0 | 1 | 2;
}
interface SpreadsheetProtectionStyle {
    locked?: boolean;
    hidden?: boolean;
}
interface SpreadsheetCellStyle {
    preset?: string;
    numberFormat?: string;
    font?: SpreadsheetFontStyle;
    fill?: SpreadsheetFillStyle;
    border?: SpreadsheetBorderStyle;
    alignment?: SpreadsheetAlignmentStyle;
    protection?: SpreadsheetProtectionStyle;
}
type SpreadsheetCellStyleInput = string | SpreadsheetCellStyle;
interface SpreadsheetRichTextRun {
    text: string;
    font?: SpreadsheetFontStyle;
}
type SpreadsheetRichTextValue = SpreadsheetRichTextRun[];
type SpreadsheetErrorCode = "#NULL!" | "#DIV/0!" | "#VALUE!" | "#REF!" | "#NAME?" | "#NUM!" | "#N/A" | "#GETTING_DATA" | "#SPILL!" | "#CALC!" | "#FIELD!" | "#BLOCKED!" | "#UNKNOWN!" | "#CONNECT!";
interface SpreadsheetErrorValue {
    error: SpreadsheetErrorCode;
}
type CellValue = string | number | boolean | Date | null | SpreadsheetRichTextValue | SpreadsheetErrorValue;
interface SpreadsheetCellComment {
    author?: string;
    text: string;
}
interface SpreadsheetCellFormula {
    expression: string;
    cachedValue?: CellValue;
    arrayRange?: string;
    dynamic?: boolean;
}
type SpreadsheetCellFormulaInput = string | SpreadsheetCellFormula;
interface SpreadsheetExternalHyperlink {
    target: string;
    display?: string;
    tooltip?: string;
}
interface SpreadsheetInternalHyperlink {
    location: string;
    display?: string;
    tooltip?: string;
}
type SpreadsheetHyperlink = string | SpreadsheetExternalHyperlink | SpreadsheetInternalHyperlink;
interface SpreadsheetCell {
    value?: CellValue;
    style?: SpreadsheetCellStyleInput;
    formula?: SpreadsheetCellFormulaInput;
    hyperlink?: SpreadsheetHyperlink;
    comment?: SpreadsheetCellComment;
    colSpan?: number;
    rowSpan?: number;
}
interface SpreadsheetColumn {
    width?: number;
    hidden?: boolean;
    bestFit?: boolean;
}
interface SpreadsheetRow {
    height?: number;
    hidden?: boolean;
    cells: SpreadsheetCell[];
}
interface SpreadsheetFreezePane {
    row: number;
    col: number;
}
interface SpreadsheetAutoFilterConfig {
    ref: string;
}
interface SpreadsheetNamedRange {
    name: string;
    ref: string;
    scope?: string;
}
interface SpreadsheetPrintRange {
    start: number;
    end: number;
}
interface SpreadsheetPrintTitles {
    rows?: SpreadsheetPrintRange;
    columns?: SpreadsheetPrintRange;
}
interface SpreadsheetPrintOptions {
    gridLines?: boolean;
    headings?: boolean;
}
interface SpreadsheetPageMargins {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    header?: number;
    footer?: number;
}
interface SpreadsheetPageSetup {
    paperSize?: number;
    orientation?: "portrait" | "landscape";
    scale?: number;
    fitToWidth?: number;
    fitToHeight?: number;
    printArea?: string;
    printTitles?: SpreadsheetPrintTitles;
    options?: SpreadsheetPrintOptions;
    margins?: SpreadsheetPageMargins;
}
type SpreadsheetDataValidationType = "whole" | "decimal" | "list" | "date" | "time" | "textLength" | "custom";
type SpreadsheetDataValidationOperator = "between" | "notBetween" | "equal" | "notEqual" | "greaterThan" | "lessThan" | "greaterThanOrEqual" | "lessThanOrEqual";
type SpreadsheetDataValidationErrorStyle = "stop" | "warning" | "information";
interface SpreadsheetDataValidation {
    ref: string;
    type: SpreadsheetDataValidationType;
    operator?: SpreadsheetDataValidationOperator;
    formula1: string | number | string[];
    formula2?: string | number;
    allowBlank?: boolean;
    showDropDown?: boolean;
    showInputMessage?: boolean;
    promptTitle?: string;
    prompt?: string;
    showErrorMessage?: boolean;
    errorTitle?: string;
    error?: string;
    errorStyle?: SpreadsheetDataValidationErrorStyle;
}
interface SpreadsheetSheetStyling {
    headerRow?: SpreadsheetCellStyleInput;
    alternateRows?: {
        odd?: SpreadsheetCellStyleInput;
        even?: SpreadsheetCellStyleInput;
    };
}
interface SpreadsheetCfvo {
    type: "min" | "max" | "num" | "percent" | "percentile" | "formula";
    value?: number | string;
    color?: string;
}
type SpreadsheetIconSetType = "3Arrows" | "3ArrowsGray" | "3Flags" | "3TrafficLights1" | "3TrafficLights2" | "3Signs" | "3Symbols" | "3Symbols2" | "3Stars" | "3Triangles" | "3Smilies" | "4Arrows" | "4ArrowsGray" | "4RedToBlack" | "4Rating" | "4TrafficLights" | "5Arrows" | "5ArrowsGray" | "5Rating" | "5Quarters";
interface SpreadsheetConditionalFormattingCellIsRule {
    type: "cellIs";
    operator: "between" | "equal" | "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" | "notBetween" | "notEqual";
    /**
     * Single formula for unary operators; `[lower, upper]` tuple for
     * `between` / `notBetween`. Excel rejects single-formula `between` rules.
     */
    formula: string | [string, string];
    style: SpreadsheetCellStyleInput;
}
interface SpreadsheetConditionalFormattingColorScaleRule {
    type: "colorScale";
    scale: {
        min: SpreadsheetCfvo & {
            color: string;
        };
        mid?: SpreadsheetCfvo & {
            color: string;
        };
        max: SpreadsheetCfvo & {
            color: string;
        };
    };
}
interface SpreadsheetConditionalFormattingDataBarRule {
    type: "dataBar";
    color: string;
    min: SpreadsheetCfvo;
    max: SpreadsheetCfvo;
    gradient?: boolean;
    showValue?: boolean;
    negativeColor?: string;
    axisPosition?: "automatic" | "middle" | "none";
    direction?: "leftToRight" | "rightToLeft";
}
interface SpreadsheetConditionalFormattingIconSetRule {
    type: "iconSet";
    iconSet: SpreadsheetIconSetType;
    showValue?: boolean;
    reverse?: boolean;
    thresholds?: SpreadsheetCfvo[];
}
interface SpreadsheetConditionalFormattingTop10Rule {
    type: "top10";
    rank: number;
    percent?: boolean;
    bottom?: boolean;
    style: SpreadsheetCellStyleInput;
}
interface SpreadsheetConditionalFormattingDuplicateRule {
    type: "duplicateValues" | "uniqueValues";
    style: SpreadsheetCellStyleInput;
}
type SpreadsheetConditionalFormattingRule = SpreadsheetConditionalFormattingCellIsRule | SpreadsheetConditionalFormattingColorScaleRule | SpreadsheetConditionalFormattingDataBarRule | SpreadsheetConditionalFormattingIconSetRule | SpreadsheetConditionalFormattingTop10Rule | SpreadsheetConditionalFormattingDuplicateRule;
interface SpreadsheetConditionalFormatting {
    ref: string;
    rules: SpreadsheetConditionalFormattingRule[];
}
type SpreadsheetTableTotalsRowFunction = "sum" | "min" | "max" | "average" | "count" | "countNums" | "stdDev" | "var";
interface SpreadsheetTableColumn {
    name?: string;
    totalsRowLabel?: string;
    totalsRowFunction?: SpreadsheetTableTotalsRowFunction;
    totalsRowFormula?: string;
}
interface SpreadsheetTableStyle {
    name?: string;
    showFirstColumn?: boolean;
    showLastColumn?: boolean;
    showRowStripes?: boolean;
    showColumnStripes?: boolean;
}
interface SpreadsheetTable {
    name: string;
    displayName?: string;
    ref: string;
    totalsRow?: boolean;
    columns?: SpreadsheetTableColumn[];
    style?: SpreadsheetTableStyle;
}
interface SpreadsheetSheetProtection {
    password?: string;
    sheet?: boolean;
    objects?: boolean;
    scenarios?: boolean;
    formatCells?: boolean;
    formatColumns?: boolean;
    formatRows?: boolean;
    insertColumns?: boolean;
    insertRows?: boolean;
    insertHyperlinks?: boolean;
    deleteColumns?: boolean;
    deleteRows?: boolean;
    selectLockedCells?: boolean;
    sort?: boolean;
    autoFilter?: boolean;
    pivotTables?: boolean;
    selectUnlockedCells?: boolean;
}
interface SpreadsheetImageAnchor {
    from: {
        col: number;
        row: number;
        colOffset?: number;
        rowOffset?: number;
    };
    to?: {
        col: number;
        row: number;
        colOffset?: number;
        rowOffset?: number;
    };
}
interface SpreadsheetImage {
    data: Buffer;
    type: "png" | "jpeg";
    anchor: SpreadsheetImageAnchor;
    name?: string;
    description?: string;
    width?: number;
    height?: number;
}
/**
 * Free tier chart types (must beat ExcelJS): bar, col, line, pie, scatter.
 * Pro tier adds: area, doughnut, radar, bubble, stock, surface.
 */
/**
 * @deprecated Every chart type renders in the published package; this list no
 * longer marks a boundary. Retained for the §9.5 deprecation window.
 */
declare const FREE_XLSX_CHART_TYPES: readonly ["bar", "col", "line", "pie", "scatter"];
type FreeXlsxChartType = (typeof FREE_XLSX_CHART_TYPES)[number];
type ProXlsxChartType = "area" | "doughnut" | "radar" | "bubble" | "stock" | "surface";
type SpreadsheetChartType = FreeXlsxChartType | ProXlsxChartType;
interface SpreadsheetChartSeries {
    name?: string;
    categories?: string;
    values: string;
}
interface SpreadsheetChart {
    type: SpreadsheetChartType;
    title?: string;
    series: SpreadsheetChartSeries[];
    anchor: SpreadsheetImageAnchor;
    width?: number;
    height?: number;
    style?: {
        showLegend?: boolean;
        showDataLabels?: boolean;
    };
}
type SpreadsheetPivotSubtotal = "sum" | "count" | "average" | "max" | "min" | "product" | "countNums" | "stdDev" | "stdDevP" | "var" | "varP";
interface SpreadsheetPivotDimension {
    name: string;
    subtotals?: false | SpreadsheetPivotSubtotal[];
}
interface SpreadsheetPivotValueField {
    name: string;
    summarizeBy?: SpreadsheetPivotSubtotal;
    title?: string;
}
interface SpreadsheetPivotCalculatedField {
    name: string;
    formula: string;
}
interface SpreadsheetPivotTableStyle {
    name?: string;
    showRowHeaders?: boolean;
    showColumnHeaders?: boolean;
    showRowStripes?: boolean;
    showColumnStripes?: boolean;
    showLastColumn?: boolean;
}
interface SpreadsheetPivotTable {
    name: string;
    sourceSheet: string;
    sourceRef: string;
    targetCell: string;
    rowFields?: Array<string | SpreadsheetPivotDimension>;
    columnFields?: Array<string | SpreadsheetPivotDimension>;
    filterFields?: string[];
    valueFields: SpreadsheetPivotValueField[];
    calculatedFields?: SpreadsheetPivotCalculatedField[];
    valuesAxis?: "row" | "column";
    showRowGrandTotals?: boolean;
    showColumnGrandTotals?: boolean;
    style?: SpreadsheetPivotTableStyle;
}
interface SpreadsheetPivotChart {
    pivotTable: string;
    type: SpreadsheetChartType;
    title?: string;
    anchor: SpreadsheetImageAnchor;
    width?: number;
    height?: number;
    style?: {
        showLegend?: boolean;
        showDataLabels?: boolean;
    };
}
interface SpreadsheetSheet {
    name: string;
    columns?: SpreadsheetColumn[];
    rows: SpreadsheetRow[];
    mergedCells?: string[];
    freezePane?: SpreadsheetFreezePane;
    autoFilter?: boolean | SpreadsheetAutoFilterConfig;
    dataValidations?: SpreadsheetDataValidation[];
    pageSetup?: SpreadsheetPageSetup;
    state?: "visible" | "hidden" | "veryHidden";
    tabColor?: string;
    rightToLeft?: boolean;
    styling?: SpreadsheetSheetStyling;
    conditionalFormatting?: SpreadsheetConditionalFormatting[];
    tables?: SpreadsheetTable[];
    protection?: SpreadsheetSheetProtection;
    images?: SpreadsheetImage[];
    charts?: SpreadsheetChart[];
    pivotTables?: SpreadsheetPivotTable[];
    pivotCharts?: SpreadsheetPivotChart[];
}
interface SpreadsheetDocument {
    meta?: SpreadsheetMeta;
    accessible?: boolean | AccessibilityConfig;
    theme?: ThemeConfig;
    defaults?: SpreadsheetDefaults;
    date1904?: boolean;
    namedRanges?: SpreadsheetNamedRange[];
    sheets: SpreadsheetSheet[];
}
interface SpreadsheetRenderOptions$1 {
    deterministic?: boolean;
    largeDataset?: boolean;
    /** Explicit signed license. Takes precedence over RUNSTAMP_LICENSE_KEY. */
    licenseKey?: string;
    onInputWarning?: (warning: SpreadsheetInputWarning) => void;
    relaxed?: boolean;
    rowChunkSize?: number;
    stringStrategy?: "auto" | "sharedStrings" | "inlineStrings";
    warmPath?: boolean;
}

type SpreadsheetFindingSeverity = "info" | "warning" | "error";
type SpreadsheetFindingCategory = "package" | "relationship" | "workbook" | "worksheet" | "styleString" | "table" | "security" | "compatibility" | "operational";
type SpreadsheetValidationVerdict = "clean" | "warnings" | "errors";
type SpreadsheetFindingCode = "MISSING_CONTENT_TYPE" | "EXTRA_CONTENT_TYPE" | "ORPHAN_RELATIONSHIP" | "DUPLICATE_RELATIONSHIP_ID" | "MISSING_WORKSHEET_PART" | "STYLE_INDEX_OOB" | "SHARED_STRING_INDEX_OOB" | "SHEET_NAME_INVALID" | "DUPLICATE_SHEET_NAME" | "FORMULA_CACHED_VALUE_MISSING" | "BROKEN_TABLE_RELATIONSHIP" | "DUPLICATE_TABLE_NAME" | "INVALID_TABLE_REF" | "DIMENSION_MISMATCH" | "INVALID_RANGE_REF" | "MERGE_OVERLAP" | "MERGE_RANGE_OUT_OF_BOUNDS" | "DEFINED_NAME_INVALID" | "HYPERLINK_TARGET_INVALID" | "MACRO_STRIPPED" | "EXTERNAL_CONNECTION_STRIPPED" | "GOOGLE_SHEETS_IMPORT_RISK" | "NUMBERS_COMPATIBILITY_WARNING" | "LARGE_FILE_WARNING" | "HIGH_UNIQUE_STRING_COUNT" | "EXCESSIVE_STYLE_CARDINALITY" | "STREAM_MODE_RECOMMENDED";
interface SpreadsheetFinding {
    code: SpreadsheetFindingCode;
    severity: SpreadsheetFindingSeverity;
    category: SpreadsheetFindingCategory;
    message: string;
    location?: {
        path?: string;
        sheetName?: string;
        cellRef?: string;
        rangeRef?: string;
    };
    metadata?: Record<string, string | number | boolean>;
    repairable: boolean;
    repaired?: boolean;
    crossAppCritical: boolean;
}
interface SpreadsheetBufferValidateOptions {
    maxPartCount?: number;
}
interface SpreadsheetRepairOptions extends SpreadsheetBufferValidateOptions {
    fixContentTypes?: boolean;
    removeOrphanRelationships?: boolean;
    clampStyleIndices?: boolean;
    repairSharedStringIndices?: boolean;
    stripUnsafeArtifacts?: boolean;
    normalizeDuplicateTableNames?: boolean;
    clipTableRefs?: boolean;
    repairMerges?: boolean;
    repairWorksheetDimensions?: boolean;
    removeInvalidHyperlinks?: boolean;
    clipDataValidationRanges?: boolean;
    removeInvalidDefinedNames?: boolean;
    deterministic?: boolean;
}
interface SpreadsheetValidationSummary {
    verdict: SpreadsheetValidationVerdict;
    findings: SpreadsheetFinding[];
}
interface SpreadsheetRepairAction {
    code: string;
    description: string;
    path?: string;
}
interface SpreadsheetRepairResult {
    buffer: Buffer;
    repaired: boolean;
    actions: SpreadsheetRepairAction[];
    findings: SpreadsheetFinding[];
    riskyTransformations: boolean;
}
interface SpreadsheetRepairValidationResult {
    original: SpreadsheetValidationSummary;
    repair: SpreadsheetRepairResult;
    repaired: SpreadsheetValidationSummary;
}

type SpreadsheetRenderModeRecommendation = "buffer" | "stream";
type SpreadsheetStringStrategy = "sharedStrings" | "inlineStrings";
interface SpreadsheetWorkloadEstimate {
    sheetCount: number;
    totalRows: number;
    totalCells: number;
    maxSheetRows: number;
    maxSheetCells: number;
    totalStringCells: number;
    uniqueStringCount: number;
    repeatedStringRatio: number;
    projectedWorksheetXmlBytes: number;
    projectedZipBytes: number;
}
interface SpreadsheetQualityReport {
    verdict: SpreadsheetValidationVerdict;
    renderModeRecommendation: SpreadsheetRenderModeRecommendation;
    estimatedWorkbookSizeBytes: number;
    estimatedPeakMemoryBytes: number;
    estimatedUniqueStrings: number;
    estimatedStyleCount: number;
    findings: SpreadsheetFinding[];
    recommendedRenderMode: SpreadsheetRenderModeRecommendation;
    recommendedStringStrategy: SpreadsheetStringStrategy;
    estimates: SpreadsheetWorkloadEstimate;
    reasons: string[];
}

type SpreadsheetRequestedStringStrategy = "auto" | SpreadsheetStringStrategy;
interface SpreadsheetPartManifestEntry {
    path: string;
    stage: "smallPart" | "worksheet" | "worksheetRelationship" | "trailingGlobal";
}
interface SpreadsheetSheetRenderPlan {
    name: string;
    rowCount: number;
    cellCount: number;
    columnCount: number;
    chunkSize: number;
    chunkCount: number;
    estimatedWorksheetXmlBytes: number;
    features: {
        mergedCells: boolean;
        freezePane: boolean;
        autoFilter: boolean;
        dataValidations: boolean;
        hyperlinks: boolean;
        conditionalFormatting: boolean;
        printSetup: boolean;
        formulas: boolean;
        tables: boolean;
    };
}
interface SpreadsheetRenderPlan {
    deterministic: boolean;
    recommendedRenderMode: SpreadsheetRenderModeRecommendation;
    requestedStringStrategy: SpreadsheetRequestedStringStrategy;
    resolvedStringStrategy: SpreadsheetStringStrategy;
    includeSharedStrings: boolean;
    rowChunkSize: number;
    qualityReport: SpreadsheetQualityReport;
    sheetPlans: SpreadsheetSheetRenderPlan[];
    partManifest: SpreadsheetPartManifestEntry[];
}

interface SpreadsheetPartRenderMetrics {
    path: string;
    stage: "smallPart" | "worksheet" | "worksheetRelationship" | "trailingGlobal";
    byteLength: number;
}
interface SpreadsheetSheetChunkMetrics {
    startRowNumber: number;
    endRowNumber: number;
    sourceRowCount: number;
    serializedRowCount: number;
    cellCount: number;
    byteLength: number;
}
interface SpreadsheetSheetRenderMetrics {
    name: string;
    totalRowsWritten: number;
    totalSerializedRows: number;
    totalCellsWritten: number;
    chunkCount: number;
    chunkMetrics: SpreadsheetSheetChunkMetrics[];
}
interface SpreadsheetRenderStageMetrics {
    worksheetSerializationTimeMs: number;
    stylesSerializationTimeMs: number;
    sharedStringsSerializationTimeMs: number;
    packageSerializationTimeMs: number;
    archiveFinalizationTimeMs: number;
}
interface SpreadsheetRenderKeyPartBytes {
    sheet1XmlBytes: number;
    stylesXmlBytes: number;
    sharedStringsXmlBytes: number;
    zipBytes: number;
    sheet1XmlCompressedBytes?: number;
    stylesXmlCompressedBytes?: number;
    sharedStringsXmlCompressedBytes?: number;
    sheet1XmlZipContributionBytes?: number;
    stylesXmlZipContributionBytes?: number;
    sharedStringsXmlZipContributionBytes?: number;
    otherZipContributionBytes?: number;
}
interface SpreadsheetRenderMetrics {
    renderMode: SpreadsheetRenderModeRecommendation;
    stringStrategy: SpreadsheetStringStrategy;
    totalRowsWritten: number;
    totalSerializedRows: number;
    totalCellsWritten: number;
    uniqueStringsCount: number;
    styleCount: number;
    estimatedZipSizeBytes: number;
    outputSizeBytes: number;
    outputSizeDeltaBytes: number;
    totalGenerationTimeMs: number;
    zipFinalizationTimeMs: number;
    stageMetrics: SpreadsheetRenderStageMetrics;
    keyPartBytes: SpreadsheetRenderKeyPartBytes;
    partMetrics: SpreadsheetPartRenderMetrics[];
    sheetMetrics: SpreadsheetSheetRenderMetrics[];
}
interface SpreadsheetRenderResult {
    buffer: Buffer;
    plan: SpreadsheetRenderPlan;
    metrics: SpreadsheetRenderMetrics;
}

interface SpreadsheetTemplateParseOptions {
    maxPartCount?: number;
    maxTotalBytes?: number;
    maxPartBytes?: number;
    preserveOpaqueParts?: boolean;
}
interface SpreadsheetTemplateRelationship {
    source: string;
    target: string;
    type: string;
    id: string;
    external: boolean;
}
interface SpreadsheetTemplateNamedRange {
    name: string;
    ref: string;
    scopeSheet?: string;
}
interface SpreadsheetTemplateTable {
    name: string;
    displayName: string;
    ref: string;
    path: string;
    sheetName: string;
}
interface SpreadsheetTemplateSheet {
    name: string;
    state: "visible" | "hidden" | "veryHidden";
    path: string;
    relationshipId: string;
    dimensionRef?: string;
    rowCount: number;
    formulaCells: string[];
    mergedRanges: string[];
    conditionalFormattingRefs: string[];
    dataValidationRefs: string[];
    tableNames: string[];
    drawingTargets: string[];
    hasPrintSettings: boolean;
    hasProtection: boolean;
}
interface SpreadsheetTemplateStylesInventory {
    numFmtCount: number;
    fontCount: number;
    fillCount: number;
    borderCount: number;
    cellXfCount: number;
}
type SpreadsheetTemplateSanitizationDisposition = "stripped" | "preserved" | "warning";
interface SpreadsheetTemplateSanitizationAction {
    disposition: SpreadsheetTemplateSanitizationDisposition;
    path: string;
    category: string;
    reason: string;
}
interface SpreadsheetPreservedOpaquePart {
    path: string;
    contentType?: string;
}
interface SpreadsheetTemplateIndex {
    partNames: string[];
    relationships: SpreadsheetTemplateRelationship[];
    sheets: SpreadsheetTemplateSheet[];
    namedRanges: SpreadsheetTemplateNamedRange[];
    tables: SpreadsheetTemplateTable[];
    styles: SpreadsheetTemplateStylesInventory;
    preservedOpaqueParts: SpreadsheetPreservedOpaquePart[];
    sanitization: {
        actions: SpreadsheetTemplateSanitizationAction[];
    };
}
interface SpreadsheetTemplateInjectionAnchor {
    kind: "namedRange" | "rowExpansion";
    label: string;
    sheetName?: string;
    ref: string;
    reason: string;
}
interface SpreadsheetTemplateRowHint {
    sheetName: string;
    rowNumber: number;
    reason: string;
}
interface SpreadsheetTemplateInspectionReport {
    sheetInventory: SpreadsheetTemplateSheet[];
    namedRangeInventory: SpreadsheetTemplateNamedRange[];
    tableInventory: SpreadsheetTemplateTable[];
    sanitizationActions: SpreadsheetTemplateSanitizationAction[];
    unsupportedPreservedParts: SpreadsheetPreservedOpaquePart[];
    recommendedInjectionAnchors: SpreadsheetTemplateInjectionAnchor[];
    rowTemplateDetectionHints: SpreadsheetTemplateRowHint[];
}

interface SpreadsheetTemplateRangeInput {
    values: CellValue[][];
}
type SpreadsheetTemplateValueInput = CellValue | SpreadsheetTemplateRangeInput;
type SpreadsheetTemplateRowExpansionValue = CellValue | undefined;
interface SpreadsheetTemplateRowExpansionInput {
    rows: SpreadsheetTemplateRowExpansionValue[][];
}
interface SpreadsheetTemplateAssemblyInput {
    namedRanges?: Record<string, SpreadsheetTemplateValueInput>;
    cells?: Record<string, Record<string, CellValue>>;
    officeData?: Record<string, unknown>;
    rowExpansions?: Record<string, SpreadsheetTemplateRowExpansionInput>;
}
type SpreadsheetTemplateSyntax = "auto" | "namedRanges" | "office";
interface SpreadsheetTemplateAssemblyOptions {
    deterministic?: boolean;
    removeUnfilled?: boolean;
    strictMode?: boolean;
    syntax?: SpreadsheetTemplateSyntax;
}

type AccessibilitySeverity = "error" | "warning" | "info";
type AccessibilityIssueCode = "document.title_missing" | "document.language_missing" | "image.alt_missing" | "structure.heading_skipped" | "table.header_missing";
interface AccessibilityIssue$1 {
    code: AccessibilityIssueCode;
    severity: AccessibilitySeverity;
    message: string;
    location?: {
        elementPath?: string;
        pageIndex?: number;
        slideIndex?: number;
        sheetName?: string;
    };
    suggestedFix?: string;
}
interface AccessibilitySummary$1 {
    errors: number;
    warnings: number;
    infos: number;
}
interface AccessibilityReport$1 {
    valid: boolean;
    summary: AccessibilitySummary$1;
    issues: AccessibilityIssue$1[];
    format: "pptx" | "docx" | "xlsx" | "pdf";
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

interface AccessibilityIssue extends AccessibilityIssue$1 {
    path?: string;
}
interface AccessibilitySummary extends AccessibilitySummary$1 {
    titleSet: boolean;
    languageSet: boolean;
    sheets: number;
    tablesChecked: number;
    tablesWithHeaders: number;
    tablesWithoutHeaders: number;
    imagesChecked: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
}
interface AccessibilityReport extends AccessibilityReport$1 {
    summary: AccessibilitySummary;
    issues: AccessibilityIssue[];
}
interface AccessibilityRemediationResult extends AccessibilityRemediationResult$1 {
    reportBefore: AccessibilityReport;
    reportAfter: AccessibilityReport;
    document: SpreadsheetDocument;
}

/**
 * Static lint pass for `SpreadsheetDocument` — pure walker, no rendering.
 *
 * Catches structural issues that produce a syntactically valid workbook but
 * trip Excel at open time (illegal sheet names, conditional-formatting refs
 * outside sheet bounds, `between` rules with single formulas, etc.) Returns
 * `{ ok, issues }`; integrates with the engine via `SpreadsheetEngine.lint()`.
 *
 * Driven by `docs/0428-claude-test-based-directive2.md`
 * §"@runstamp/xlsx" item "expose `SpreadsheetEngine.lint(doc)` ...".
 */

type SpreadsheetLintIssueCode = "XLSX_LINT_SHEET_NAME_TOO_LONG" | "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS" | "XLSX_LINT_SHEET_NAME_RESERVED" | "XLSX_LINT_SHEET_NAME_DUPLICATE" | "XLSX_LINT_AUTOFILTER_OUT_OF_BOUNDS" | "XLSX_LINT_AUTOFILTER_INVALID_REF" | "XLSX_LINT_CF_REF_OUT_OF_BOUNDS" | "XLSX_LINT_CF_REF_INVALID" | "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE" | "XLSX_LINT_COLUMN_WIDTH_CAPPED" | "XLSX_LINT_CHART_EMPTY_SERIES" | "XLSX_LINT_WIDE_PRINT_RANGE" | "XLSX_LINT_CHART_CROSSES_PAGE_BREAK";
interface SpreadsheetLintIssue {
    severity: "error" | "warning";
    code: SpreadsheetLintIssueCode;
    message: string;
    path: string;
    suggestion?: string;
}
interface SpreadsheetLintResult {
    ok: boolean;
    issues: SpreadsheetLintIssue[];
}

type QualityVerdict = "native_editable" | "editable_with_constraints" | "visual_fallback" | "rejected";
type RepairRisk = "none" | "low" | "medium" | "high";
type FindingCode = "SHARED_RELATIONSHIP_TARGET_MISSING" | "SHARED_CONTENT_TYPE_DUPLICATE" | "SHARED_CONTENT_TYPE_MISSING" | "SHARED_CONTENT_TYPE_UNEXPECTED" | "SHARED_RID_NOT_UNIQUE" | "SHARED_ZIP_BOMB_DETECTED" | "SHARED_XML_PARSE_FAILURE" | "SHARED_MEDIA_EMBED_MISSING" | "PPTX_NORMAUTOFIT_MISSING_FONTSCALE" | "PPTX_TABLE_CELL_TEXT_OVERFLOW" | "PPTX_CHART_FORMAT_CODE_UNESCAPED" | "PPTX_ELEMENT_POSITION_CASCADE" | "PPTX_CHART_WORKBOOK_MISSING" | "PPTX_CHART_LABEL_COLLISION" | "PPTX_OVERFLOW_BODY_TEXT" | "PPTX_FONT_FALLBACK_USED" | "PPTX_SLIDE_ID_NOT_UNIQUE" | "PPTX_CUSTDATALIST_CONFLICT" | "PPTX_ELEMENT_ORDER_VIOLATION" | "PPTX_ANIMATION_REF_BROKEN" | "PPTX_HYPERLINK_DANGLING" | "PPTX_MASTER_REF_UNRESOLVED" | "PPTX_FONT_EMBED_FAILED" | "PPTX_STRUCTURAL_VALIDATION_FAILED" | "DOCX_NUMBERING_DEF_MISSING" | "DOCX_STYLE_REF_MISSING" | "DOCX_SECT_PR_MISSING" | "DOCX_TABLE_WIDTH_MISMATCH" | "DOCX_RUN_SPLIT_FORMATTING_LOSS" | "DOCX_TRACKED_CHANGE_MALFORMED" | "DOCX_HEADING_HIERARCHY_BROKEN" | "DOCX_IMAGE_REF_MISSING" | "DOCX_FONT_FALLBACK_USED" | "DOCX_PARAGRAPH_OVERFLOW" | "DOCX_CONTENT_CONTROL_REF_BROKEN" | "DOCX_RELATIONSHIP_TARGET_MISSING" | "XLSX_SHARED_STRING_INDEX_OOB" | "XLSX_STYLE_INDEX_OOB" | "XLSX_MERGE_OVERLAP" | "XLSX_NAMED_RANGE_DEAD_REF" | "XLSX_CHART_WORKBOOK_MISSING" | "XLSX_FORMULA_CACHED_VALUE_MISSING" | "XLSX_SHEET_NAME_INVALID" | "XLSX_DUPLICATE_SHEET_NAME" | "XLSX_RELATIONSHIP_TARGET_MISSING" | "XLSX_TABLE_RELATIONSHIP_BROKEN" | "XLSX_TABLE_NAME_DUPLICATE" | "XLSX_TABLE_REF_INVALID" | "XLSX_WORKSHEET_DIMENSION_MISMATCH" | "XLSX_RANGE_REF_INVALID" | "XLSX_MERGE_RANGE_OUT_OF_BOUNDS" | "XLSX_HYPERLINK_TARGET_INVALID" | "XLSX_MACRO_STRIPPED" | "XLSX_EXTERNAL_CONNECTION_STRIPPED" | "XLSX_GOOGLE_SHEETS_IMPORT_RISK" | "XLSX_NUMBERS_COMPATIBILITY_WARNING" | "XLSX_HIGH_UNIQUE_STRING_COUNT" | "XLSX_STYLE_CARDINALITY_EXCESSIVE" | "XLSX_STREAM_MODE_RECOMMENDED" | "XLSX_FORMULA_REF_BROKEN" | "XLSX_DATE_BEFORE_1900" | "XLSX_LARGE_FILE_WARNING" | "PDF_XREF_OFFSET_INCORRECT" | "PDF_XREF_ENTRY_ZERO_OFFSET" | "PDF_XREF_TABLE_MISSING" | "PDF_FONT_OBJECT_MISSING" | "PDF_FONT_NOT_EMBEDDED" | "PDF_IMAGE_REFERENCE_MISSING" | "PDF_STREAM_LENGTH_INCORRECT" | "PDF_EOF_MARKER_MISSING" | "PDF_ROOT_OBJECT_INVALID" | "PDF_FONT_SUBSET_INCOMPLETE" | "PDF_SIGNATURE_INVALID" | "PDF_SIGNATURE_MISSING" | "PDF_SIGNATURE_BYTERANGE_INVALID" | "PDF_TIMESTAMP_MISSING" | "PDF_TIMESTAMP_INVALID" | "PDF_PAGE_TREE_COUNT_MISMATCH" | "PDF_TAG_MCID_GAP" | "PDF_SELF_REFERENCE" | "PDF_METADATA_INFO_XMP_MISMATCH" | "PDF_OBJECT_NUMBER_REUSE";
interface QualityFinding {
    code: FindingCode;
    severity: "error" | "warning" | "info";
    slideIndex?: number;
    sheetIndex?: number;
    pageIndex?: number;
    paragraphIndex?: number;
    nodeId?: string;
    message: string;
    autoFixed: boolean;
    repairDescription?: string;
}
interface RepairEntry {
    strategy: string;
    finding: FindingCode;
    description: string;
    success: boolean;
    slideIndex?: number;
    sheetIndex?: number;
    pageIndex?: number;
}
interface QualityReport {
    verdict: QualityVerdict;
    repairRisk: RepairRisk;
    findings: QualityFinding[];
    slideCount?: number;
    sheetCount?: number;
    pageCount?: number;
    chartCount?: number;
    tableCount?: number;
    imageCount?: number;
    fontCount?: number;
    renderTimeMs: number;
    autoFixesApplied: number;
    repairLog: RepairEntry[];
}
interface RenderWithQualityResult {
    output: Buffer;
    quality: QualityReport;
}

type SpreadsheetEngineCapability = "quality-reporting" | "repair-pipeline" | "template-assembly";
declare class SpreadsheetEngine {
    private static readonly warmPathCacheLimit;
    private static readonly warmPathCache;
    private static durationMs;
    static validateDocument(document: unknown): SpreadsheetDocument;
    static supports(capability: SpreadsheetEngineCapability): boolean;
    static validateAccessibility(document: SpreadsheetDocument): AccessibilityReport;
    /**
     * Static lint pass — detects structural issues Excel rejects but our
     * Zod schema accepts (sheet name length/chars, autoFilter/CF refs out of
     * bounds, between/notBetween formula shape, duplicate names case-insensitive).
     * Pure walker; no rendering side effects.
     */
    static lint(document: SpreadsheetDocument): SpreadsheetLintResult;
    static remediateAccessibility(document: SpreadsheetDocument): AccessibilityRemediationResult;
    static validate(document: unknown): SpreadsheetDocument;
    static validate(buffer: Buffer, options?: SpreadsheetBufferValidateOptions): Promise<SpreadsheetValidationSummary>;
    static preflight(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions$1): SpreadsheetQualityReport;
    static renderWithQuality(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions$1): Promise<RenderWithQualityResult>;
    static plan(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions$1): SpreadsheetRenderPlan;
    static render(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions$1): Promise<Buffer>;
    static renderStream(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions$1): Promise<NodeJS.ReadableStream>;
    static renderValidated(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions$1): Promise<Buffer>;
    static renderWithMetrics(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions$1): Promise<SpreadsheetRenderResult>;
    static parseTemplate(buffer: Buffer, options?: SpreadsheetTemplateParseOptions): Promise<SpreadsheetTemplateIndex>;
    static inspectTemplate(index: SpreadsheetTemplateIndex): SpreadsheetTemplateInspectionReport;
    static assembleFromTemplate(index: SpreadsheetTemplateIndex, injection: SpreadsheetTemplateAssemblyInput, options?: SpreadsheetTemplateAssemblyOptions): Promise<Buffer>;
    static assembleFromTemplateStream(index: SpreadsheetTemplateIndex, injection: SpreadsheetTemplateAssemblyInput, options?: SpreadsheetTemplateAssemblyOptions): Promise<NodeJS.ReadableStream>;
    static repair(buffer: Buffer, options?: SpreadsheetRepairOptions): Promise<SpreadsheetRepairResult>;
    static validateAndRepair(buffer: Buffer, options?: SpreadsheetRepairOptions): Promise<SpreadsheetRepairValidationResult>;
    private static renderValidatedWithMetrics;
    private static renderValidatedStream;
    private static prepareWorkbookCore;
    private static prepareWarmPathScaffold;
    private static buildWarmPathScaffold;
    private static getWarmPathCacheKey;
    private static documentHasFormulas;
    private static documentHasDateValues;
    private static shouldUseWorkerSheetSerialization;
    private static prepareValidatedWorkbook;
    private static collectPartMetrics;
    private static collectKeyPartBytes;
}

type XlsxRigorousBenchmarkStatus = "pass" | "warn" | "fail" | "blocked";
type XlsxRigorousBenchmarkTier = "free" | "pro";
type XlsxRigorousBenchmarkBucket = "free-safe" | "pro-only" | "shared";
type SpreadsheetDocumentInput = Parameters<typeof SpreadsheetEngine.render>[0];
type SpreadsheetRenderOptions = Parameters<typeof SpreadsheetEngine.render>[1];
type SpreadsheetTemplateIndexLike = Awaited<ReturnType<typeof SpreadsheetEngine.parseTemplate>>;
type SpreadsheetTemplateAssemblyInputLike = Parameters<typeof SpreadsheetEngine.assembleFromTemplate>[1];
interface XlsxRigorousBenchmarkMetadata {
    mode: XlsxRigorousBenchmarkTier;
    buildType: string;
    packageName: string;
    keyPresent: boolean;
    gitSha?: string;
}
interface XlsxRigorousBenchmarkOptions {
    iterations?: number;
    mode?: XlsxRigorousBenchmarkTier;
    buildType?: string;
    packageName?: string;
    keyPresent?: boolean;
    gitSha?: string;
    engine?: XlsxRigorousBenchmarkEngine;
}
interface XlsxRigorousBenchmarkEngine {
    render: (document: SpreadsheetDocumentInput, options?: SpreadsheetRenderOptions) => Promise<Buffer>;
    renderStream: (document: SpreadsheetDocumentInput, options?: SpreadsheetRenderOptions) => Promise<NodeJS.ReadableStream>;
    renderWithMetrics: typeof SpreadsheetEngine.renderWithMetrics;
    preflight: typeof SpreadsheetEngine.preflight;
    repair: typeof SpreadsheetEngine.repair;
    validateAndRepair: typeof SpreadsheetEngine.validateAndRepair;
    parseTemplate: (buffer: Buffer) => Promise<SpreadsheetTemplateIndexLike>;
    assembleFromTemplate: (index: SpreadsheetTemplateIndexLike, injection: SpreadsheetTemplateAssemblyInputLike) => Promise<Buffer>;
}
interface XlsxRigorousMetricStats {
    min: number;
    mean: number;
    p50: number;
    p95: number;
    max: number;
}
interface XlsxRigorousMeasurement {
    durationMs: XlsxRigorousMetricStats;
    rssDeltaBytes: XlsxRigorousMetricStats;
}
interface XlsxRigorousBenchmarkResult {
    id: string;
    tier: XlsxRigorousBenchmarkTier;
    bucket: XlsxRigorousBenchmarkBucket;
    group: string;
    name: string;
    target: string;
    status: XlsxRigorousBenchmarkStatus;
    observed: string;
    notes?: string;
    diagnostics?: Phase2BenchmarkDiagnostics;
    measurement?: XlsxRigorousMeasurement;
}
interface XlsxRigorousBenchmarkSummary {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    blocked: number;
}
interface XlsxRigorousBenchmarkReport {
    generatedAt: string;
    iterations: number;
    environment: {
        node: string;
        platform: string;
        arch: string;
    };
    metadata: XlsxRigorousBenchmarkMetadata;
    summary: XlsxRigorousBenchmarkSummary;
    renderBaselines: Phase1BenchmarkResult[];
    results: XlsxRigorousBenchmarkResult[];
}
declare function runRigorousBenchmarkSuite(options?: number | XlsxRigorousBenchmarkOptions): Promise<XlsxRigorousBenchmarkReport>;
declare function formatRigorousBenchmarkReport(report: XlsxRigorousBenchmarkReport): string;
declare function renderRigorousBenchmarkReport(options?: number | XlsxRigorousBenchmarkOptions): Promise<string>;

export { formatRigorousBenchmarkReport, renderRigorousBenchmarkReport, runRigorousBenchmarkSuite };
export type { XlsxRigorousBenchmarkBucket, XlsxRigorousBenchmarkEngine, XlsxRigorousBenchmarkMetadata, XlsxRigorousBenchmarkOptions, XlsxRigorousBenchmarkReport, XlsxRigorousBenchmarkResult, XlsxRigorousBenchmarkStatus, XlsxRigorousBenchmarkSummary, XlsxRigorousBenchmarkTier, XlsxRigorousMeasurement, XlsxRigorousMetricStats };
