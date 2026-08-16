interface RelaxedInputCoercion {
    code: string;
    path: string;
    description: string;
    legacyShape: string;
    modernShape: string;
}
interface SpreadsheetInputWarning {
    code: string;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
}
interface SpreadsheetRelaxedInputOptions {
    onInputWarning?: (warning: SpreadsheetInputWarning) => void;
    relaxed?: boolean;
}
declare const XLSX_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[];
declare function preprocessSpreadsheetDocumentInput(input: unknown, options?: SpreadsheetRelaxedInputOptions): {
    value: unknown;
    warnings: SpreadsheetInputWarning[];
};

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
interface SpreadsheetRenderOptions {
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

type _JSONSchema = boolean | JSONSchema;
type JSONSchema = {
    [k: string]: unknown;
    $schema?: "https://json-schema.org/draft/2020-12/schema" | "http://json-schema.org/draft-07/schema#" | "http://json-schema.org/draft-04/schema#";
    $id?: string;
    $anchor?: string;
    $ref?: string;
    $dynamicRef?: string;
    $dynamicAnchor?: string;
    $vocabulary?: Record<string, boolean>;
    $comment?: string;
    $defs?: Record<string, JSONSchema>;
    type?: "object" | "array" | "string" | "number" | "boolean" | "null" | "integer";
    additionalItems?: _JSONSchema;
    unevaluatedItems?: _JSONSchema;
    prefixItems?: _JSONSchema[];
    items?: _JSONSchema | _JSONSchema[];
    contains?: _JSONSchema;
    additionalProperties?: _JSONSchema;
    unevaluatedProperties?: _JSONSchema;
    properties?: Record<string, _JSONSchema>;
    patternProperties?: Record<string, _JSONSchema>;
    dependentSchemas?: Record<string, _JSONSchema>;
    propertyNames?: _JSONSchema;
    if?: _JSONSchema;
    then?: _JSONSchema;
    else?: _JSONSchema;
    allOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    oneOf?: JSONSchema[];
    not?: _JSONSchema;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number | boolean;
    minimum?: number;
    exclusiveMinimum?: number | boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxContains?: number;
    minContains?: number;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    dependentRequired?: Record<string, string[]>;
    enum?: Array<string | number | boolean | null>;
    const?: string | number | boolean | null;
    id?: string;
    title?: string;
    description?: string;
    default?: unknown;
    deprecated?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    nullable?: boolean;
    examples?: unknown[];
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    contentSchema?: JSONSchema;
    _prefault?: unknown;
};
type BaseSchema = JSONSchema;

/** The Standard interface. */
interface StandardTypedV1<Input = unknown, Output = Input> {
    /** The Standard properties. */
    readonly "~standard": StandardTypedV1.Props<Input, Output>;
}
declare namespace StandardTypedV1 {
    /** The Standard properties interface. */
    interface Props<Input = unknown, Output = Input> {
        /** The version number of the standard. */
        readonly version: 1;
        /** The vendor name of the schema library. */
        readonly vendor: string;
        /** Inferred types associated with the schema. */
        readonly types?: Types<Input, Output> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> {
        /** The input type of the schema. */
        readonly input: Input;
        /** The output type of the schema. */
        readonly output: Output;
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["input"];
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}
/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
    /** The Standard Schema properties. */
    readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
declare namespace StandardSchemaV1 {
    /** The Standard Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Validates unknown input values. */
        readonly validate: (value: unknown, options?: StandardSchemaV1.Options | undefined) => Result<Output> | Promise<Result<Output>>;
    }
    /** The result interface of the validate function. */
    type Result<Output> = SuccessResult<Output> | FailureResult;
    /** The result interface if validation succeeds. */
    interface SuccessResult<Output> {
        /** The typed output value. */
        readonly value: Output;
        /** The absence of issues indicates success. */
        readonly issues?: undefined;
    }
    interface Options {
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The result interface if validation fails. */
    interface FailureResult {
        /** The issues of failed validation. */
        readonly issues: ReadonlyArray<Issue>;
    }
    /** The issue interface of the failure output. */
    interface Issue {
        /** The error message of the issue. */
        readonly message: string;
        /** The path of the issue, if any. */
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }
    /** The path segment interface of the issue. */
    interface PathSegment {
        /** The key representing a path segment. */
        readonly key: PropertyKey;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
/** The Standard JSON Schema interface. */
interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
    /** The Standard JSON Schema properties. */
    readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}
declare namespace StandardJSONSchemaV1 {
    /** The Standard JSON Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Methods for generating the input/output JSON Schema. */
        readonly jsonSchema: Converter;
    }
    /** The Standard JSON Schema converter interface. */
    interface Converter {
        /** Converts the input type to JSON Schema. May throw if conversion is not supported. */
        readonly input: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
        /** Converts the output type to JSON Schema. May throw if conversion is not supported. */
        readonly output: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
    }
    /** The target version of the generated JSON Schema.
     *
     * It is *strongly recommended* that implementers support `"draft-2020-12"` and `"draft-07"`, as they are both in wide use.
     *
     * The `"openapi-3.0"` target is intended as a standardized specifier for OpenAPI 3.0 which is a superset of JSON Schema `"draft-04"`.
     *
     * All other targets can be implemented on a best-effort basis. Libraries should throw if they don't support a specified target.
     */
    type Target = "draft-2020-12" | "draft-07" | "openapi-3.0" | ({} & string);
    /** The options for the input/output methods. */
    interface Options {
        /** Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. */
        readonly target: Target;
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
interface StandardSchemaWithJSONProps<Input = unknown, Output = Input> extends StandardSchemaV1.Props<Input, Output>, StandardJSONSchemaV1.Props<Input, Output> {
}

declare const $output: unique symbol;
type $output = typeof $output;
declare const $input: unique symbol;
type $input = typeof $input;
type $replace<Meta, S extends $ZodType> = Meta extends $output ? output<S> : Meta extends $input ? input<S> : Meta extends (infer M)[] ? $replace<M, S>[] : Meta extends (...args: infer P) => infer R ? (...args: {
    [K in keyof P]: $replace<P[K], S>;
}) => $replace<R, S> : Meta extends object ? {
    [K in keyof Meta]: $replace<Meta[K], S>;
} : Meta;
type MetadataType = object | undefined;
declare class $ZodRegistry<Meta extends MetadataType = MetadataType, Schema extends $ZodType = $ZodType> {
    _meta: Meta;
    _schema: Schema;
    _map: WeakMap<Schema, $replace<Meta, Schema>>;
    _idmap: Map<string, Schema>;
    add<S extends Schema>(schema: S, ..._meta: undefined extends Meta ? [$replace<Meta, S>?] : [$replace<Meta, S>]): this;
    clear(): this;
    remove(schema: Schema): this;
    get<S extends Schema>(schema: S): $replace<Meta, S> | undefined;
    has(schema: Schema): boolean;
}
interface JSONSchemaMeta {
    id?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    deprecated?: boolean | undefined;
    [k: string]: unknown;
}
interface GlobalMeta extends JSONSchemaMeta {
}

type Processor<T extends $ZodType = $ZodType> = (schema: T, ctx: ToJSONSchemaContext, json: BaseSchema, params: ProcessParams) => void;
interface JSONSchemaGeneratorParams {
    processors: Record<string, Processor>;
    /** A registry used to look up metadata for each schema. Any schema with an `id` property will be extracted as a $def.
     *  @default globalRegistry */
    metadata?: $ZodRegistry<Record<string, any>>;
    /** The JSON Schema version to target.
     * - `"draft-2020-12"` — Default. JSON Schema Draft 2020-12
     * - `"draft-07"` — JSON Schema Draft 7
     * - `"draft-04"` — JSON Schema Draft 4
     * - `"openapi-3.0"` — OpenAPI 3.0 Schema Object */
    target?: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string) | undefined;
    /** How to handle unrepresentable types.
     * - `"throw"` — Default. Unrepresentable types throw an error
     * - `"any"` — Unrepresentable types become `{}` */
    unrepresentable?: "throw" | "any";
    /** Arbitrary custom logic that can be used to modify the generated JSON Schema. */
    override?: (ctx: {
        zodSchema: $ZodTypes;
        jsonSchema: BaseSchema;
        path: (string | number)[];
    }) => void;
    /** Whether to extract the `"input"` or `"output"` type. Relevant to transforms, defaults, coerced primitives, etc.
     * - `"output"` — Default. Convert the output schema.
     * - `"input"` — Convert the input schema. */
    io?: "input" | "output";
    cycles?: "ref" | "throw";
    reused?: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, BaseSchema>;
    } | undefined;
}
/**
 * Parameters for the toJSONSchema function.
 */
type ToJSONSchemaParams = Omit<JSONSchemaGeneratorParams, "processors" | "external">;
interface ProcessParams {
    schemaPath: $ZodType[];
    path: (string | number)[];
}
interface Seen {
    /** JSON Schema result for this Zod schema */
    schema: BaseSchema;
    /** A cached version of the schema that doesn't get overwritten during ref resolution */
    def?: BaseSchema;
    defId?: string | undefined;
    /** Number of times this schema was encountered during traversal */
    count: number;
    /** Cycle path */
    cycle?: (string | number)[] | undefined;
    isParent?: boolean | undefined;
    /** Schema to inherit JSON Schema properties from (set by processor for wrappers) */
    ref?: $ZodType | null;
    /** JSON Schema property path for this schema */
    path?: (string | number)[] | undefined;
}
interface ToJSONSchemaContext {
    processors: Record<string, Processor>;
    metadataRegistry: $ZodRegistry<Record<string, any>>;
    target: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string);
    unrepresentable: "throw" | "any";
    override: (ctx: {
        zodSchema: $ZodType;
        jsonSchema: BaseSchema;
        path: (string | number)[];
    }) => void;
    io: "input" | "output";
    counter: number;
    seen: Map<$ZodType, Seen>;
    cycles: "ref" | "throw";
    reused: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, BaseSchema>;
    } | undefined;
}
type ZodStandardSchemaWithJSON$1<T> = StandardSchemaWithJSONProps<input<T>, output<T>>;
interface ZodStandardJSONSchemaPayload<T> extends BaseSchema {
    "~standard": ZodStandardSchemaWithJSON$1<T>;
}

type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "PS256" | "PS384" | "PS512" | "EdDSA" | (string & {});
type MimeTypes = "application/json" | "application/xml" | "application/x-www-form-urlencoded" | "application/javascript" | "application/pdf" | "application/zip" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "application/octet-stream" | "application/graphql" | "text/html" | "text/plain" | "text/css" | "text/javascript" | "text/csv" | "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" | "image/webp" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "video/mp4" | "video/webm" | "video/ogg" | "font/woff" | "font/woff2" | "font/ttf" | "font/otf" | "multipart/form-data" | (string & {});
type IsAny<T> = 0 extends 1 & T ? true : false;
type Omit$1<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type MakePartial<T, K extends keyof T> = Omit$1<T, K> & InexactPartial<Pick<T, K>>;
type NoUndefined<T> = T extends undefined ? never : T;
type LoosePartial<T extends object> = InexactPartial<T> & {
    [k: string]: unknown;
};
type Mask<Keys extends PropertyKey> = {
    [K in Keys]?: true;
};
type InexactPartial<T> = {
    [P in keyof T]?: T[P] | undefined;
};
type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
    readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
type MakeReadonly<T> = T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T extends Set<infer V> ? ReadonlySet<V> : T extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T extends Array<infer V> ? ReadonlyArray<V> : T extends BuiltIn ? T : Readonly<T>;
type SomeObject = Record<PropertyKey, any>;
type Identity<T> = T;
type Flatten<T> = Identity<{
    [k in keyof T]: T[k];
}>;
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type Extend<A extends SomeObject, B extends SomeObject> = Flatten<keyof A & keyof B extends never ? A & B : {
    [K in keyof A as K extends keyof B ? never : K]: A[K];
} & {
    [K in keyof B]: B[K];
}>;
type TupleItems = ReadonlyArray<SomeType>;
type AnyFunc = (...args: any[]) => any;
type MaybeAsync<T> = T | Promise<T>;
type EnumValue = string | number;
type EnumLike = Readonly<Record<string, EnumValue>>;
type ToEnum<T extends EnumValue> = Flatten<{
    [k in T]: k;
}>;
type Literal = string | number | bigint | boolean | null | undefined;
type Primitive = string | number | symbol | bigint | boolean | null | undefined;
type HasLength = {
    length: number;
};
type Numeric = number | bigint | Date;
type PropValues = Record<string, Set<Primitive>>;
type PrimitiveSet = Set<Primitive>;
type EmptyToNever<T> = keyof T extends never ? never : T;
declare abstract class Class {
    constructor(..._args: any[]);
}

declare const version: {
    readonly major: 4;
    readonly minor: 3;
    readonly patch: number;
};

interface ParseContext<T extends $ZodIssueBase = never> {
    /** Customize error messages. */
    readonly error?: $ZodErrorMap<T>;
    /** Include the `input` field in issue objects. Default `false`. */
    readonly reportInput?: boolean;
    /** Skip eval-based fast path. Default `false`. */
    readonly jitless?: boolean;
}
/** @internal */
interface ParseContextInternal<T extends $ZodIssueBase = never> extends ParseContext<T> {
    readonly async?: boolean | undefined;
    readonly direction?: "forward" | "backward";
    readonly skipChecks?: boolean;
}
interface ParsePayload<T = unknown> {
    value: T;
    issues: $ZodRawIssue[];
    /** A may to mark a whole payload as aborted. Used in codecs/pipes. */
    aborted?: boolean;
}
type CheckFn<T> = (input: ParsePayload<T>) => MaybeAsync<void>;
interface $ZodTypeDef {
    type: "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "null" | "undefined" | "void" | "never" | "any" | "unknown" | "date" | "object" | "record" | "file" | "array" | "tuple" | "union" | "intersection" | "map" | "set" | "enum" | "literal" | "nullable" | "optional" | "nonoptional" | "success" | "transform" | "default" | "prefault" | "catch" | "nan" | "pipe" | "readonly" | "template_literal" | "promise" | "lazy" | "function" | "custom";
    error?: $ZodErrorMap<never> | undefined;
    checks?: $ZodCheck<never>[];
}
interface _$ZodTypeInternals {
    /** The `@zod/core` version of this schema */
    version: typeof version;
    /** Schema definition. */
    def: $ZodTypeDef;
    /** @internal Randomly generated ID for this schema. */
    /** @internal List of deferred initializers. */
    deferred: AnyFunc[] | undefined;
    /** @internal Parses input and runs all checks (refinements). */
    run(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
    /** @internal Parses input, doesn't run checks. */
    parse(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
    /** @internal  Stores identifiers for the set of traits implemented by this schema. */
    traits: Set<string>;
    /** @internal Indicates that a schema output type should be considered optional inside objects.
     * @default Required
     */
    /** @internal */
    optin?: "optional" | undefined;
    /** @internal */
    optout?: "optional" | undefined;
    /** @internal The set of literal values that will pass validation. Must be an exhaustive set. Used to determine optionality in z.record().
     *
     * Defined on: enum, const, literal, null, undefined
     * Passthrough: optional, nullable, branded, default, catch, pipe
     * Todo: unions?
     */
    values?: PrimitiveSet | undefined;
    /** Default value bubbled up from  */
    /** @internal A set of literal discriminators used for the fast path in discriminated unions. */
    propValues?: PropValues | undefined;
    /** @internal This flag indicates that a schema validation can be represented with a regular expression. Used to determine allowable schemas in z.templateLiteral(). */
    pattern: RegExp | undefined;
    /** @internal The constructor function of this schema. */
    constr: new (def: any) => $ZodType;
    /** @internal A catchall object for bag metadata related to this schema. Commonly modified by checks using `onattach`. */
    bag: Record<string, unknown>;
    /** @internal The set of issues this schema might throw during type checking. */
    isst: $ZodIssueBase;
    /** @internal Subject to change, not a public API. */
    processJSONSchema?: ((ctx: ToJSONSchemaContext, json: BaseSchema, params: ProcessParams) => void) | undefined;
    /** An optional method used to override `toJSONSchema` logic. */
    toJSONSchema?: () => unknown;
    /** @internal The parent of this schema. Only set during certain clone operations. */
    parent?: $ZodType | undefined;
}
/** @internal */
interface $ZodTypeInternals<out O = unknown, out I = unknown> extends _$ZodTypeInternals {
    /** @internal The inferred output type */
    output: O;
    /** @internal The inferred input type */
    input: I;
}
type $ZodStandardSchema<T> = StandardSchemaV1.Props<input<T>, output<T>>;
type SomeType = {
    _zod: _$ZodTypeInternals;
};
interface _$ZodType<T extends $ZodTypeInternals = $ZodTypeInternals> extends $ZodType<T["output"], T["input"], T> {
}
interface $ZodType<O = unknown, I = unknown, Internals extends $ZodTypeInternals<O, I> = $ZodTypeInternals<O, I>> {
    _zod: Internals;
    "~standard": $ZodStandardSchema<this>;
}
declare const $ZodType: $constructor<$ZodType>;

interface $ZodStringDef extends $ZodTypeDef {
    type: "string";
    coerce?: boolean;
    checks?: $ZodCheck<string>[];
}
interface $ZodStringInternals<Input> extends $ZodTypeInternals<string, Input> {
    def: $ZodStringDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        patterns: Set<RegExp>;
        format: string;
        contentEncoding: string;
    }>;
}
interface $ZodString<Input = unknown> extends _$ZodType<$ZodStringInternals<Input>> {
}
declare const $ZodString: $constructor<$ZodString>;
interface $ZodStringFormatDef<Format extends string = string> extends $ZodStringDef, $ZodCheckStringFormatDef<Format> {
}
interface $ZodStringFormatInternals<Format extends string = string> extends $ZodStringInternals<string>, $ZodCheckStringFormatInternals {
    def: $ZodStringFormatDef<Format>;
}
interface $ZodStringFormat<Format extends string = string> extends $ZodType {
    _zod: $ZodStringFormatInternals<Format>;
}
declare const $ZodStringFormat: $constructor<$ZodStringFormat>;
interface $ZodGUIDInternals extends $ZodStringFormatInternals<"guid"> {
}
interface $ZodGUID extends $ZodType {
    _zod: $ZodGUIDInternals;
}
declare const $ZodGUID: $constructor<$ZodGUID>;
interface $ZodUUIDDef extends $ZodStringFormatDef<"uuid"> {
    version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";
}
interface $ZodUUIDInternals extends $ZodStringFormatInternals<"uuid"> {
    def: $ZodUUIDDef;
}
interface $ZodUUID extends $ZodType {
    _zod: $ZodUUIDInternals;
}
declare const $ZodUUID: $constructor<$ZodUUID>;
interface $ZodEmailInternals extends $ZodStringFormatInternals<"email"> {
}
interface $ZodEmail extends $ZodType {
    _zod: $ZodEmailInternals;
}
declare const $ZodEmail: $constructor<$ZodEmail>;
interface $ZodURLDef extends $ZodStringFormatDef<"url"> {
    hostname?: RegExp | undefined;
    protocol?: RegExp | undefined;
    normalize?: boolean | undefined;
}
interface $ZodURLInternals extends $ZodStringFormatInternals<"url"> {
    def: $ZodURLDef;
}
interface $ZodURL extends $ZodType {
    _zod: $ZodURLInternals;
}
declare const $ZodURL: $constructor<$ZodURL>;
interface $ZodEmojiInternals extends $ZodStringFormatInternals<"emoji"> {
}
interface $ZodEmoji extends $ZodType {
    _zod: $ZodEmojiInternals;
}
declare const $ZodEmoji: $constructor<$ZodEmoji>;
interface $ZodNanoIDInternals extends $ZodStringFormatInternals<"nanoid"> {
}
interface $ZodNanoID extends $ZodType {
    _zod: $ZodNanoIDInternals;
}
declare const $ZodNanoID: $constructor<$ZodNanoID>;
interface $ZodCUIDInternals extends $ZodStringFormatInternals<"cuid"> {
}
interface $ZodCUID extends $ZodType {
    _zod: $ZodCUIDInternals;
}
declare const $ZodCUID: $constructor<$ZodCUID>;
interface $ZodCUID2Internals extends $ZodStringFormatInternals<"cuid2"> {
}
interface $ZodCUID2 extends $ZodType {
    _zod: $ZodCUID2Internals;
}
declare const $ZodCUID2: $constructor<$ZodCUID2>;
interface $ZodULIDInternals extends $ZodStringFormatInternals<"ulid"> {
}
interface $ZodULID extends $ZodType {
    _zod: $ZodULIDInternals;
}
declare const $ZodULID: $constructor<$ZodULID>;
interface $ZodXIDInternals extends $ZodStringFormatInternals<"xid"> {
}
interface $ZodXID extends $ZodType {
    _zod: $ZodXIDInternals;
}
declare const $ZodXID: $constructor<$ZodXID>;
interface $ZodKSUIDInternals extends $ZodStringFormatInternals<"ksuid"> {
}
interface $ZodKSUID extends $ZodType {
    _zod: $ZodKSUIDInternals;
}
declare const $ZodKSUID: $constructor<$ZodKSUID>;
interface $ZodISODateTimeDef extends $ZodStringFormatDef<"datetime"> {
    precision: number | null;
    offset: boolean;
    local: boolean;
}
interface $ZodISODateTimeInternals extends $ZodStringFormatInternals {
    def: $ZodISODateTimeDef;
}
interface $ZodISODateTime extends $ZodType {
    _zod: $ZodISODateTimeInternals;
}
declare const $ZodISODateTime: $constructor<$ZodISODateTime>;
interface $ZodISODateInternals extends $ZodStringFormatInternals<"date"> {
}
interface $ZodISODate extends $ZodType {
    _zod: $ZodISODateInternals;
}
declare const $ZodISODate: $constructor<$ZodISODate>;
interface $ZodISOTimeDef extends $ZodStringFormatDef<"time"> {
    precision?: number | null;
}
interface $ZodISOTimeInternals extends $ZodStringFormatInternals<"time"> {
    def: $ZodISOTimeDef;
}
interface $ZodISOTime extends $ZodType {
    _zod: $ZodISOTimeInternals;
}
declare const $ZodISOTime: $constructor<$ZodISOTime>;
interface $ZodISODurationInternals extends $ZodStringFormatInternals<"duration"> {
}
interface $ZodISODuration extends $ZodType {
    _zod: $ZodISODurationInternals;
}
declare const $ZodISODuration: $constructor<$ZodISODuration>;
interface $ZodIPv4Def extends $ZodStringFormatDef<"ipv4"> {
    version?: "v4";
}
interface $ZodIPv4Internals extends $ZodStringFormatInternals<"ipv4"> {
    def: $ZodIPv4Def;
}
interface $ZodIPv4 extends $ZodType {
    _zod: $ZodIPv4Internals;
}
declare const $ZodIPv4: $constructor<$ZodIPv4>;
interface $ZodIPv6Def extends $ZodStringFormatDef<"ipv6"> {
    version?: "v6";
}
interface $ZodIPv6Internals extends $ZodStringFormatInternals<"ipv6"> {
    def: $ZodIPv6Def;
}
interface $ZodIPv6 extends $ZodType {
    _zod: $ZodIPv6Internals;
}
declare const $ZodIPv6: $constructor<$ZodIPv6>;
interface $ZodCIDRv4Def extends $ZodStringFormatDef<"cidrv4"> {
    version?: "v4";
}
interface $ZodCIDRv4Internals extends $ZodStringFormatInternals<"cidrv4"> {
    def: $ZodCIDRv4Def;
}
interface $ZodCIDRv4 extends $ZodType {
    _zod: $ZodCIDRv4Internals;
}
declare const $ZodCIDRv4: $constructor<$ZodCIDRv4>;
interface $ZodCIDRv6Def extends $ZodStringFormatDef<"cidrv6"> {
    version?: "v6";
}
interface $ZodCIDRv6Internals extends $ZodStringFormatInternals<"cidrv6"> {
    def: $ZodCIDRv6Def;
}
interface $ZodCIDRv6 extends $ZodType {
    _zod: $ZodCIDRv6Internals;
}
declare const $ZodCIDRv6: $constructor<$ZodCIDRv6>;
interface $ZodBase64Internals extends $ZodStringFormatInternals<"base64"> {
}
interface $ZodBase64 extends $ZodType {
    _zod: $ZodBase64Internals;
}
declare const $ZodBase64: $constructor<$ZodBase64>;
interface $ZodBase64URLInternals extends $ZodStringFormatInternals<"base64url"> {
}
interface $ZodBase64URL extends $ZodType {
    _zod: $ZodBase64URLInternals;
}
declare const $ZodBase64URL: $constructor<$ZodBase64URL>;
interface $ZodE164Internals extends $ZodStringFormatInternals<"e164"> {
}
interface $ZodE164 extends $ZodType {
    _zod: $ZodE164Internals;
}
declare const $ZodE164: $constructor<$ZodE164>;
interface $ZodJWTDef extends $ZodStringFormatDef<"jwt"> {
    alg?: JWTAlgorithm | undefined;
}
interface $ZodJWTInternals extends $ZodStringFormatInternals<"jwt"> {
    def: $ZodJWTDef;
}
interface $ZodJWT extends $ZodType {
    _zod: $ZodJWTInternals;
}
declare const $ZodJWT: $constructor<$ZodJWT>;
interface $ZodNumberDef extends $ZodTypeDef {
    type: "number";
    coerce?: boolean;
}
interface $ZodNumberInternals<Input = unknown> extends $ZodTypeInternals<number, Input> {
    def: $ZodNumberDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        exclusiveMinimum: number;
        exclusiveMaximum: number;
        format: string;
        pattern: RegExp;
    }>;
}
interface $ZodNumber<Input = unknown> extends $ZodType {
    _zod: $ZodNumberInternals<Input>;
}
declare const $ZodNumber: $constructor<$ZodNumber>;
interface $ZodBooleanDef extends $ZodTypeDef {
    type: "boolean";
    coerce?: boolean;
    checks?: $ZodCheck<boolean>[];
}
interface $ZodBooleanInternals<T = unknown> extends $ZodTypeInternals<boolean, T> {
    pattern: RegExp;
    def: $ZodBooleanDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodBoolean<T = unknown> extends $ZodType {
    _zod: $ZodBooleanInternals<T>;
}
declare const $ZodBoolean: $constructor<$ZodBoolean>;
interface $ZodBigIntDef extends $ZodTypeDef {
    type: "bigint";
    coerce?: boolean;
}
interface $ZodBigIntInternals<T = unknown> extends $ZodTypeInternals<bigint, T> {
    pattern: RegExp;
    /** @internal Internal API, use with caution */
    def: $ZodBigIntDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: bigint;
        maximum: bigint;
        format: string;
    }>;
}
interface $ZodBigInt<T = unknown> extends $ZodType {
    _zod: $ZodBigIntInternals<T>;
}
declare const $ZodBigInt: $constructor<$ZodBigInt>;
interface $ZodSymbolDef extends $ZodTypeDef {
    type: "symbol";
}
interface $ZodSymbolInternals extends $ZodTypeInternals<symbol, symbol> {
    def: $ZodSymbolDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodSymbol extends $ZodType {
    _zod: $ZodSymbolInternals;
}
declare const $ZodSymbol: $constructor<$ZodSymbol>;
interface $ZodUndefinedDef extends $ZodTypeDef {
    type: "undefined";
}
interface $ZodUndefinedInternals extends $ZodTypeInternals<undefined, undefined> {
    pattern: RegExp;
    def: $ZodUndefinedDef;
    values: PrimitiveSet;
    isst: $ZodIssueInvalidType;
}
interface $ZodUndefined extends $ZodType {
    _zod: $ZodUndefinedInternals;
}
declare const $ZodUndefined: $constructor<$ZodUndefined>;
interface $ZodNullDef extends $ZodTypeDef {
    type: "null";
}
interface $ZodNullInternals extends $ZodTypeInternals<null, null> {
    pattern: RegExp;
    def: $ZodNullDef;
    values: PrimitiveSet;
    isst: $ZodIssueInvalidType;
}
interface $ZodNull extends $ZodType {
    _zod: $ZodNullInternals;
}
declare const $ZodNull: $constructor<$ZodNull>;
interface $ZodAnyDef extends $ZodTypeDef {
    type: "any";
}
interface $ZodAnyInternals extends $ZodTypeInternals<any, any> {
    def: $ZodAnyDef;
    isst: never;
}
interface $ZodAny extends $ZodType {
    _zod: $ZodAnyInternals;
}
declare const $ZodAny: $constructor<$ZodAny>;
interface $ZodUnknownDef extends $ZodTypeDef {
    type: "unknown";
}
interface $ZodUnknownInternals extends $ZodTypeInternals<unknown, unknown> {
    def: $ZodUnknownDef;
    isst: never;
}
interface $ZodUnknown extends $ZodType {
    _zod: $ZodUnknownInternals;
}
declare const $ZodUnknown: $constructor<$ZodUnknown>;
interface $ZodNeverDef extends $ZodTypeDef {
    type: "never";
}
interface $ZodNeverInternals extends $ZodTypeInternals<never, never> {
    def: $ZodNeverDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodNever extends $ZodType {
    _zod: $ZodNeverInternals;
}
declare const $ZodNever: $constructor<$ZodNever>;
interface $ZodVoidDef extends $ZodTypeDef {
    type: "void";
}
interface $ZodVoidInternals extends $ZodTypeInternals<void, void> {
    def: $ZodVoidDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodVoid extends $ZodType {
    _zod: $ZodVoidInternals;
}
declare const $ZodVoid: $constructor<$ZodVoid>;
interface $ZodDateDef extends $ZodTypeDef {
    type: "date";
    coerce?: boolean;
}
interface $ZodDateInternals<T = unknown> extends $ZodTypeInternals<Date, T> {
    def: $ZodDateDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: Date;
        maximum: Date;
        format: string;
    }>;
}
interface $ZodDate<T = unknown> extends $ZodType {
    _zod: $ZodDateInternals<T>;
}
declare const $ZodDate: $constructor<$ZodDate>;
interface $ZodArrayDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "array";
    element: T;
}
interface $ZodArrayInternals<T extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodArrayDef<T>;
    isst: $ZodIssueInvalidType;
    output: output<T>[];
    input: input<T>[];
}
interface $ZodArray<T extends SomeType = $ZodType> extends $ZodType<any, any, $ZodArrayInternals<T>> {
}
declare const $ZodArray: $constructor<$ZodArray>;
type OptionalOutSchema = {
    _zod: {
        optout: "optional";
    };
};
type OptionalInSchema = {
    _zod: {
        optin: "optional";
    };
};
type $InferObjectOutput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? IsAny<T[keyof T]> extends true ? Record<string, unknown> : Record<string, output<T[keyof T]>> : keyof (T & Extra) extends never ? Record<string, never> : Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? never : k]: T[k]["_zod"]["output"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? k : never]?: T[k]["_zod"]["output"];
} & Extra>;
type $InferObjectInput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? IsAny<T[keyof T]> extends true ? Record<string, unknown> : Record<string, input<T[keyof T]>> : keyof (T & Extra) extends never ? Record<string, never> : Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? never : k]: T[k]["_zod"]["input"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? k : never]?: T[k]["_zod"]["input"];
} & Extra>;
type $ZodObjectConfig = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
type $loose = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
type $strict = {
    out: {};
    in: {};
};
type $strip = {
    out: {};
    in: {};
};
type $catchall<T extends SomeType> = {
    out: {
        [k: string]: output<T>;
    };
    in: {
        [k: string]: input<T>;
    };
};
type $ZodShape = Readonly<{
    [k: string]: $ZodType;
}>;
interface $ZodObjectDef<Shape extends $ZodShape = $ZodShape> extends $ZodTypeDef {
    type: "object";
    shape: Shape;
    catchall?: $ZodType | undefined;
}
interface $ZodObjectInternals<
/** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodShape, out Config extends $ZodObjectConfig = $ZodObjectConfig> extends _$ZodTypeInternals {
    def: $ZodObjectDef<Shape>;
    config: Config;
    isst: $ZodIssueInvalidType | $ZodIssueUnrecognizedKeys;
    propValues: PropValues;
    output: $InferObjectOutput<Shape, Config["out"]>;
    input: $InferObjectInput<Shape, Config["in"]>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
type $ZodLooseShape = Record<string, any>;
interface $ZodObject<
/** @ts-ignore Cast variance */
out Shape extends Readonly<$ZodShape> = Readonly<$ZodShape>, out Params extends $ZodObjectConfig = $ZodObjectConfig> extends $ZodType<any, any, $ZodObjectInternals<Shape, Params>> {
}
declare const $ZodObject: $constructor<$ZodObject>;
type $InferUnionOutput<T extends SomeType> = T extends any ? output<T> : never;
type $InferUnionInput<T extends SomeType> = T extends any ? input<T> : never;
interface $ZodUnionDef<Options extends readonly SomeType[] = readonly $ZodType[]> extends $ZodTypeDef {
    type: "union";
    options: Options;
    inclusive?: boolean;
}
type IsOptionalIn<T extends SomeType> = T extends OptionalInSchema ? true : false;
type IsOptionalOut<T extends SomeType> = T extends OptionalOutSchema ? true : false;
interface $ZodUnionInternals<T extends readonly SomeType[] = readonly $ZodType[]> extends _$ZodTypeInternals {
    def: $ZodUnionDef<T>;
    isst: $ZodIssueInvalidUnion;
    pattern: T[number]["_zod"]["pattern"];
    values: T[number]["_zod"]["values"];
    output: $InferUnionOutput<T[number]>;
    input: $InferUnionInput<T[number]>;
    optin: IsOptionalIn<T[number]> extends false ? "optional" | undefined : "optional";
    optout: IsOptionalOut<T[number]> extends false ? "optional" | undefined : "optional";
}
interface $ZodUnion<T extends readonly SomeType[] = readonly $ZodType[]> extends $ZodType<any, any, $ZodUnionInternals<T>> {
    _zod: $ZodUnionInternals<T>;
}
declare const $ZodUnion: $constructor<$ZodUnion>;
interface $ZodDiscriminatedUnionDef<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodUnionDef<Options> {
    discriminator: Disc;
    unionFallback?: boolean;
}
interface $ZodDiscriminatedUnionInternals<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodUnionInternals<Options> {
    def: $ZodDiscriminatedUnionDef<Options, Disc>;
    propValues: PropValues;
}
interface $ZodDiscriminatedUnion<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodType {
    _zod: $ZodDiscriminatedUnionInternals<Options, Disc>;
}
declare const $ZodDiscriminatedUnion: $constructor<$ZodDiscriminatedUnion>;
interface $ZodIntersectionDef<Left extends SomeType = $ZodType, Right extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "intersection";
    left: Left;
    right: Right;
}
interface $ZodIntersectionInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodIntersectionDef<A, B>;
    isst: never;
    optin: A["_zod"]["optin"] | B["_zod"]["optin"];
    optout: A["_zod"]["optout"] | B["_zod"]["optout"];
    output: output<A> & output<B>;
    input: input<A> & input<B>;
}
interface $ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodIntersectionInternals<A, B>;
}
declare const $ZodIntersection: $constructor<$ZodIntersection>;
interface $ZodTupleDef<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodTypeDef {
    type: "tuple";
    items: T;
    rest: Rest;
}
type $InferTupleInputType<T extends TupleItems, Rest extends SomeType | null> = [
    ...TupleInputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? input<Rest>[] : [])
];
type TupleInputTypeNoOptionals<T extends TupleItems> = {
    [k in keyof T]: input<T[k]>;
};
type TupleInputTypeWithOptionals<T extends TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optin"] extends "optional" ? [...TupleInputTypeWithOptionals<Prefix>, input<Tail>?] : TupleInputTypeNoOptionals<T> : [];
type $InferTupleOutputType<T extends TupleItems, Rest extends SomeType | null> = [
    ...TupleOutputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? output<Rest>[] : [])
];
type TupleOutputTypeNoOptionals<T extends TupleItems> = {
    [k in keyof T]: output<T[k]>;
};
type TupleOutputTypeWithOptionals<T extends TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optout"] extends "optional" ? [...TupleOutputTypeWithOptionals<Prefix>, output<Tail>?] : TupleOutputTypeNoOptionals<T> : [];
interface $ZodTupleInternals<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends _$ZodTypeInternals {
    def: $ZodTupleDef<T, Rest>;
    isst: $ZodIssueInvalidType | $ZodIssueTooBig<unknown[]> | $ZodIssueTooSmall<unknown[]>;
    output: $InferTupleOutputType<T, Rest>;
    input: $InferTupleInputType<T, Rest>;
}
interface $ZodTuple<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodType {
    _zod: $ZodTupleInternals<T, Rest>;
}
declare const $ZodTuple: $constructor<$ZodTuple>;
type $ZodRecordKey = $ZodType<string | number | symbol, unknown>;
interface $ZodRecordDef<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "record";
    keyType: Key;
    valueType: Value;
    /** @default "strict" - errors on keys not matching keyType. "loose" passes through non-matching keys unchanged. */
    mode?: "strict" | "loose";
}
type $InferZodRecordOutput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<output<Key>, output<Value>>> : Record<output<Key>, output<Value>>;
type $InferZodRecordInput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<input<Key> & PropertyKey, input<Value>>> : Record<input<Key> & PropertyKey, input<Value>>;
interface $ZodRecordInternals<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeInternals<$InferZodRecordOutput<Key, Value>, $InferZodRecordInput<Key, Value>> {
    def: $ZodRecordDef<Key, Value>;
    isst: $ZodIssueInvalidType | $ZodIssueInvalidKey<Record<PropertyKey, unknown>>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
type $partial = {
    "~~partial": true;
};
interface $ZodRecord<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodRecordInternals<Key, Value>;
}
declare const $ZodRecord: $constructor<$ZodRecord>;
interface $ZodMapDef<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "map";
    keyType: Key;
    valueType: Value;
}
interface $ZodMapInternals<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeInternals<Map<output<Key>, output<Value>>, Map<input<Key>, input<Value>>> {
    def: $ZodMapDef<Key, Value>;
    isst: $ZodIssueInvalidType | $ZodIssueInvalidKey | $ZodIssueInvalidElement<unknown>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
interface $ZodMap<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodMapInternals<Key, Value>;
}
declare const $ZodMap: $constructor<$ZodMap>;
interface $ZodSetDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "set";
    valueType: T;
}
interface $ZodSetInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Set<output<T>>, Set<input<T>>> {
    def: $ZodSetDef<T>;
    isst: $ZodIssueInvalidType;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
interface $ZodSet<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSetInternals<T>;
}
declare const $ZodSet: $constructor<$ZodSet>;
type $InferEnumOutput<T extends EnumLike> = T[keyof T] & {};
type $InferEnumInput<T extends EnumLike> = T[keyof T] & {};
interface $ZodEnumDef<T extends EnumLike = EnumLike> extends $ZodTypeDef {
    type: "enum";
    entries: T;
}
interface $ZodEnumInternals<
/** @ts-ignore Cast variance */
out T extends EnumLike = EnumLike> extends $ZodTypeInternals<$InferEnumOutput<T>, $InferEnumInput<T>> {
    def: $ZodEnumDef<T>;
    /** @deprecated Internal API, use with caution (not deprecated) */
    values: PrimitiveSet;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    isst: $ZodIssueInvalidValue;
}
interface $ZodEnum<T extends EnumLike = EnumLike> extends $ZodType {
    _zod: $ZodEnumInternals<T>;
}
declare const $ZodEnum: $constructor<$ZodEnum>;
interface $ZodLiteralDef<T extends Literal> extends $ZodTypeDef {
    type: "literal";
    values: T[];
}
interface $ZodLiteralInternals<T extends Literal = Literal> extends $ZodTypeInternals<T, T> {
    def: $ZodLiteralDef<T>;
    values: Set<T>;
    pattern: RegExp;
    isst: $ZodIssueInvalidValue;
}
interface $ZodLiteral<T extends Literal = Literal> extends $ZodType {
    _zod: $ZodLiteralInternals<T>;
}
declare const $ZodLiteral: $constructor<$ZodLiteral>;
type _File = typeof globalThis extends {
    File: infer F extends new (...args: any[]) => any;
} ? InstanceType<F> : {};
/** Do not reference this directly. */
interface File extends _File {
    readonly type: string;
    readonly size: number;
}
interface $ZodFileDef extends $ZodTypeDef {
    type: "file";
}
interface $ZodFileInternals extends $ZodTypeInternals<File, File> {
    def: $ZodFileDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        mime: MimeTypes[];
    }>;
}
interface $ZodFile extends $ZodType {
    _zod: $ZodFileInternals;
}
declare const $ZodFile: $constructor<$ZodFile>;
interface $ZodTransformDef extends $ZodTypeDef {
    type: "transform";
    transform: (input: unknown, payload: ParsePayload<unknown>) => MaybeAsync<unknown>;
}
interface $ZodTransformInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I> {
    def: $ZodTransformDef;
    isst: never;
}
interface $ZodTransform<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodTransformInternals<O, I>;
}
declare const $ZodTransform: $constructor<$ZodTransform>;
interface $ZodOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "optional";
    innerType: T;
}
interface $ZodOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T> | undefined, input<T> | undefined> {
    def: $ZodOptionalDef<T>;
    optin: "optional";
    optout: "optional";
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
interface $ZodOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodOptionalInternals<T>;
}
declare const $ZodOptional: $constructor<$ZodOptional>;
interface $ZodExactOptionalDef<T extends SomeType = $ZodType> extends $ZodOptionalDef<T> {
}
interface $ZodExactOptionalInternals<T extends SomeType = $ZodType> extends $ZodOptionalInternals<T> {
    def: $ZodExactOptionalDef<T>;
    output: output<T>;
    input: input<T>;
}
interface $ZodExactOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodExactOptionalInternals<T>;
}
declare const $ZodExactOptional: $constructor<$ZodExactOptional>;
interface $ZodNullableDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nullable";
    innerType: T;
}
interface $ZodNullableInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T> | null, input<T> | null> {
    def: $ZodNullableDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
interface $ZodNullable<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNullableInternals<T>;
}
declare const $ZodNullable: $constructor<$ZodNullable>;
interface $ZodDefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "default";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: NoUndefined<output<T>>;
}
interface $ZodDefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, input<T> | undefined> {
    def: $ZodDefaultDef<T>;
    optin: "optional";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodDefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodDefaultInternals<T>;
}
declare const $ZodDefault: $constructor<$ZodDefault>;
interface $ZodPrefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "prefault";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: input<T>;
}
interface $ZodPrefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, input<T> | undefined> {
    def: $ZodPrefaultDef<T>;
    optin: "optional";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodPrefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPrefaultInternals<T>;
}
declare const $ZodPrefault: $constructor<$ZodPrefault>;
interface $ZodNonOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nonoptional";
    innerType: T;
}
interface $ZodNonOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, NoUndefined<input<T>>> {
    def: $ZodNonOptionalDef<T>;
    isst: $ZodIssueInvalidType;
    values: T["_zod"]["values"];
    optin: "optional" | undefined;
    optout: "optional" | undefined;
}
interface $ZodNonOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNonOptionalInternals<T>;
}
declare const $ZodNonOptional: $constructor<$ZodNonOptional>;
interface $ZodSuccessDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "success";
    innerType: T;
}
interface $ZodSuccessInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<boolean, input<T>> {
    def: $ZodSuccessDef<T>;
    isst: never;
    optin: T["_zod"]["optin"];
    optout: "optional" | undefined;
}
interface $ZodSuccess<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSuccessInternals<T>;
}
declare const $ZodSuccess: $constructor<$ZodSuccess>;
interface $ZodCatchCtx extends ParsePayload {
    /** @deprecated Use `ctx.issues` */
    error: {
        issues: $ZodIssue[];
    };
    /** @deprecated Use `ctx.value` */
    input: unknown;
}
interface $ZodCatchDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "catch";
    innerType: T;
    catchValue: (ctx: $ZodCatchCtx) => unknown;
}
interface $ZodCatchInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T>, input<T>> {
    def: $ZodCatchDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodCatch<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodCatchInternals<T>;
}
declare const $ZodCatch: $constructor<$ZodCatch>;
interface $ZodNaNDef extends $ZodTypeDef {
    type: "nan";
}
interface $ZodNaNInternals extends $ZodTypeInternals<number, number> {
    def: $ZodNaNDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodNaN extends $ZodType {
    _zod: $ZodNaNInternals;
}
declare const $ZodNaN: $constructor<$ZodNaN>;
interface $ZodPipeDef<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "pipe";
    in: A;
    out: B;
    /** Only defined inside $ZodCodec instances. */
    transform?: (value: output<A>, payload: ParsePayload<output<A>>) => MaybeAsync<input<B>>;
    /** Only defined inside $ZodCodec instances. */
    reverseTransform?: (value: input<B>, payload: ParsePayload<input<B>>) => MaybeAsync<output<A>>;
}
interface $ZodPipeInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeInternals<output<B>, input<A>> {
    def: $ZodPipeDef<A, B>;
    isst: never;
    values: A["_zod"]["values"];
    optin: A["_zod"]["optin"];
    optout: B["_zod"]["optout"];
    propValues: A["_zod"]["propValues"];
}
interface $ZodPipe<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPipeInternals<A, B>;
}
declare const $ZodPipe: $constructor<$ZodPipe>;
interface $ZodReadonlyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "readonly";
    innerType: T;
}
interface $ZodReadonlyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<MakeReadonly<output<T>>, MakeReadonly<input<T>>> {
    def: $ZodReadonlyDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    propValues: T["_zod"]["propValues"];
    values: T["_zod"]["values"];
}
interface $ZodReadonly<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodReadonlyInternals<T>;
}
declare const $ZodReadonly: $constructor<$ZodReadonly>;
interface $ZodTemplateLiteralDef extends $ZodTypeDef {
    type: "template_literal";
    parts: $ZodTemplateLiteralPart[];
    format?: string | undefined;
}
interface $ZodTemplateLiteralInternals<Template extends string = string> extends $ZodTypeInternals<Template, Template> {
    pattern: RegExp;
    def: $ZodTemplateLiteralDef;
    isst: $ZodIssueInvalidType;
}
type LiteralPart = Exclude<Literal, symbol>;
interface SchemaPartInternals extends $ZodTypeInternals<LiteralPart, LiteralPart> {
    pattern: RegExp;
}
interface SchemaPart extends $ZodType {
    _zod: SchemaPartInternals;
}
type $ZodTemplateLiteralPart = LiteralPart | SchemaPart;
interface $ZodTemplateLiteral<Template extends string = string> extends $ZodType {
    _zod: $ZodTemplateLiteralInternals<Template>;
}
declare const $ZodTemplateLiteral: $constructor<$ZodTemplateLiteral>;
type $ZodFunctionArgs = $ZodType<unknown[], unknown[]>;
type $ZodFunctionIn = $ZodFunctionArgs;
type $ZodFunctionOut = $ZodType;
type $InferInnerFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : output<Args>) => input<Returns>;
type $InferInnerFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : output<Args>) => MaybeAsync<input<Returns>>;
type $InferOuterFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : input<Args>) => output<Returns>;
type $InferOuterFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : input<Args>) => Promise<output<Returns>>;
interface $ZodFunctionDef<In extends $ZodFunctionIn = $ZodFunctionIn, Out extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodTypeDef {
    type: "function";
    input: In;
    output: Out;
}
interface $ZodFunctionInternals<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> extends $ZodTypeInternals<$InferOuterFunctionType<Args, Returns>, $InferInnerFunctionType<Args, Returns>> {
    def: $ZodFunctionDef<Args, Returns>;
    isst: $ZodIssueInvalidType;
}
interface $ZodFunction<Args extends $ZodFunctionIn = $ZodFunctionIn, Returns extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodType<any, any, $ZodFunctionInternals<Args, Returns>> {
    /** @deprecated */
    _def: $ZodFunctionDef<Args, Returns>;
    _input: $InferInnerFunctionType<Args, Returns>;
    _output: $InferOuterFunctionType<Args, Returns>;
    implement<F extends $InferInnerFunctionType<Args, Returns>>(func: F): (...args: Parameters<this["_output"]>) => ReturnType<F> extends ReturnType<this["_output"]> ? ReturnType<F> : ReturnType<this["_output"]>;
    implementAsync<F extends $InferInnerFunctionTypeAsync<Args, Returns>>(func: F): F extends $InferOuterFunctionTypeAsync<Args, Returns> ? F : $InferOuterFunctionTypeAsync<Args, Returns>;
    input<const Items extends TupleItems, const Rest extends $ZodFunctionOut = $ZodFunctionOut>(args: Items, rest?: Rest): $ZodFunction<$ZodTuple<Items, Rest>, Returns>;
    input<NewArgs extends $ZodFunctionIn>(args: NewArgs): $ZodFunction<NewArgs, Returns>;
    input(...args: any[]): $ZodFunction<any, Returns>;
    output<NewReturns extends $ZodType>(output: NewReturns): $ZodFunction<Args, NewReturns>;
}
declare const $ZodFunction: $constructor<$ZodFunction>;
interface $ZodPromiseDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "promise";
    innerType: T;
}
interface $ZodPromiseInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Promise<output<T>>, MaybeAsync<input<T>>> {
    def: $ZodPromiseDef<T>;
    isst: never;
}
interface $ZodPromise<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPromiseInternals<T>;
}
declare const $ZodPromise: $constructor<$ZodPromise>;
interface $ZodLazyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "lazy";
    getter: () => T;
}
interface $ZodLazyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T>, input<T>> {
    def: $ZodLazyDef<T>;
    isst: never;
    /** Auto-cached way to retrieve the inner schema */
    innerType: T;
    pattern: T["_zod"]["pattern"];
    propValues: T["_zod"]["propValues"];
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
}
interface $ZodLazy<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodLazyInternals<T>;
}
declare const $ZodLazy: $constructor<$ZodLazy>;
interface $ZodCustomDef<O = unknown> extends $ZodTypeDef, $ZodCheckDef {
    type: "custom";
    check: "custom";
    path?: PropertyKey[] | undefined;
    error?: $ZodErrorMap | undefined;
    params?: Record<string, any> | undefined;
    fn: (arg: O) => unknown;
}
interface $ZodCustomInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I>, $ZodCheckInternals<O> {
    def: $ZodCustomDef;
    issc: $ZodIssue;
    isst: never;
    bag: LoosePartial<{
        Class: typeof Class;
    }>;
}
interface $ZodCustom<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodCustomInternals<O, I>;
}
declare const $ZodCustom: $constructor<$ZodCustom>;
type $ZodTypes = $ZodString | $ZodNumber | $ZodBigInt | $ZodBoolean | $ZodDate | $ZodSymbol | $ZodUndefined | $ZodNullable | $ZodNull | $ZodAny | $ZodUnknown | $ZodNever | $ZodVoid | $ZodArray | $ZodObject | $ZodUnion | $ZodIntersection | $ZodTuple | $ZodRecord | $ZodMap | $ZodSet | $ZodLiteral | $ZodEnum | $ZodFunction | $ZodPromise | $ZodLazy | $ZodOptional | $ZodDefault | $ZodPrefault | $ZodTemplateLiteral | $ZodCustom | $ZodTransform | $ZodNonOptional | $ZodReadonly | $ZodNaN | $ZodPipe | $ZodSuccess | $ZodCatch | $ZodFile;

interface $ZodCheckDef {
    check: string;
    error?: $ZodErrorMap<never> | undefined;
    /** If true, no later checks will be executed if this check fails. Default `false`. */
    abort?: boolean | undefined;
    /** If provided, this check will only be executed if the function returns `true`. Defaults to `payload => z.util.isAborted(payload)`. */
    when?: ((payload: ParsePayload) => boolean) | undefined;
}
interface $ZodCheckInternals<T> {
    def: $ZodCheckDef;
    /** The set of issues this check might throw. */
    issc?: $ZodIssueBase;
    check(payload: ParsePayload<T>): MaybeAsync<void>;
    onattach: ((schema: $ZodType) => void)[];
}
interface $ZodCheck<in T = never> {
    _zod: $ZodCheckInternals<T>;
}
declare const $ZodCheck: $constructor<$ZodCheck<any>>;
interface $ZodCheckLessThanDef extends $ZodCheckDef {
    check: "less_than";
    value: Numeric;
    inclusive: boolean;
}
interface $ZodCheckLessThanInternals<T extends Numeric = Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckLessThanDef;
    issc: $ZodIssueTooBig<T>;
}
interface $ZodCheckLessThan<T extends Numeric = Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckLessThanInternals<T>;
}
declare const $ZodCheckLessThan: $constructor<$ZodCheckLessThan>;
interface $ZodCheckGreaterThanDef extends $ZodCheckDef {
    check: "greater_than";
    value: Numeric;
    inclusive: boolean;
}
interface $ZodCheckGreaterThanInternals<T extends Numeric = Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckGreaterThanDef;
    issc: $ZodIssueTooSmall<T>;
}
interface $ZodCheckGreaterThan<T extends Numeric = Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckGreaterThanInternals<T>;
}
declare const $ZodCheckGreaterThan: $constructor<$ZodCheckGreaterThan>;
interface $ZodCheckMultipleOfDef<T extends number | bigint = number | bigint> extends $ZodCheckDef {
    check: "multiple_of";
    value: T;
}
interface $ZodCheckMultipleOfInternals<T extends number | bigint = number | bigint> extends $ZodCheckInternals<T> {
    def: $ZodCheckMultipleOfDef<T>;
    issc: $ZodIssueNotMultipleOf;
}
interface $ZodCheckMultipleOf<T extends number | bigint = number | bigint> extends $ZodCheck<T> {
    _zod: $ZodCheckMultipleOfInternals<T>;
}
declare const $ZodCheckMultipleOf: $constructor<$ZodCheckMultipleOf<number | bigint>>;
type $ZodNumberFormats = "int32" | "uint32" | "float32" | "float64" | "safeint";
interface $ZodCheckNumberFormatDef extends $ZodCheckDef {
    check: "number_format";
    format: $ZodNumberFormats;
}
interface $ZodCheckNumberFormatInternals extends $ZodCheckInternals<number> {
    def: $ZodCheckNumberFormatDef;
    issc: $ZodIssueInvalidType | $ZodIssueTooBig<"number"> | $ZodIssueTooSmall<"number">;
}
interface $ZodCheckNumberFormat extends $ZodCheck<number> {
    _zod: $ZodCheckNumberFormatInternals;
}
declare const $ZodCheckNumberFormat: $constructor<$ZodCheckNumberFormat>;
interface $ZodCheckMaxLengthDef extends $ZodCheckDef {
    check: "max_length";
    maximum: number;
}
interface $ZodCheckMaxLengthInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMaxLengthDef;
    issc: $ZodIssueTooBig<T>;
}
interface $ZodCheckMaxLength<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMaxLengthInternals<T>;
}
declare const $ZodCheckMaxLength: $constructor<$ZodCheckMaxLength>;
interface $ZodCheckMinLengthDef extends $ZodCheckDef {
    check: "min_length";
    minimum: number;
}
interface $ZodCheckMinLengthInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMinLengthDef;
    issc: $ZodIssueTooSmall<T>;
}
interface $ZodCheckMinLength<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMinLengthInternals<T>;
}
declare const $ZodCheckMinLength: $constructor<$ZodCheckMinLength>;
interface $ZodCheckLengthEqualsDef extends $ZodCheckDef {
    check: "length_equals";
    length: number;
}
interface $ZodCheckLengthEqualsInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckLengthEqualsDef;
    issc: $ZodIssueTooBig<T> | $ZodIssueTooSmall<T>;
}
interface $ZodCheckLengthEquals<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckLengthEqualsInternals<T>;
}
declare const $ZodCheckLengthEquals: $constructor<$ZodCheckLengthEquals>;
type $ZodStringFormats = "email" | "url" | "emoji" | "uuid" | "guid" | "nanoid" | "cuid" | "cuid2" | "ulid" | "xid" | "ksuid" | "datetime" | "date" | "time" | "duration" | "ipv4" | "ipv6" | "cidrv4" | "cidrv6" | "base64" | "base64url" | "json_string" | "e164" | "lowercase" | "uppercase" | "regex" | "jwt" | "starts_with" | "ends_with" | "includes";
interface $ZodCheckStringFormatDef<Format extends string = string> extends $ZodCheckDef {
    check: "string_format";
    format: Format;
    pattern?: RegExp | undefined;
}
interface $ZodCheckStringFormatInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStringFormatDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegexDef extends $ZodCheckStringFormatDef {
    format: "regex";
    pattern: RegExp;
}
interface $ZodCheckRegexInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckRegexDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegex extends $ZodCheck<string> {
    _zod: $ZodCheckRegexInternals;
}
declare const $ZodCheckRegex: $constructor<$ZodCheckRegex>;
interface $ZodCheckLowerCaseDef extends $ZodCheckStringFormatDef<"lowercase"> {
}
interface $ZodCheckLowerCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckLowerCaseDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckLowerCase extends $ZodCheck<string> {
    _zod: $ZodCheckLowerCaseInternals;
}
declare const $ZodCheckLowerCase: $constructor<$ZodCheckLowerCase>;
interface $ZodCheckUpperCaseDef extends $ZodCheckStringFormatDef<"uppercase"> {
}
interface $ZodCheckUpperCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckUpperCaseDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckUpperCase extends $ZodCheck<string> {
    _zod: $ZodCheckUpperCaseInternals;
}
declare const $ZodCheckUpperCase: $constructor<$ZodCheckUpperCase>;
interface $ZodCheckIncludesDef extends $ZodCheckStringFormatDef<"includes"> {
    includes: string;
    position?: number | undefined;
}
interface $ZodCheckIncludesInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckIncludesDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckIncludes extends $ZodCheck<string> {
    _zod: $ZodCheckIncludesInternals;
}
declare const $ZodCheckIncludes: $constructor<$ZodCheckIncludes>;
interface $ZodCheckStartsWithDef extends $ZodCheckStringFormatDef<"starts_with"> {
    prefix: string;
}
interface $ZodCheckStartsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStartsWithDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckStartsWith extends $ZodCheck<string> {
    _zod: $ZodCheckStartsWithInternals;
}
declare const $ZodCheckStartsWith: $constructor<$ZodCheckStartsWith>;
interface $ZodCheckEndsWithDef extends $ZodCheckStringFormatDef<"ends_with"> {
    suffix: string;
}
interface $ZodCheckEndsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckEndsWithDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckEndsWith extends $ZodCheckInternals<string> {
    _zod: $ZodCheckEndsWithInternals;
}
declare const $ZodCheckEndsWith: $constructor<$ZodCheckEndsWith>;

interface $ZodIssueBase {
    readonly code?: string;
    readonly input?: unknown;
    readonly path: PropertyKey[];
    readonly message: string;
}
type $ZodInvalidTypeExpected = "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "undefined" | "null" | "never" | "void" | "date" | "array" | "object" | "tuple" | "record" | "map" | "set" | "file" | "nonoptional" | "nan" | "function" | (string & {});
interface $ZodIssueInvalidType<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_type";
    readonly expected: $ZodInvalidTypeExpected;
    readonly input?: Input;
}
interface $ZodIssueTooBig<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_big";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly maximum: number | bigint;
    readonly inclusive?: boolean;
    readonly exact?: boolean;
    readonly input?: Input;
}
interface $ZodIssueTooSmall<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_small";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly minimum: number | bigint;
    /** True if the allowable range includes the minimum */
    readonly inclusive?: boolean;
    /** True if the allowed value is fixed (e.g.` z.length(5)`), not a range (`z.minLength(5)`) */
    readonly exact?: boolean;
    readonly input?: Input;
}
interface $ZodIssueInvalidStringFormat extends $ZodIssueBase {
    readonly code: "invalid_format";
    readonly format: $ZodStringFormats | (string & {});
    readonly pattern?: string;
    readonly input?: string;
}
interface $ZodIssueNotMultipleOf<Input extends number | bigint = number | bigint> extends $ZodIssueBase {
    readonly code: "not_multiple_of";
    readonly divisor: number;
    readonly input?: Input;
}
interface $ZodIssueUnrecognizedKeys extends $ZodIssueBase {
    readonly code: "unrecognized_keys";
    readonly keys: string[];
    readonly input?: Record<string, unknown>;
}
interface $ZodIssueInvalidUnionNoMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: $ZodIssue[][];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly inclusive?: true;
}
interface $ZodIssueInvalidUnionMultipleMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: [];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly inclusive: false;
}
type $ZodIssueInvalidUnion = $ZodIssueInvalidUnionNoMatch | $ZodIssueInvalidUnionMultipleMatch;
interface $ZodIssueInvalidKey<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_key";
    readonly origin: "map" | "record";
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
interface $ZodIssueInvalidElement<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_element";
    readonly origin: "map" | "set";
    readonly key: unknown;
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
interface $ZodIssueInvalidValue<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_value";
    readonly values: Primitive[];
    readonly input?: Input;
}
interface $ZodIssueCustom extends $ZodIssueBase {
    readonly code: "custom";
    readonly params?: Record<string, any> | undefined;
    readonly input?: unknown;
}
type $ZodIssue = $ZodIssueInvalidType | $ZodIssueTooBig | $ZodIssueTooSmall | $ZodIssueInvalidStringFormat | $ZodIssueNotMultipleOf | $ZodIssueUnrecognizedKeys | $ZodIssueInvalidUnion | $ZodIssueInvalidKey | $ZodIssueInvalidElement | $ZodIssueInvalidValue | $ZodIssueCustom;
type $ZodInternalIssue<T extends $ZodIssueBase = $ZodIssue> = T extends any ? RawIssue$1<T> : never;
type RawIssue$1<T extends $ZodIssueBase> = T extends any ? Flatten<MakePartial<T, "message" | "path"> & {
    /** The input data */
    readonly input: unknown;
    /** The schema or check that originated this issue. */
    readonly inst?: $ZodType | $ZodCheck;
    /** If `true`, Zod will continue executing checks/refinements after this issue. */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
type $ZodRawIssue<T extends $ZodIssueBase = $ZodIssue> = $ZodInternalIssue<T>;
interface $ZodErrorMap<T extends $ZodIssueBase = $ZodIssue> {
    (issue: $ZodRawIssue<T>): {
        message: string;
    } | string | undefined | null;
}
interface $ZodError<T = unknown> extends Error {
    type: T;
    issues: $ZodIssue[];
    _zod: {
        output: T;
        def: $ZodIssue[];
    };
    stack?: string;
    name: string;
}
declare const $ZodError: $constructor<$ZodError>;
type $ZodFlattenedError<T, U = string> = _FlattenedError<T, U>;
type _FlattenedError<T, U = string> = {
    formErrors: U[];
    fieldErrors: {
        [P in keyof T]?: U[];
    };
};
type _ZodFormattedError<T, U = string> = T extends [any, ...any[]] ? {
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
} : T extends any[] ? {
    [k: number]: $ZodFormattedError<T[number], U>;
} : T extends object ? Flatten<{
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
}> : any;
type $ZodFormattedError<T, U = string> = {
    _errors: U[];
} & Flatten<_ZodFormattedError<T, U>>;

type ZodTrait = {
    _zod: {
        def: any;
        [k: string]: any;
    };
};
interface $constructor<T extends ZodTrait, D = T["_zod"]["def"]> {
    new (def: D): T;
    init(inst: T, def: D): asserts inst is T;
}
declare function $constructor<T extends ZodTrait, D = T["_zod"]["def"]>(name: string, initializer: (inst: T, def: D) => void, params?: {
    Parent?: typeof Class;
}): $constructor<T, D>;
declare const $brand: unique symbol;
type $brand<T extends string | number | symbol = string | number | symbol> = {
    [$brand]: {
        [k in T]: true;
    };
};
type $ZodBranded<T extends SomeType, Brand extends string | number | symbol, Dir extends "in" | "out" | "inout" = "out"> = T & (Dir extends "inout" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
        output: output<T> & $brand<Brand>;
    };
} : Dir extends "in" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
    };
} : {
    _zod: {
        output: output<T> & $brand<Brand>;
    };
});
type input<T> = T extends {
    _zod: {
        input: any;
    };
} ? T["_zod"]["input"] : unknown;
type output<T> = T extends {
    _zod: {
        output: any;
    };
} ? T["_zod"]["output"] : unknown;

type Params<T extends $ZodType | $ZodCheck, IssueTypes extends $ZodIssueBase, OmitKeys extends keyof T["_zod"]["def"] = never> = Flatten<Partial<EmptyToNever<Omit<T["_zod"]["def"], OmitKeys> & ([IssueTypes] extends [never] ? {} : {
    error?: string | $ZodErrorMap<IssueTypes> | undefined;
    /** @deprecated This parameter is deprecated. Use `error` instead. */
    message?: string | undefined;
})>>>;
type TypeParams<T extends $ZodType = $ZodType & {
    _isst: never;
}, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error"> = never> = Params<T, NonNullable<T["_zod"]["isst"]>, "type" | "checks" | "error" | AlsoOmit>;
type CheckParams<T extends $ZodCheck = $ZodCheck, // & { _issc: never },
AlsoOmit extends Exclude<keyof T["_zod"]["def"], "check" | "error"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "check" | "error" | AlsoOmit>;
type CheckStringFormatParams<T extends $ZodStringFormat = $ZodStringFormat, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "coerce" | "checks" | "error" | "check" | "format"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "type" | "coerce" | "checks" | "error" | "check" | "format" | AlsoOmit>;
type CheckTypeParams<T extends $ZodType & $ZodCheck = $ZodType & $ZodCheck, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error" | "check"> = never> = Params<T, NonNullable<T["_zod"]["isst"] | T["_zod"]["issc"]>, "type" | "checks" | "error" | "check" | AlsoOmit>;
type $ZodCheckEmailParams = CheckStringFormatParams<$ZodEmail, "when">;
type $ZodCheckGUIDParams = CheckStringFormatParams<$ZodGUID, "pattern" | "when">;
type $ZodCheckUUIDParams = CheckStringFormatParams<$ZodUUID, "pattern" | "when">;
type $ZodCheckURLParams = CheckStringFormatParams<$ZodURL, "when">;
type $ZodCheckEmojiParams = CheckStringFormatParams<$ZodEmoji, "when">;
type $ZodCheckNanoIDParams = CheckStringFormatParams<$ZodNanoID, "when">;
type $ZodCheckCUIDParams = CheckStringFormatParams<$ZodCUID, "when">;
type $ZodCheckCUID2Params = CheckStringFormatParams<$ZodCUID2, "when">;
type $ZodCheckULIDParams = CheckStringFormatParams<$ZodULID, "when">;
type $ZodCheckXIDParams = CheckStringFormatParams<$ZodXID, "when">;
type $ZodCheckKSUIDParams = CheckStringFormatParams<$ZodKSUID, "when">;
type $ZodCheckIPv4Params = CheckStringFormatParams<$ZodIPv4, "pattern" | "when" | "version">;
type $ZodCheckIPv6Params = CheckStringFormatParams<$ZodIPv6, "pattern" | "when" | "version">;
type $ZodCheckCIDRv4Params = CheckStringFormatParams<$ZodCIDRv4, "pattern" | "when">;
type $ZodCheckCIDRv6Params = CheckStringFormatParams<$ZodCIDRv6, "pattern" | "when">;
type $ZodCheckBase64Params = CheckStringFormatParams<$ZodBase64, "pattern" | "when">;
type $ZodCheckBase64URLParams = CheckStringFormatParams<$ZodBase64URL, "pattern" | "when">;
type $ZodCheckE164Params = CheckStringFormatParams<$ZodE164, "when">;
type $ZodCheckJWTParams = CheckStringFormatParams<$ZodJWT, "pattern" | "when">;
type $ZodCheckISODateTimeParams = CheckStringFormatParams<$ZodISODateTime, "pattern" | "when">;
type $ZodCheckISODateParams = CheckStringFormatParams<$ZodISODate, "pattern" | "when">;
type $ZodCheckISOTimeParams = CheckStringFormatParams<$ZodISOTime, "pattern" | "when">;
type $ZodCheckISODurationParams = CheckStringFormatParams<$ZodISODuration, "when">;
type $ZodCheckNumberFormatParams = CheckParams<$ZodCheckNumberFormat, "format" | "when">;
type $ZodCheckLessThanParams = CheckParams<$ZodCheckLessThan, "inclusive" | "value" | "when">;
type $ZodCheckGreaterThanParams = CheckParams<$ZodCheckGreaterThan, "inclusive" | "value" | "when">;
type $ZodCheckMultipleOfParams = CheckParams<$ZodCheckMultipleOf, "value" | "when">;
type $ZodCheckMaxLengthParams = CheckParams<$ZodCheckMaxLength, "maximum" | "when">;
type $ZodCheckMinLengthParams = CheckParams<$ZodCheckMinLength, "minimum" | "when">;
type $ZodCheckLengthEqualsParams = CheckParams<$ZodCheckLengthEquals, "length" | "when">;
type $ZodCheckRegexParams = CheckParams<$ZodCheckRegex, "format" | "pattern" | "when">;
type $ZodCheckLowerCaseParams = CheckParams<$ZodCheckLowerCase, "format" | "when">;
type $ZodCheckUpperCaseParams = CheckParams<$ZodCheckUpperCase, "format" | "when">;
type $ZodCheckIncludesParams = CheckParams<$ZodCheckIncludes, "includes" | "format" | "when" | "pattern">;
type $ZodCheckStartsWithParams = CheckParams<$ZodCheckStartsWith, "prefix" | "format" | "when" | "pattern">;
type $ZodCheckEndsWithParams = CheckParams<$ZodCheckEndsWith, "suffix" | "format" | "pattern" | "when">;
type $ZodEnumParams = TypeParams<$ZodEnum, "entries">;
type $ZodNonOptionalParams = TypeParams<$ZodNonOptional, "innerType">;
type $ZodCustomParams = CheckTypeParams<$ZodCustom, "fn">;
type $ZodSuperRefineIssue<T extends $ZodIssueBase = $ZodIssue> = T extends any ? RawIssue<T> : never;
type RawIssue<T extends $ZodIssueBase> = T extends any ? Flatten<MakePartial<T, "message" | "path"> & {
    /** The schema or check that originated this issue. */
    readonly inst?: $ZodType | $ZodCheck;
    /** If `true`, Zod will execute subsequent checks/refinements instead of immediately aborting */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
interface $RefinementCtx<T = unknown> extends ParsePayload<T> {
    addIssue(arg: string | $ZodSuperRefineIssue): void;
}

/** An Error-like class used to store Zod validation issues.  */
interface ZodError<T = unknown> extends $ZodError<T> {
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    format(): $ZodFormattedError<T>;
    format<U>(mapper: (issue: $ZodIssue) => U): $ZodFormattedError<T, U>;
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    flatten(): $ZodFlattenedError<T>;
    flatten<U>(mapper: (issue: $ZodIssue) => U): $ZodFlattenedError<T, U>;
    /** @deprecated Push directly to `.issues` instead. */
    addIssue(issue: $ZodIssue): void;
    /** @deprecated Push directly to `.issues` instead. */
    addIssues(issues: $ZodIssue[]): void;
    /** @deprecated Check `err.issues.length === 0` instead. */
    isEmpty: boolean;
}
declare const ZodError: $constructor<ZodError>;

type ZodSafeParseResult<T> = ZodSafeParseSuccess<T> | ZodSafeParseError<T>;
type ZodSafeParseSuccess<T> = {
    success: true;
    data: T;
    error?: never;
};
type ZodSafeParseError<T> = {
    success: false;
    data?: never;
    error: ZodError<T>;
};

type ZodStandardSchemaWithJSON<T> = StandardSchemaWithJSONProps<input<T>, output<T>>;
interface _ZodType<out Internals extends $ZodTypeInternals = $ZodTypeInternals> extends ZodType<any, any, Internals> {
}
interface ZodType<out Output = unknown, out Input = unknown, out Internals extends $ZodTypeInternals<Output, Input> = $ZodTypeInternals<Output, Input>> extends $ZodType<Output, Input, Internals> {
    def: Internals["def"];
    type: Internals["def"]["type"];
    /** @deprecated Use `.def` instead. */
    _def: Internals["def"];
    /** @deprecated Use `z.output<typeof schema>` instead. */
    _output: Internals["output"];
    /** @deprecated Use `z.input<typeof schema>` instead. */
    _input: Internals["input"];
    "~standard": ZodStandardSchemaWithJSON<this>;
    /** Converts this schema to a JSON Schema representation. */
    toJSONSchema(params?: ToJSONSchemaParams): ZodStandardJSONSchemaPayload<this>;
    check(...checks: (CheckFn<output<this>> | $ZodCheck<output<this>>)[]): this;
    with(...checks: (CheckFn<output<this>> | $ZodCheck<output<this>>)[]): this;
    clone(def?: Internals["def"], params?: {
        parent: boolean;
    }): this;
    register<R extends $ZodRegistry>(registry: R, ...meta: this extends R["_schema"] ? undefined extends R["_meta"] ? [$replace<R["_meta"], this>?] : [$replace<R["_meta"], this>] : ["Incompatible schema"]): this;
    brand<T extends PropertyKey = PropertyKey, Dir extends "in" | "out" | "inout" = "out">(value?: T): PropertyKey extends T ? this : $ZodBranded<this, T, Dir>;
    parse(data: unknown, params?: ParseContext<$ZodIssue>): output<this>;
    safeParse(data: unknown, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
    parseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
    safeParseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
    spa: (data: unknown, params?: ParseContext<$ZodIssue>) => Promise<ZodSafeParseResult<output<this>>>;
    encode(data: output<this>, params?: ParseContext<$ZodIssue>): input<this>;
    decode(data: input<this>, params?: ParseContext<$ZodIssue>): output<this>;
    encodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<input<this>>;
    decodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
    safeEncode(data: output<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<input<this>>;
    safeDecode(data: input<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
    safeEncodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<input<this>>>;
    safeDecodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
    refine<Ch extends (arg: output<this>) => unknown | Promise<unknown>>(check: Ch, params?: string | $ZodCustomParams): Ch extends (arg: any) => arg is infer R ? this & ZodType<R, input<this>> : this;
    superRefine(refinement: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => void | Promise<void>): this;
    overwrite(fn: (x: output<this>) => output<this>): this;
    optional(): ZodOptional<this>;
    exactOptional(): ZodExactOptional<this>;
    nonoptional(params?: string | $ZodNonOptionalParams): ZodNonOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodOptional<ZodNullable<this>>;
    default(def: NoUndefined<output<this>>): ZodDefault<this>;
    default(def: () => NoUndefined<output<this>>): ZodDefault<this>;
    prefault(def: () => input<this>): ZodPrefault<this>;
    prefault(def: input<this>): ZodPrefault<this>;
    array(): ZodArray<this>;
    or<T extends SomeType>(option: T): ZodUnion<[this, T]>;
    and<T extends SomeType>(incoming: T): ZodIntersection<this, T>;
    transform<NewOut>(transform: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => NewOut | Promise<NewOut>): ZodPipe<this, ZodTransform<Awaited<NewOut>, output<this>>>;
    catch(def: output<this>): ZodCatch<this>;
    catch(def: (ctx: $ZodCatchCtx) => output<this>): ZodCatch<this>;
    pipe<T extends $ZodType<any, output<this>>>(target: T | $ZodType<any, output<this>>): ZodPipe<this, T>;
    readonly(): ZodReadonly<this>;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified description */
    describe(description: string): this;
    description?: string;
    /** Returns the metadata associated with this instance in `z.globalRegistry` */
    meta(): $replace<GlobalMeta, this> | undefined;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified metadata */
    meta(data: $replace<GlobalMeta, this>): this;
    /** @deprecated Try safe-parsing `undefined` (this is what `isOptional` does internally):
     *
     * ```ts
     * const schema = z.string().optional();
     * const isOptional = schema.safeParse(undefined).success; // true
     * ```
     */
    isOptional(): boolean;
    /**
     * @deprecated Try safe-parsing `null` (this is what `isNullable` does internally):
     *
     * ```ts
     * const schema = z.string().nullable();
     * const isNullable = schema.safeParse(null).success; // true
     * ```
     */
    isNullable(): boolean;
    apply<T>(fn: (schema: this) => T): T;
}
declare const ZodType: $constructor<ZodType>;
interface _ZodString<T extends $ZodStringInternals<unknown> = $ZodStringInternals<unknown>> extends _ZodType<T> {
    format: string | null;
    minLength: number | null;
    maxLength: number | null;
    regex(regex: RegExp, params?: string | $ZodCheckRegexParams): this;
    includes(value: string, params?: string | $ZodCheckIncludesParams): this;
    startsWith(value: string, params?: string | $ZodCheckStartsWithParams): this;
    endsWith(value: string, params?: string | $ZodCheckEndsWithParams): this;
    min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
    nonempty(params?: string | $ZodCheckMinLengthParams): this;
    lowercase(params?: string | $ZodCheckLowerCaseParams): this;
    uppercase(params?: string | $ZodCheckUpperCaseParams): this;
    trim(): this;
    normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD" | (string & {})): this;
    toLowerCase(): this;
    toUpperCase(): this;
    slugify(): this;
}
/** @internal */
declare const _ZodString: $constructor<_ZodString>;
interface ZodString extends _ZodString<$ZodStringInternals<string>> {
    /** @deprecated Use `z.email()` instead. */
    email(params?: string | $ZodCheckEmailParams): this;
    /** @deprecated Use `z.url()` instead. */
    url(params?: string | $ZodCheckURLParams): this;
    /** @deprecated Use `z.jwt()` instead. */
    jwt(params?: string | $ZodCheckJWTParams): this;
    /** @deprecated Use `z.emoji()` instead. */
    emoji(params?: string | $ZodCheckEmojiParams): this;
    /** @deprecated Use `z.guid()` instead. */
    guid(params?: string | $ZodCheckGUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuid(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv4(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv6(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv7(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.nanoid()` instead. */
    nanoid(params?: string | $ZodCheckNanoIDParams): this;
    /** @deprecated Use `z.guid()` instead. */
    guid(params?: string | $ZodCheckGUIDParams): this;
    /** @deprecated Use `z.cuid()` instead. */
    cuid(params?: string | $ZodCheckCUIDParams): this;
    /** @deprecated Use `z.cuid2()` instead. */
    cuid2(params?: string | $ZodCheckCUID2Params): this;
    /** @deprecated Use `z.ulid()` instead. */
    ulid(params?: string | $ZodCheckULIDParams): this;
    /** @deprecated Use `z.base64()` instead. */
    base64(params?: string | $ZodCheckBase64Params): this;
    /** @deprecated Use `z.base64url()` instead. */
    base64url(params?: string | $ZodCheckBase64URLParams): this;
    /** @deprecated Use `z.xid()` instead. */
    xid(params?: string | $ZodCheckXIDParams): this;
    /** @deprecated Use `z.ksuid()` instead. */
    ksuid(params?: string | $ZodCheckKSUIDParams): this;
    /** @deprecated Use `z.ipv4()` instead. */
    ipv4(params?: string | $ZodCheckIPv4Params): this;
    /** @deprecated Use `z.ipv6()` instead. */
    ipv6(params?: string | $ZodCheckIPv6Params): this;
    /** @deprecated Use `z.cidrv4()` instead. */
    cidrv4(params?: string | $ZodCheckCIDRv4Params): this;
    /** @deprecated Use `z.cidrv6()` instead. */
    cidrv6(params?: string | $ZodCheckCIDRv6Params): this;
    /** @deprecated Use `z.e164()` instead. */
    e164(params?: string | $ZodCheckE164Params): this;
    /** @deprecated Use `z.iso.datetime()` instead. */
    datetime(params?: string | $ZodCheckISODateTimeParams): this;
    /** @deprecated Use `z.iso.date()` instead. */
    date(params?: string | $ZodCheckISODateParams): this;
    /** @deprecated Use `z.iso.time()` instead. */
    time(params?: string | $ZodCheckISOTimeParams): this;
    /** @deprecated Use `z.iso.duration()` instead. */
    duration(params?: string | $ZodCheckISODurationParams): this;
}
declare const ZodString: $constructor<ZodString>;
interface _ZodNumber<Internals extends $ZodNumberInternals = $ZodNumberInternals> extends _ZodType<Internals> {
    gt(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    /** Identical to .min() */
    gte(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    min(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    lt(value: number, params?: string | $ZodCheckLessThanParams): this;
    /** Identical to .max() */
    lte(value: number, params?: string | $ZodCheckLessThanParams): this;
    max(value: number, params?: string | $ZodCheckLessThanParams): this;
    /** Consider `z.int()` instead. This API is considered *legacy*; it will never be removed but a better alternative exists. */
    int(params?: string | $ZodCheckNumberFormatParams): this;
    /** @deprecated This is now identical to `.int()`. Only numbers in the safe integer range are accepted. */
    safe(params?: string | $ZodCheckNumberFormatParams): this;
    positive(params?: string | $ZodCheckGreaterThanParams): this;
    nonnegative(params?: string | $ZodCheckGreaterThanParams): this;
    negative(params?: string | $ZodCheckLessThanParams): this;
    nonpositive(params?: string | $ZodCheckLessThanParams): this;
    multipleOf(value: number, params?: string | $ZodCheckMultipleOfParams): this;
    /** @deprecated Use `.multipleOf()` instead. */
    step(value: number, params?: string | $ZodCheckMultipleOfParams): this;
    /** @deprecated In v4 and later, z.number() does not allow infinite values by default. This is a no-op. */
    finite(params?: unknown): this;
    minValue: number | null;
    maxValue: number | null;
    /** @deprecated Check the `format` property instead.  */
    isInt: boolean;
    /** @deprecated Number schemas no longer accept infinite values, so this always returns `true`. */
    isFinite: boolean;
    format: string | null;
}
interface ZodNumber extends _ZodNumber<$ZodNumberInternals<number>> {
}
declare const ZodNumber: $constructor<ZodNumber>;
interface _ZodBoolean<T extends $ZodBooleanInternals = $ZodBooleanInternals> extends _ZodType<T> {
}
interface ZodBoolean extends _ZodBoolean<$ZodBooleanInternals<boolean>> {
}
declare const ZodBoolean: $constructor<ZodBoolean>;
interface ZodNull extends _ZodType<$ZodNullInternals> {
}
declare const ZodNull: $constructor<ZodNull>;
interface _ZodDate<T extends $ZodDateInternals = $ZodDateInternals> extends _ZodType<T> {
    min(value: number | Date, params?: string | $ZodCheckGreaterThanParams): this;
    max(value: number | Date, params?: string | $ZodCheckLessThanParams): this;
    /** @deprecated Not recommended. */
    minDate: Date | null;
    /** @deprecated Not recommended. */
    maxDate: Date | null;
}
interface ZodDate extends _ZodDate<$ZodDateInternals<Date>> {
}
declare const ZodDate: $constructor<ZodDate>;
interface ZodArray<T extends SomeType = $ZodType> extends _ZodType<$ZodArrayInternals<T>>, $ZodArray<T> {
    element: T;
    min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
    nonempty(params?: string | $ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
    unwrap(): T;
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodArray: $constructor<ZodArray>;
type SafeExtendShape<Base extends $ZodShape, Ext extends $ZodLooseShape> = {
    [K in keyof Ext]: K extends keyof Base ? output<Ext[K]> extends output<Base[K]> ? input<Ext[K]> extends input<Base[K]> ? Ext[K] : never : never : Ext[K];
};
interface ZodObject<
/** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodLooseShape, out Config extends $ZodObjectConfig = $strip> extends _ZodType<$ZodObjectInternals<Shape, Config>>, $ZodObject<Shape, Config> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    shape: Shape;
    keyof(): ZodEnum<ToEnum<keyof Shape & string>>;
    /** Define a schema to validate all unrecognized keys. This overrides the existing strict/loose behavior. */
    catchall<T extends SomeType>(schema: T): ZodObject<Shape, $catchall<T>>;
    /** @deprecated Use `z.looseObject()` or `.loose()` instead. */
    passthrough(): ZodObject<Shape, $loose>;
    /** Consider `z.looseObject(A.shape)` instead */
    loose(): ZodObject<Shape, $loose>;
    /** Consider `z.strictObject(A.shape)` instead */
    strict(): ZodObject<Shape, $strict>;
    /** This is the default behavior. This method call is likely unnecessary. */
    strip(): ZodObject<Shape, $strip>;
    extend<U extends $ZodLooseShape>(shape: U): ZodObject<Extend<Shape, U>, Config>;
    safeExtend<U extends $ZodLooseShape>(shape: SafeExtendShape<Shape, U> & Partial<Record<keyof Shape, SomeType>>): ZodObject<Extend<Shape, U>, Config>;
    /**
     * @deprecated Use [`A.extend(B.shape)`](https://zod.dev/api?id=extend) instead.
     */
    merge<U extends ZodObject>(other: U): ZodObject<Extend<Shape, U["shape"]>, U["_zod"]["config"]>;
    pick<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<Flatten<Pick<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    omit<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<Flatten<Omit<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    partial(): ZodObject<{
        [k in keyof Shape]: ZodOptional<Shape[k]>;
    }, Config>;
    partial<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        [k in keyof Shape]: k extends keyof M ? ZodOptional<Shape[k]> : Shape[k];
    }, Config>;
    required(): ZodObject<{
        [k in keyof Shape]: ZodNonOptional<Shape[k]>;
    }, Config>;
    required<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        [k in keyof Shape]: k extends keyof M ? ZodNonOptional<Shape[k]> : Shape[k];
    }, Config>;
}
declare const ZodObject: $constructor<ZodObject>;
interface ZodUnion<T extends readonly SomeType[] = readonly $ZodType[]> extends _ZodType<$ZodUnionInternals<T>>, $ZodUnion<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    options: T;
}
declare const ZodUnion: $constructor<ZodUnion>;
interface ZodDiscriminatedUnion<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends ZodUnion<Options>, $ZodDiscriminatedUnion<Options, Disc> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    _zod: $ZodDiscriminatedUnionInternals<Options, Disc>;
    def: $ZodDiscriminatedUnionDef<Options, Disc>;
}
declare const ZodDiscriminatedUnion: $constructor<ZodDiscriminatedUnion>;
interface ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodIntersectionInternals<A, B>>, $ZodIntersection<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodIntersection: $constructor<ZodIntersection>;
interface ZodTuple<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends _ZodType<$ZodTupleInternals<T, Rest>>, $ZodTuple<T, Rest> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    rest<Rest extends SomeType = $ZodType>(rest: Rest): ZodTuple<T, Rest>;
}
declare const ZodTuple: $constructor<ZodTuple>;
interface ZodEnum<
/** @ts-ignore Cast variance */
out T extends EnumLike = EnumLike> extends _ZodType<$ZodEnumInternals<T>>, $ZodEnum<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    enum: T;
    options: Array<T[keyof T]>;
    extract<const U extends readonly (keyof T)[]>(values: U, params?: string | $ZodEnumParams): ZodEnum<Flatten<Pick<T, U[number]>>>;
    exclude<const U extends readonly (keyof T)[]>(values: U, params?: string | $ZodEnumParams): ZodEnum<Flatten<Omit<T, U[number]>>>;
}
declare const ZodEnum: $constructor<ZodEnum>;
interface ZodLiteral<T extends Literal = Literal> extends _ZodType<$ZodLiteralInternals<T>>, $ZodLiteral<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    values: Set<T>;
    /** @legacy Use `.values` instead. Accessing this property will throw an error if the literal accepts multiple values. */
    value: T;
}
declare const ZodLiteral: $constructor<ZodLiteral>;
interface ZodTransform<O = unknown, I = unknown> extends _ZodType<$ZodTransformInternals<O, I>>, $ZodTransform<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodTransform: $constructor<ZodTransform>;
interface ZodOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodOptionalInternals<T>>, $ZodOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodOptional: $constructor<ZodOptional>;
interface ZodExactOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodExactOptionalInternals<T>>, $ZodExactOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodExactOptional: $constructor<ZodExactOptional>;
interface ZodNullable<T extends SomeType = $ZodType> extends _ZodType<$ZodNullableInternals<T>>, $ZodNullable<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodNullable: $constructor<ZodNullable>;
interface ZodDefault<T extends SomeType = $ZodType> extends _ZodType<$ZodDefaultInternals<T>>, $ZodDefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use `.unwrap()` instead. */
    removeDefault(): T;
}
declare const ZodDefault: $constructor<ZodDefault>;
interface ZodPrefault<T extends SomeType = $ZodType> extends _ZodType<$ZodPrefaultInternals<T>>, $ZodPrefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodPrefault: $constructor<ZodPrefault>;
interface ZodNonOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodNonOptionalInternals<T>>, $ZodNonOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodNonOptional: $constructor<ZodNonOptional>;
interface ZodCatch<T extends SomeType = $ZodType> extends _ZodType<$ZodCatchInternals<T>>, $ZodCatch<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use `.unwrap()` instead. */
    removeCatch(): T;
}
declare const ZodCatch: $constructor<ZodCatch>;
interface ZodNaN extends _ZodType<$ZodNaNInternals>, $ZodNaN {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodNaN: $constructor<ZodNaN>;
interface ZodPipe<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodPipeInternals<A, B>>, $ZodPipe<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    in: A;
    out: B;
}
declare const ZodPipe: $constructor<ZodPipe>;
interface ZodReadonly<T extends SomeType = $ZodType> extends _ZodType<$ZodReadonlyInternals<T>>, $ZodReadonly<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodReadonly: $constructor<ZodReadonly>;
interface ZodCustom<O = unknown, I = unknown> extends _ZodType<$ZodCustomInternals<O, I>>, $ZodCustom<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodCustom: $constructor<ZodCustom>;

type SpreadsheetValidationIssueCode = "WORKBOOK_NO_SHEETS" | "WORKBOOK_TOO_MANY_SHEETS" | "SHEET_NAME_EMPTY" | "SHEET_NAME_TOO_LONG" | "SHEET_NAME_INVALID_CHARS" | "SHEET_NAME_EDGE_APOSTROPHE" | "SHEET_NAME_DUPLICATE" | "ROW_COUNT_EXCEEDED" | "COLUMN_COUNT_EXCEEDED" | "COLUMN_WIDTH_OUT_OF_RANGE" | "ROW_HEIGHT_OUT_OF_RANGE" | "DATE_OUT_OF_RANGE" | "CELL_VALUE_NAN" | "CELL_VALUE_INFINITE" | "MERGE_RANGE_OVERLAP" | "MERGE_RANGE_OUT_OF_BOUNDS" | "MERGE_RANGE_CONSUMED_CELL" | "NAMED_RANGE_INVALID" | "NAMED_RANGE_DUPLICATE" | "DRAWING_ANCHOR_OUT_OF_RANGE" | "DRAWING_DIMENSION_OUT_OF_RANGE" | "DATA_VALIDATION_INVALID" | "HYPERLINK_INVALID" | "PRINT_SETUP_INVALID" | "UNSUPPORTED_FEATURE" | "INVALID_TYPE" | "VALIDATION_FAILED";
interface SpreadsheetValidationIssue {
    path: string;
    code: SpreadsheetValidationIssueCode;
    message: string;
    received?: unknown;
}
type SpreadsheetTemplateParseIssueCode = "TEMPLATE_ENCRYPTED" | "TEMPLATE_TOO_MANY_PARTS" | "TEMPLATE_TOO_LARGE" | "TEMPLATE_PART_TOO_LARGE" | "TEMPLATE_XML_UNSAFE" | "TEMPLATE_FILENAME_UNSAFE" | "TEMPLATE_WORKBOOK_MISSING" | "TEMPLATE_WORKBOOK_RELS_MISSING" | "TEMPLATE_INVALID";
interface SpreadsheetTemplateParseIssue {
    code: SpreadsheetTemplateParseIssueCode;
    message: string;
    path?: string;
}
type SpreadsheetTemplateAssemblyIssueCode = "TEMPLATE_SOURCE_MISSING" | "TEMPLATE_ASSEMBLY_UNSAFE_SANITIZATION" | "TEMPLATE_INJECTION_TARGET_MISSING" | "TEMPLATE_INJECTION_SHAPE_MISMATCH" | "TEMPLATE_INJECTION_UNSUPPORTED";
interface SpreadsheetTemplateAssemblyIssue {
    code: SpreadsheetTemplateAssemblyIssueCode;
    message: string;
    path?: string;
}
declare class SpreadsheetValidationError extends Error {
    readonly issues: SpreadsheetValidationIssue[];
    constructor(issues: SpreadsheetValidationIssue[]);
}
declare class SpreadsheetTemplateParseError extends Error {
    readonly issues: SpreadsheetTemplateParseIssue[];
    constructor(issues: SpreadsheetTemplateParseIssue[]);
}
declare class SpreadsheetTemplateAssemblyError extends Error {
    readonly issues: SpreadsheetTemplateAssemblyIssue[];
    constructor(issues: SpreadsheetTemplateAssemblyIssue[]);
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
declare function validateSpreadsheetBuffer(buffer: Buffer, options?: SpreadsheetBufferValidateOptions): Promise<SpreadsheetValidationSummary>;

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
declare function preflightSpreadsheet(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): SpreadsheetQualityReport;

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
declare function createRenderPlan(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): SpreadsheetRenderPlan;

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

type AccessibilitySeverity$1 = "error" | "warning" | "info";
type AccessibilityIssueCode$1 = "document.title_missing" | "document.language_missing" | "image.alt_missing" | "structure.heading_skipped" | "table.header_missing";
interface AccessibilityIssue$1 {
    code: AccessibilityIssueCode$1;
    severity: AccessibilitySeverity$1;
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
interface AccessibilityFix$1 {
    code: AccessibilityIssueCode$1;
    action: string;
    applied: boolean;
    target?: string;
}
interface AccessibilityRemediationResult$1 {
    reportBefore: AccessibilityReport$1;
    reportAfter: AccessibilityReport$1;
    fixesApplied: AccessibilityFix$1[];
}

type AccessibilityIssueCode = AccessibilityIssue$1["code"];
type AccessibilitySeverity = AccessibilitySeverity$1;
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
type AccessibilityFix = AccessibilityFix$1;
interface AccessibilityRemediationResult extends AccessibilityRemediationResult$1 {
    reportBefore: AccessibilityReport;
    reportAfter: AccessibilityReport;
    document: SpreadsheetDocument;
}
type SpreadsheetAccessibilityConfig = AccessibilityConfig;
type SpreadsheetAccessibilityConfigBase = AccessibilityConfigBase;
declare function validateSpreadsheetAccessibility(document: SpreadsheetDocument): AccessibilityReport;
declare function remediateSpreadsheetAccessibility(document: SpreadsheetDocument): AccessibilityRemediationResult;

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
declare function lintSpreadsheetDocument(document: SpreadsheetDocument): SpreadsheetLintResult;

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
    static preflight(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): SpreadsheetQualityReport;
    static renderWithQuality(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): Promise<RenderWithQualityResult>;
    static plan(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): SpreadsheetRenderPlan;
    static render(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): Promise<Buffer>;
    static renderStream(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): Promise<NodeJS.ReadableStream>;
    static renderValidated(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): Promise<Buffer>;
    static renderWithMetrics(document: SpreadsheetDocument, options?: SpreadsheetRenderOptions): Promise<SpreadsheetRenderResult>;
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

/**
 * Deterministic mode for @runstamp/xlsx.
 *
 * The enabled/disabled flag now lives in `@runstamp/contract` (OC-1 Phase 2), so
 * every Runstamp engine observes one flag instead of four independent copies that
 * could disagree. Public signatures are unchanged.
 */
declare function setDeterministicMode(enabled?: boolean): void;
declare function isDeterministicModeEnabled(): boolean;

type FormulaOperand = string | number | boolean | Date;
declare const F: {
    text(value: string): string;
    bool(value: boolean): string;
    num(value: number): string;
    date(value: Date): string;
    cell(row: number, col: number): string;
    absCell(row: number, col: number): string;
    range(startRow: number, startCol: number, endRow: number, endCol: number): string;
    absRange(startRow: number, startCol: number, endRow: number, endCol: number): string;
    ref(sheetName: string, startRef: string, endRef?: string): string;
    sumSheet(sheetName: string, startRef: string, endRef: string): string;
    vlookupSheet(lookupValue: FormulaOperand, sheetName: string, tableStart: string, tableEnd: string, colIndex: FormulaOperand, exactMatch?: boolean): string;
    parens(expression: FormulaOperand): string;
    add(left: FormulaOperand, right: FormulaOperand): string;
    subtract(left: FormulaOperand, right: FormulaOperand): string;
    multiply(left: FormulaOperand, right: FormulaOperand): string;
    divide(left: FormulaOperand, right: FormulaOperand): string;
    power(left: FormulaOperand, right: FormulaOperand): string;
    eq(left: FormulaOperand, right: FormulaOperand): string;
    ne(left: FormulaOperand, right: FormulaOperand): string;
    lt(left: FormulaOperand, right: FormulaOperand): string;
    lte(left: FormulaOperand, right: FormulaOperand): string;
    gt(left: FormulaOperand, right: FormulaOperand): string;
    gte(left: FormulaOperand, right: FormulaOperand): string;
    sum: (...args: FormulaOperand[]) => string;
    average: (...args: FormulaOperand[]) => string;
    count: (...args: FormulaOperand[]) => string;
    counta: (...args: FormulaOperand[]) => string;
    countblank: (...args: FormulaOperand[]) => string;
    min: (...args: FormulaOperand[]) => string;
    max: (...args: FormulaOperand[]) => string;
    sumproduct: (...args: FormulaOperand[]) => string;
    sumif: (...args: FormulaOperand[]) => string;
    sumifs: (...args: FormulaOperand[]) => string;
    countif: (...args: FormulaOperand[]) => string;
    countifs: (...args: FormulaOperand[]) => string;
    averageif: (...args: FormulaOperand[]) => string;
    averageifs: (...args: FormulaOperand[]) => string;
    round: (left: FormulaOperand, right: FormulaOperand) => string;
    roundup: (left: FormulaOperand, right: FormulaOperand) => string;
    rounddown: (left: FormulaOperand, right: FormulaOperand) => string;
    abs: (value: FormulaOperand) => string;
    sqrt: (value: FormulaOperand) => string;
    int: (value: FormulaOperand) => string;
    ceiling: (...args: FormulaOperand[]) => string;
    floor: (...args: FormulaOperand[]) => string;
    mod: (left: FormulaOperand, right: FormulaOperand) => string;
    if(condition: FormulaOperand, whenTrue: FormulaOperand, whenFalse: FormulaOperand): string;
    and: (...args: FormulaOperand[]) => string;
    or: (...args: FormulaOperand[]) => string;
    not: (value: FormulaOperand) => string;
    iferror: (left: FormulaOperand, right: FormulaOperand) => string;
    ifna: (left: FormulaOperand, right: FormulaOperand) => string;
    isblank: (value: FormulaOperand) => string;
    isnumber: (value: FormulaOperand) => string;
    istext: (value: FormulaOperand) => string;
    len: (value: FormulaOperand) => string;
    left: (...args: FormulaOperand[]) => string;
    right: (...args: FormulaOperand[]) => string;
    mid: (...args: FormulaOperand[]) => string;
    trim: (value: FormulaOperand) => string;
    upper: (value: FormulaOperand) => string;
    lower: (value: FormulaOperand) => string;
    proper: (value: FormulaOperand) => string;
    concat: (...args: FormulaOperand[]) => string;
    textjoin: (...args: FormulaOperand[]) => string;
    substitute: (...args: FormulaOperand[]) => string;
    find: (...args: FormulaOperand[]) => string;
    search: (...args: FormulaOperand[]) => string;
    vlookup(lookupValue: FormulaOperand, tableArray: FormulaOperand, columnIndex: FormulaOperand, rangeLookup: FormulaOperand): string;
    hlookup(lookupValue: FormulaOperand, tableArray: FormulaOperand, rowIndex: FormulaOperand, rangeLookup: FormulaOperand): string;
    index: (...args: FormulaOperand[]) => string;
    match: (...args: FormulaOperand[]) => string;
    xlookup: (...args: FormulaOperand[]) => string;
    choose: (...args: FormulaOperand[]) => string;
    offset: (...args: FormulaOperand[]) => string;
    row: (...args: FormulaOperand[]) => string;
    column: (...args: FormulaOperand[]) => string;
    rows: (...args: FormulaOperand[]) => string;
    columns: (...args: FormulaOperand[]) => string;
    today(): string;
    now(): string;
    datevalue: (value: FormulaOperand) => string;
    year: (value: FormulaOperand) => string;
    month: (value: FormulaOperand) => string;
    day: (value: FormulaOperand) => string;
    eomonth: (left: FormulaOperand, right: FormulaOperand) => string;
    edate: (left: FormulaOperand, right: FormulaOperand) => string;
};

type ExcelDateSystem = "1900" | "1904";

declare class FormulaEvaluator {
    private readonly document;
    private readonly dateSystem;
    private readonly cache;
    private readonly active;
    constructor(document: SpreadsheetDocument, dateSystem?: ExcelDateSystem);
    evaluateCell(cell: SpreadsheetCell, currentSheetName: string, currentCellRef: string): CellValue | undefined;
    getFormulaDefinition(cell: SpreadsheetCell): {
        expression: string;
        cachedValue?: CellValue;
        arrayRange?: string;
        dynamic?: boolean;
    } | null;
    private evaluateExpression;
    private evaluateNode;
    private evaluateBinary;
    private evaluateFunction;
    private resolveNamedRange;
    private resolveReference;
    private resolveReferenceGrid;
    private getCellValue;
}

interface FormulaRowShiftOptions {
    currentSheetName: string;
    targetSheetName: string;
    insertionRow: number;
    rowDelta: number;
}
interface FormulaRowOffsetOptions {
    currentSheetName: string;
    targetSheetName: string;
    rowOffset: number;
}
declare function shiftFormulaRows(expression: string, options: FormulaRowShiftOptions): string;
declare function offsetFormulaRows(expression: string, options: FormulaRowOffsetOptions): string;

declare const ThemeConfigSchema: ZodObject<{
    name: ZodOptional<ZodString>;
    colorScheme: ZodOptional<ZodObject<{
        dk1: ZodOptional<ZodString>;
        lt1: ZodOptional<ZodString>;
        dk2: ZodOptional<ZodString>;
        lt2: ZodOptional<ZodString>;
        accent1: ZodOptional<ZodString>;
        accent2: ZodOptional<ZodString>;
        accent3: ZodOptional<ZodString>;
        accent4: ZodOptional<ZodString>;
        accent5: ZodOptional<ZodString>;
        accent6: ZodOptional<ZodString>;
        hlink: ZodOptional<ZodString>;
        folHlink: ZodOptional<ZodString>;
    }, $strict>>;
    fontScheme: ZodOptional<ZodObject<{
        majorLatin: ZodOptional<ZodString>;
        minorLatin: ZodOptional<ZodString>;
        majorEa: ZodOptional<ZodString>;
        minorEa: ZodOptional<ZodString>;
    }, $strict>>;
}, $strict>;
declare const SpreadsheetMetaSchema: ZodObject<{
    title: ZodOptional<ZodString>;
    language: ZodOptional<ZodString>;
    creator: ZodOptional<ZodString>;
    company: ZodOptional<ZodString>;
    created: ZodOptional<ZodDate>;
    modified: ZodOptional<ZodDate>;
    description: ZodOptional<ZodString>;
    category: ZodOptional<ZodString>;
    keywords: ZodOptional<ZodArray<ZodString>>;
}, $strict>;
declare const SpreadsheetDefaultsSchema: ZodObject<{
    font: ZodOptional<ZodObject<{
        family: ZodString;
        size: ZodNumber;
    }, $strict>>;
    columnWidth: ZodOptional<ZodNumber>;
    rowHeight: ZodOptional<ZodNumber>;
}, $strict>;
declare const SheetNameSchema: ZodString;
declare const SpreadsheetCellSchema: ZodObject<{
    value: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
        text: ZodString;
        font: ZodOptional<ZodObject<{
            family: ZodOptional<ZodString>;
            size: ZodOptional<ZodNumber>;
            bold: ZodOptional<ZodBoolean>;
            italic: ZodOptional<ZodBoolean>;
            underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                single: "single";
                double: "double";
                singleAccounting: "singleAccounting";
                doubleAccounting: "doubleAccounting";
            }>]>>;
            strikethrough: ZodOptional<ZodBoolean>;
            color: ZodOptional<ZodString>;
            vertAlign: ZodOptional<ZodEnum<{
                superscript: "superscript";
                subscript: "subscript";
            }>>;
            charset: ZodOptional<ZodNumber>;
        }, $strict>>;
    }, $strict>>, ZodObject<{
        error: ZodEnum<{
            "#NULL!": "#NULL!";
            "#DIV/0!": "#DIV/0!";
            "#VALUE!": "#VALUE!";
            "#REF!": "#REF!";
            "#NAME?": "#NAME?";
            "#NUM!": "#NUM!";
            "#N/A": "#N/A";
            "#GETTING_DATA": "#GETTING_DATA";
            "#SPILL!": "#SPILL!";
            "#CALC!": "#CALC!";
            "#FIELD!": "#FIELD!";
            "#BLOCKED!": "#BLOCKED!";
            "#UNKNOWN!": "#UNKNOWN!";
            "#CONNECT!": "#CONNECT!";
        }>;
    }, $strict>]>>;
    style: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
    formula: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
        expression: ZodString;
        cachedValue: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
            text: ZodString;
            font: ZodOptional<ZodObject<{
                family: ZodOptional<ZodString>;
                size: ZodOptional<ZodNumber>;
                bold: ZodOptional<ZodBoolean>;
                italic: ZodOptional<ZodBoolean>;
                underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                    single: "single";
                    double: "double";
                    singleAccounting: "singleAccounting";
                    doubleAccounting: "doubleAccounting";
                }>]>>;
                strikethrough: ZodOptional<ZodBoolean>;
                color: ZodOptional<ZodString>;
                vertAlign: ZodOptional<ZodEnum<{
                    superscript: "superscript";
                    subscript: "subscript";
                }>>;
                charset: ZodOptional<ZodNumber>;
            }, $strict>>;
        }, $strict>>, ZodObject<{
            error: ZodEnum<{
                "#NULL!": "#NULL!";
                "#DIV/0!": "#DIV/0!";
                "#VALUE!": "#VALUE!";
                "#REF!": "#REF!";
                "#NAME?": "#NAME?";
                "#NUM!": "#NUM!";
                "#N/A": "#N/A";
                "#GETTING_DATA": "#GETTING_DATA";
                "#SPILL!": "#SPILL!";
                "#CALC!": "#CALC!";
                "#FIELD!": "#FIELD!";
                "#BLOCKED!": "#BLOCKED!";
                "#UNKNOWN!": "#UNKNOWN!";
                "#CONNECT!": "#CONNECT!";
            }>;
        }, $strict>]>>;
        arrayRange: ZodOptional<ZodString>;
        dynamic: ZodOptional<ZodBoolean>;
    }, $strict>]>>;
    hyperlink: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
        target: ZodString;
        display: ZodOptional<ZodString>;
        tooltip: ZodOptional<ZodString>;
    }, $strict>, ZodObject<{
        location: ZodString;
        display: ZodOptional<ZodString>;
        tooltip: ZodOptional<ZodString>;
    }, $strict>]>>;
    comment: ZodOptional<ZodObject<{
        author: ZodOptional<ZodString>;
        text: ZodString;
    }, $strict>>;
    colSpan: ZodOptional<ZodNumber>;
    rowSpan: ZodOptional<ZodNumber>;
}, $strict>;
declare const SpreadsheetRowSchema: ZodObject<{
    height: ZodOptional<ZodNumber>;
    hidden: ZodOptional<ZodBoolean>;
    cells: ZodArray<ZodObject<{
        value: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
            text: ZodString;
            font: ZodOptional<ZodObject<{
                family: ZodOptional<ZodString>;
                size: ZodOptional<ZodNumber>;
                bold: ZodOptional<ZodBoolean>;
                italic: ZodOptional<ZodBoolean>;
                underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                    single: "single";
                    double: "double";
                    singleAccounting: "singleAccounting";
                    doubleAccounting: "doubleAccounting";
                }>]>>;
                strikethrough: ZodOptional<ZodBoolean>;
                color: ZodOptional<ZodString>;
                vertAlign: ZodOptional<ZodEnum<{
                    superscript: "superscript";
                    subscript: "subscript";
                }>>;
                charset: ZodOptional<ZodNumber>;
            }, $strict>>;
        }, $strict>>, ZodObject<{
            error: ZodEnum<{
                "#NULL!": "#NULL!";
                "#DIV/0!": "#DIV/0!";
                "#VALUE!": "#VALUE!";
                "#REF!": "#REF!";
                "#NAME?": "#NAME?";
                "#NUM!": "#NUM!";
                "#N/A": "#N/A";
                "#GETTING_DATA": "#GETTING_DATA";
                "#SPILL!": "#SPILL!";
                "#CALC!": "#CALC!";
                "#FIELD!": "#FIELD!";
                "#BLOCKED!": "#BLOCKED!";
                "#UNKNOWN!": "#UNKNOWN!";
                "#CONNECT!": "#CONNECT!";
            }>;
        }, $strict>]>>;
        style: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
        formula: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
            expression: ZodString;
            cachedValue: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
                text: ZodString;
                font: ZodOptional<ZodObject<{
                    family: ZodOptional<ZodString>;
                    size: ZodOptional<ZodNumber>;
                    bold: ZodOptional<ZodBoolean>;
                    italic: ZodOptional<ZodBoolean>;
                    underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                        single: "single";
                        double: "double";
                        singleAccounting: "singleAccounting";
                        doubleAccounting: "doubleAccounting";
                    }>]>>;
                    strikethrough: ZodOptional<ZodBoolean>;
                    color: ZodOptional<ZodString>;
                    vertAlign: ZodOptional<ZodEnum<{
                        superscript: "superscript";
                        subscript: "subscript";
                    }>>;
                    charset: ZodOptional<ZodNumber>;
                }, $strict>>;
            }, $strict>>, ZodObject<{
                error: ZodEnum<{
                    "#NULL!": "#NULL!";
                    "#DIV/0!": "#DIV/0!";
                    "#VALUE!": "#VALUE!";
                    "#REF!": "#REF!";
                    "#NAME?": "#NAME?";
                    "#NUM!": "#NUM!";
                    "#N/A": "#N/A";
                    "#GETTING_DATA": "#GETTING_DATA";
                    "#SPILL!": "#SPILL!";
                    "#CALC!": "#CALC!";
                    "#FIELD!": "#FIELD!";
                    "#BLOCKED!": "#BLOCKED!";
                    "#UNKNOWN!": "#UNKNOWN!";
                    "#CONNECT!": "#CONNECT!";
                }>;
            }, $strict>]>>;
            arrayRange: ZodOptional<ZodString>;
            dynamic: ZodOptional<ZodBoolean>;
        }, $strict>]>>;
        hyperlink: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
            target: ZodString;
            display: ZodOptional<ZodString>;
            tooltip: ZodOptional<ZodString>;
        }, $strict>, ZodObject<{
            location: ZodString;
            display: ZodOptional<ZodString>;
            tooltip: ZodOptional<ZodString>;
        }, $strict>]>>;
        comment: ZodOptional<ZodObject<{
            author: ZodOptional<ZodString>;
            text: ZodString;
        }, $strict>>;
        colSpan: ZodOptional<ZodNumber>;
        rowSpan: ZodOptional<ZodNumber>;
    }, $strict>>;
}, $strict>;
declare const SpreadsheetColumnSchema: ZodObject<{
    width: ZodOptional<ZodNumber>;
    hidden: ZodOptional<ZodBoolean>;
    bestFit: ZodOptional<ZodBoolean>;
}, $strict>;
declare const SpreadsheetSheetSchema: ZodObject<{
    name: ZodString;
    columns: ZodOptional<ZodArray<ZodObject<{
        width: ZodOptional<ZodNumber>;
        hidden: ZodOptional<ZodBoolean>;
        bestFit: ZodOptional<ZodBoolean>;
    }, $strict>>>;
    rows: ZodArray<ZodObject<{
        height: ZodOptional<ZodNumber>;
        hidden: ZodOptional<ZodBoolean>;
        cells: ZodArray<ZodObject<{
            value: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
                text: ZodString;
                font: ZodOptional<ZodObject<{
                    family: ZodOptional<ZodString>;
                    size: ZodOptional<ZodNumber>;
                    bold: ZodOptional<ZodBoolean>;
                    italic: ZodOptional<ZodBoolean>;
                    underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                        single: "single";
                        double: "double";
                        singleAccounting: "singleAccounting";
                        doubleAccounting: "doubleAccounting";
                    }>]>>;
                    strikethrough: ZodOptional<ZodBoolean>;
                    color: ZodOptional<ZodString>;
                    vertAlign: ZodOptional<ZodEnum<{
                        superscript: "superscript";
                        subscript: "subscript";
                    }>>;
                    charset: ZodOptional<ZodNumber>;
                }, $strict>>;
            }, $strict>>, ZodObject<{
                error: ZodEnum<{
                    "#NULL!": "#NULL!";
                    "#DIV/0!": "#DIV/0!";
                    "#VALUE!": "#VALUE!";
                    "#REF!": "#REF!";
                    "#NAME?": "#NAME?";
                    "#NUM!": "#NUM!";
                    "#N/A": "#N/A";
                    "#GETTING_DATA": "#GETTING_DATA";
                    "#SPILL!": "#SPILL!";
                    "#CALC!": "#CALC!";
                    "#FIELD!": "#FIELD!";
                    "#BLOCKED!": "#BLOCKED!";
                    "#UNKNOWN!": "#UNKNOWN!";
                    "#CONNECT!": "#CONNECT!";
                }>;
            }, $strict>]>>;
            style: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
            formula: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
                expression: ZodString;
                cachedValue: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
                    text: ZodString;
                    font: ZodOptional<ZodObject<{
                        family: ZodOptional<ZodString>;
                        size: ZodOptional<ZodNumber>;
                        bold: ZodOptional<ZodBoolean>;
                        italic: ZodOptional<ZodBoolean>;
                        underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                            single: "single";
                            double: "double";
                            singleAccounting: "singleAccounting";
                            doubleAccounting: "doubleAccounting";
                        }>]>>;
                        strikethrough: ZodOptional<ZodBoolean>;
                        color: ZodOptional<ZodString>;
                        vertAlign: ZodOptional<ZodEnum<{
                            superscript: "superscript";
                            subscript: "subscript";
                        }>>;
                        charset: ZodOptional<ZodNumber>;
                    }, $strict>>;
                }, $strict>>, ZodObject<{
                    error: ZodEnum<{
                        "#NULL!": "#NULL!";
                        "#DIV/0!": "#DIV/0!";
                        "#VALUE!": "#VALUE!";
                        "#REF!": "#REF!";
                        "#NAME?": "#NAME?";
                        "#NUM!": "#NUM!";
                        "#N/A": "#N/A";
                        "#GETTING_DATA": "#GETTING_DATA";
                        "#SPILL!": "#SPILL!";
                        "#CALC!": "#CALC!";
                        "#FIELD!": "#FIELD!";
                        "#BLOCKED!": "#BLOCKED!";
                        "#UNKNOWN!": "#UNKNOWN!";
                        "#CONNECT!": "#CONNECT!";
                    }>;
                }, $strict>]>>;
                arrayRange: ZodOptional<ZodString>;
                dynamic: ZodOptional<ZodBoolean>;
            }, $strict>]>>;
            hyperlink: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
                target: ZodString;
                display: ZodOptional<ZodString>;
                tooltip: ZodOptional<ZodString>;
            }, $strict>, ZodObject<{
                location: ZodString;
                display: ZodOptional<ZodString>;
                tooltip: ZodOptional<ZodString>;
            }, $strict>]>>;
            comment: ZodOptional<ZodObject<{
                author: ZodOptional<ZodString>;
                text: ZodString;
            }, $strict>>;
            colSpan: ZodOptional<ZodNumber>;
            rowSpan: ZodOptional<ZodNumber>;
        }, $strict>>;
    }, $strict>>;
    mergedCells: ZodOptional<ZodArray<ZodString>>;
    freezePane: ZodOptional<ZodObject<{
        row: ZodNumber;
        col: ZodNumber;
    }, $strict>>;
    autoFilter: ZodOptional<ZodUnion<readonly [ZodLiteral<true>, ZodObject<{
        ref: ZodString;
    }, $strict>]>>;
    dataValidations: ZodOptional<ZodArray<ZodObject<{
        ref: ZodString;
        type: ZodEnum<{
            custom: "custom";
            whole: "whole";
            decimal: "decimal";
            list: "list";
            date: "date";
            time: "time";
            textLength: "textLength";
        }>;
        operator: ZodOptional<ZodEnum<{
            between: "between";
            notBetween: "notBetween";
            equal: "equal";
            notEqual: "notEqual";
            greaterThan: "greaterThan";
            lessThan: "lessThan";
            greaterThanOrEqual: "greaterThanOrEqual";
            lessThanOrEqual: "lessThanOrEqual";
        }>>;
        formula1: ZodUnion<readonly [ZodString, ZodNumber, ZodArray<ZodString>]>;
        formula2: ZodOptional<ZodUnion<readonly [ZodString, ZodNumber]>>;
        allowBlank: ZodOptional<ZodBoolean>;
        showDropDown: ZodOptional<ZodBoolean>;
        showInputMessage: ZodOptional<ZodBoolean>;
        promptTitle: ZodOptional<ZodString>;
        prompt: ZodOptional<ZodString>;
        showErrorMessage: ZodOptional<ZodBoolean>;
        errorTitle: ZodOptional<ZodString>;
        error: ZodOptional<ZodString>;
        errorStyle: ZodOptional<ZodEnum<{
            warning: "warning";
            stop: "stop";
            information: "information";
        }>>;
    }, $strict>>>;
    pageSetup: ZodOptional<ZodObject<{
        paperSize: ZodOptional<ZodNumber>;
        orientation: ZodOptional<ZodEnum<{
            portrait: "portrait";
            landscape: "landscape";
        }>>;
        scale: ZodOptional<ZodNumber>;
        fitToWidth: ZodOptional<ZodNumber>;
        fitToHeight: ZodOptional<ZodNumber>;
        printArea: ZodOptional<ZodString>;
        printTitles: ZodOptional<ZodObject<{
            rows: ZodOptional<ZodObject<{
                start: ZodNumber;
                end: ZodNumber;
            }, $strict>>;
            columns: ZodOptional<ZodObject<{
                start: ZodNumber;
                end: ZodNumber;
            }, $strict>>;
        }, $strict>>;
        options: ZodOptional<ZodObject<{
            gridLines: ZodOptional<ZodBoolean>;
            headings: ZodOptional<ZodBoolean>;
        }, $strict>>;
        margins: ZodOptional<ZodObject<{
            left: ZodOptional<ZodNumber>;
            right: ZodOptional<ZodNumber>;
            top: ZodOptional<ZodNumber>;
            bottom: ZodOptional<ZodNumber>;
            header: ZodOptional<ZodNumber>;
            footer: ZodOptional<ZodNumber>;
        }, $strict>>;
    }, $strict>>;
    state: ZodOptional<ZodEnum<{
        visible: "visible";
        hidden: "hidden";
        veryHidden: "veryHidden";
    }>>;
    tabColor: ZodOptional<ZodString>;
    rightToLeft: ZodOptional<ZodBoolean>;
    styling: ZodOptional<ZodObject<{
        headerRow: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
        alternateRows: ZodOptional<ZodObject<{
            odd: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
            even: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
        }, $strict>>;
    }, $strict>>;
    conditionalFormatting: ZodOptional<ZodArray<ZodObject<{
        ref: ZodString;
        rules: ZodArray<ZodDiscriminatedUnion<[ZodObject<{
            type: ZodLiteral<"cellIs">;
            operator: ZodEnum<{
                between: "between";
                notBetween: "notBetween";
                equal: "equal";
                notEqual: "notEqual";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
                greaterThanOrEqual: "greaterThanOrEqual";
                lessThanOrEqual: "lessThanOrEqual";
            }>;
            formula: ZodUnion<readonly [ZodString, ZodTuple<[ZodString, ZodString], null>]>;
            style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"colorScale">;
            scale: ZodObject<{
                min: ZodObject<{
                    type: ZodEnum<{
                        percent: "percent";
                        min: "min";
                        max: "max";
                        num: "num";
                        percentile: "percentile";
                        formula: "formula";
                    }>;
                    value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                    color: ZodString;
                }, $strict>;
                mid: ZodOptional<ZodObject<{
                    type: ZodEnum<{
                        percent: "percent";
                        min: "min";
                        max: "max";
                        num: "num";
                        percentile: "percentile";
                        formula: "formula";
                    }>;
                    value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                    color: ZodString;
                }, $strict>>;
                max: ZodObject<{
                    type: ZodEnum<{
                        percent: "percent";
                        min: "min";
                        max: "max";
                        num: "num";
                        percentile: "percentile";
                        formula: "formula";
                    }>;
                    value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                    color: ZodString;
                }, $strict>;
            }, $strict>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"dataBar">;
            color: ZodString;
            min: ZodObject<{
                type: ZodEnum<{
                    percent: "percent";
                    min: "min";
                    max: "max";
                    num: "num";
                    percentile: "percentile";
                    formula: "formula";
                }>;
                value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                color: ZodOptional<ZodString>;
            }, $strict>;
            max: ZodObject<{
                type: ZodEnum<{
                    percent: "percent";
                    min: "min";
                    max: "max";
                    num: "num";
                    percentile: "percentile";
                    formula: "formula";
                }>;
                value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                color: ZodOptional<ZodString>;
            }, $strict>;
            gradient: ZodOptional<ZodBoolean>;
            showValue: ZodOptional<ZodBoolean>;
            negativeColor: ZodOptional<ZodString>;
            axisPosition: ZodOptional<ZodEnum<{
                none: "none";
                automatic: "automatic";
                middle: "middle";
            }>>;
            direction: ZodOptional<ZodEnum<{
                leftToRight: "leftToRight";
                rightToLeft: "rightToLeft";
            }>>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"top10">;
            rank: ZodNumber;
            percent: ZodOptional<ZodBoolean>;
            bottom: ZodOptional<ZodBoolean>;
            style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"duplicateValues">;
            style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"uniqueValues">;
            style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"iconSet">;
            iconSet: ZodEnum<{
                "3Arrows": "3Arrows";
                "3ArrowsGray": "3ArrowsGray";
                "3Flags": "3Flags";
                "3TrafficLights1": "3TrafficLights1";
                "3TrafficLights2": "3TrafficLights2";
                "3Signs": "3Signs";
                "3Symbols": "3Symbols";
                "3Symbols2": "3Symbols2";
                "3Stars": "3Stars";
                "3Triangles": "3Triangles";
                "3Smilies": "3Smilies";
                "4Arrows": "4Arrows";
                "4ArrowsGray": "4ArrowsGray";
                "4RedToBlack": "4RedToBlack";
                "4Rating": "4Rating";
                "4TrafficLights": "4TrafficLights";
                "5Arrows": "5Arrows";
                "5ArrowsGray": "5ArrowsGray";
                "5Rating": "5Rating";
                "5Quarters": "5Quarters";
            }>;
            showValue: ZodOptional<ZodBoolean>;
            reverse: ZodOptional<ZodBoolean>;
            thresholds: ZodOptional<ZodArray<ZodObject<{
                type: ZodEnum<{
                    percent: "percent";
                    min: "min";
                    max: "max";
                    num: "num";
                    percentile: "percentile";
                    formula: "formula";
                }>;
                value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                color: ZodOptional<ZodString>;
            }, $strict>>>;
        }, $strict>], "type">>;
    }, $strict>>>;
    tables: ZodOptional<ZodArray<ZodObject<{
        name: ZodString;
        displayName: ZodOptional<ZodString>;
        ref: ZodString;
        totalsRow: ZodOptional<ZodBoolean>;
        columns: ZodOptional<ZodArray<ZodObject<{
            name: ZodOptional<ZodString>;
            totalsRowLabel: ZodOptional<ZodString>;
            totalsRowFunction: ZodOptional<ZodEnum<{
                min: "min";
                max: "max";
                sum: "sum";
                average: "average";
                count: "count";
                countNums: "countNums";
                stdDev: "stdDev";
                var: "var";
            }>>;
            totalsRowFormula: ZodOptional<ZodString>;
        }, $strict>>>;
        style: ZodOptional<ZodObject<{
            name: ZodOptional<ZodString>;
            showFirstColumn: ZodOptional<ZodBoolean>;
            showLastColumn: ZodOptional<ZodBoolean>;
            showRowStripes: ZodOptional<ZodBoolean>;
            showColumnStripes: ZodOptional<ZodBoolean>;
        }, $strict>>;
    }, $strict>>>;
    protection: ZodOptional<ZodObject<{
        password: ZodOptional<ZodString>;
        sheet: ZodOptional<ZodBoolean>;
        objects: ZodOptional<ZodBoolean>;
        scenarios: ZodOptional<ZodBoolean>;
        formatCells: ZodOptional<ZodBoolean>;
        formatColumns: ZodOptional<ZodBoolean>;
        formatRows: ZodOptional<ZodBoolean>;
        insertColumns: ZodOptional<ZodBoolean>;
        insertRows: ZodOptional<ZodBoolean>;
        insertHyperlinks: ZodOptional<ZodBoolean>;
        deleteColumns: ZodOptional<ZodBoolean>;
        deleteRows: ZodOptional<ZodBoolean>;
        selectLockedCells: ZodOptional<ZodBoolean>;
        sort: ZodOptional<ZodBoolean>;
        autoFilter: ZodOptional<ZodBoolean>;
        pivotTables: ZodOptional<ZodBoolean>;
        selectUnlockedCells: ZodOptional<ZodBoolean>;
    }, $strict>>;
    images: ZodOptional<ZodArray<ZodObject<{
        data: ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>;
        type: ZodEnum<{
            png: "png";
            jpeg: "jpeg";
        }>;
        anchor: ZodObject<{
            from: ZodObject<{
                col: ZodNumber;
                row: ZodNumber;
                colOffset: ZodOptional<ZodNumber>;
                rowOffset: ZodOptional<ZodNumber>;
            }, $strict>;
            to: ZodOptional<ZodObject<{
                col: ZodNumber;
                row: ZodNumber;
                colOffset: ZodOptional<ZodNumber>;
                rowOffset: ZodOptional<ZodNumber>;
            }, $strict>>;
        }, $strict>;
        name: ZodOptional<ZodString>;
        description: ZodOptional<ZodString>;
        width: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
    }, $strict>>>;
    charts: ZodOptional<ZodArray<ZodObject<{
        type: ZodEnum<{
            col: "col";
            bar: "bar";
            line: "line";
            pie: "pie";
            scatter: "scatter";
            area: "area";
            doughnut: "doughnut";
            radar: "radar";
            bubble: "bubble";
            stock: "stock";
            surface: "surface";
        }>;
        title: ZodOptional<ZodString>;
        series: ZodArray<ZodObject<{
            name: ZodOptional<ZodString>;
            categories: ZodOptional<ZodString>;
            values: ZodString;
        }, $strict>>;
        anchor: ZodObject<{
            from: ZodObject<{
                col: ZodNumber;
                row: ZodNumber;
                colOffset: ZodOptional<ZodNumber>;
                rowOffset: ZodOptional<ZodNumber>;
            }, $strict>;
            to: ZodOptional<ZodObject<{
                col: ZodNumber;
                row: ZodNumber;
                colOffset: ZodOptional<ZodNumber>;
                rowOffset: ZodOptional<ZodNumber>;
            }, $strict>>;
        }, $strict>;
        width: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
        style: ZodOptional<ZodObject<{
            showLegend: ZodOptional<ZodBoolean>;
            showDataLabels: ZodOptional<ZodBoolean>;
        }, $strict>>;
    }, $strict>>>;
    pivotTables: ZodOptional<ZodArray<ZodObject<{
        name: ZodString;
        sourceSheet: ZodString;
        sourceRef: ZodString;
        targetCell: ZodString;
        rowFields: ZodOptional<ZodArray<ZodUnion<readonly [ZodString, ZodObject<{
            name: ZodString;
            subtotals: ZodOptional<ZodUnion<readonly [ZodLiteral<false>, ZodArray<ZodEnum<{
                min: "min";
                max: "max";
                sum: "sum";
                average: "average";
                count: "count";
                countNums: "countNums";
                stdDev: "stdDev";
                var: "var";
                product: "product";
                stdDevP: "stdDevP";
                varP: "varP";
            }>>]>>;
        }, $strict>]>>>;
        columnFields: ZodOptional<ZodArray<ZodUnion<readonly [ZodString, ZodObject<{
            name: ZodString;
            subtotals: ZodOptional<ZodUnion<readonly [ZodLiteral<false>, ZodArray<ZodEnum<{
                min: "min";
                max: "max";
                sum: "sum";
                average: "average";
                count: "count";
                countNums: "countNums";
                stdDev: "stdDev";
                var: "var";
                product: "product";
                stdDevP: "stdDevP";
                varP: "varP";
            }>>]>>;
        }, $strict>]>>>;
        filterFields: ZodOptional<ZodArray<ZodString>>;
        valueFields: ZodArray<ZodObject<{
            name: ZodString;
            summarizeBy: ZodOptional<ZodEnum<{
                min: "min";
                max: "max";
                sum: "sum";
                average: "average";
                count: "count";
                countNums: "countNums";
                stdDev: "stdDev";
                var: "var";
                product: "product";
                stdDevP: "stdDevP";
                varP: "varP";
            }>>;
            title: ZodOptional<ZodString>;
        }, $strict>>;
        calculatedFields: ZodOptional<ZodArray<ZodObject<{
            name: ZodString;
            formula: ZodString;
        }, $strict>>>;
        valuesAxis: ZodOptional<ZodEnum<{
            column: "column";
            row: "row";
        }>>;
        showRowGrandTotals: ZodOptional<ZodBoolean>;
        showColumnGrandTotals: ZodOptional<ZodBoolean>;
        style: ZodOptional<ZodObject<{
            name: ZodOptional<ZodString>;
            showRowHeaders: ZodOptional<ZodBoolean>;
            showColumnHeaders: ZodOptional<ZodBoolean>;
            showRowStripes: ZodOptional<ZodBoolean>;
            showColumnStripes: ZodOptional<ZodBoolean>;
            showLastColumn: ZodOptional<ZodBoolean>;
        }, $strict>>;
    }, $strict>>>;
    pivotCharts: ZodOptional<ZodArray<ZodObject<{
        pivotTable: ZodString;
        type: ZodEnum<{
            col: "col";
            bar: "bar";
            line: "line";
            pie: "pie";
            scatter: "scatter";
            area: "area";
            doughnut: "doughnut";
            radar: "radar";
            bubble: "bubble";
            stock: "stock";
            surface: "surface";
        }>;
        title: ZodOptional<ZodString>;
        anchor: ZodObject<{
            from: ZodObject<{
                col: ZodNumber;
                row: ZodNumber;
                colOffset: ZodOptional<ZodNumber>;
                rowOffset: ZodOptional<ZodNumber>;
            }, $strict>;
            to: ZodOptional<ZodObject<{
                col: ZodNumber;
                row: ZodNumber;
                colOffset: ZodOptional<ZodNumber>;
                rowOffset: ZodOptional<ZodNumber>;
            }, $strict>>;
        }, $strict>;
        width: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
        style: ZodOptional<ZodObject<{
            showLegend: ZodOptional<ZodBoolean>;
            showDataLabels: ZodOptional<ZodBoolean>;
        }, $strict>>;
    }, $strict>>>;
}, $strict>;
declare const SpreadsheetDocumentSchema: ZodObject<{
    accessible: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodObject<{
        level: ZodEnum<{
            A: "A";
            AA: "AA";
            AAA: "AAA";
        }>;
        language: ZodOptional<ZodString>;
        title: ZodOptional<ZodString>;
        autoAltText: ZodOptional<ZodBoolean>;
        enforceHeadingHierarchy: ZodOptional<ZodBoolean>;
        enforceTableHeaders: ZodOptional<ZodBoolean>;
    }, $strict>]>>;
    meta: ZodOptional<ZodObject<{
        title: ZodOptional<ZodString>;
        language: ZodOptional<ZodString>;
        creator: ZodOptional<ZodString>;
        company: ZodOptional<ZodString>;
        created: ZodOptional<ZodDate>;
        modified: ZodOptional<ZodDate>;
        description: ZodOptional<ZodString>;
        category: ZodOptional<ZodString>;
        keywords: ZodOptional<ZodArray<ZodString>>;
    }, $strict>>;
    theme: ZodOptional<ZodObject<{
        name: ZodOptional<ZodString>;
        colorScheme: ZodOptional<ZodObject<{
            dk1: ZodOptional<ZodString>;
            lt1: ZodOptional<ZodString>;
            dk2: ZodOptional<ZodString>;
            lt2: ZodOptional<ZodString>;
            accent1: ZodOptional<ZodString>;
            accent2: ZodOptional<ZodString>;
            accent3: ZodOptional<ZodString>;
            accent4: ZodOptional<ZodString>;
            accent5: ZodOptional<ZodString>;
            accent6: ZodOptional<ZodString>;
            hlink: ZodOptional<ZodString>;
            folHlink: ZodOptional<ZodString>;
        }, $strict>>;
        fontScheme: ZodOptional<ZodObject<{
            majorLatin: ZodOptional<ZodString>;
            minorLatin: ZodOptional<ZodString>;
            majorEa: ZodOptional<ZodString>;
            minorEa: ZodOptional<ZodString>;
        }, $strict>>;
    }, $strict>>;
    defaults: ZodOptional<ZodObject<{
        font: ZodOptional<ZodObject<{
            family: ZodString;
            size: ZodNumber;
        }, $strict>>;
        columnWidth: ZodOptional<ZodNumber>;
        rowHeight: ZodOptional<ZodNumber>;
    }, $strict>>;
    date1904: ZodOptional<ZodBoolean>;
    namedRanges: ZodOptional<ZodArray<ZodObject<{
        name: ZodString;
        ref: ZodString;
        scope: ZodOptional<ZodString>;
    }, $strict>>>;
    sheets: ZodArray<ZodObject<{
        name: ZodString;
        columns: ZodOptional<ZodArray<ZodObject<{
            width: ZodOptional<ZodNumber>;
            hidden: ZodOptional<ZodBoolean>;
            bestFit: ZodOptional<ZodBoolean>;
        }, $strict>>>;
        rows: ZodArray<ZodObject<{
            height: ZodOptional<ZodNumber>;
            hidden: ZodOptional<ZodBoolean>;
            cells: ZodArray<ZodObject<{
                value: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
                    text: ZodString;
                    font: ZodOptional<ZodObject<{
                        family: ZodOptional<ZodString>;
                        size: ZodOptional<ZodNumber>;
                        bold: ZodOptional<ZodBoolean>;
                        italic: ZodOptional<ZodBoolean>;
                        underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                            single: "single";
                            double: "double";
                            singleAccounting: "singleAccounting";
                            doubleAccounting: "doubleAccounting";
                        }>]>>;
                        strikethrough: ZodOptional<ZodBoolean>;
                        color: ZodOptional<ZodString>;
                        vertAlign: ZodOptional<ZodEnum<{
                            superscript: "superscript";
                            subscript: "subscript";
                        }>>;
                        charset: ZodOptional<ZodNumber>;
                    }, $strict>>;
                }, $strict>>, ZodObject<{
                    error: ZodEnum<{
                        "#NULL!": "#NULL!";
                        "#DIV/0!": "#DIV/0!";
                        "#VALUE!": "#VALUE!";
                        "#REF!": "#REF!";
                        "#NAME?": "#NAME?";
                        "#NUM!": "#NUM!";
                        "#N/A": "#N/A";
                        "#GETTING_DATA": "#GETTING_DATA";
                        "#SPILL!": "#SPILL!";
                        "#CALC!": "#CALC!";
                        "#FIELD!": "#FIELD!";
                        "#BLOCKED!": "#BLOCKED!";
                        "#UNKNOWN!": "#UNKNOWN!";
                        "#CONNECT!": "#CONNECT!";
                    }>;
                }, $strict>]>>;
                style: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
                formula: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
                    expression: ZodString;
                    cachedValue: ZodOptional<ZodUnion<readonly [ZodString, ZodUnion<readonly [ZodNumber, ZodNaN]>, ZodBoolean, ZodDate, ZodNull, ZodArray<ZodObject<{
                        text: ZodString;
                        font: ZodOptional<ZodObject<{
                            family: ZodOptional<ZodString>;
                            size: ZodOptional<ZodNumber>;
                            bold: ZodOptional<ZodBoolean>;
                            italic: ZodOptional<ZodBoolean>;
                            underline: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodEnum<{
                                single: "single";
                                double: "double";
                                singleAccounting: "singleAccounting";
                                doubleAccounting: "doubleAccounting";
                            }>]>>;
                            strikethrough: ZodOptional<ZodBoolean>;
                            color: ZodOptional<ZodString>;
                            vertAlign: ZodOptional<ZodEnum<{
                                superscript: "superscript";
                                subscript: "subscript";
                            }>>;
                            charset: ZodOptional<ZodNumber>;
                        }, $strict>>;
                    }, $strict>>, ZodObject<{
                        error: ZodEnum<{
                            "#NULL!": "#NULL!";
                            "#DIV/0!": "#DIV/0!";
                            "#VALUE!": "#VALUE!";
                            "#REF!": "#REF!";
                            "#NAME?": "#NAME?";
                            "#NUM!": "#NUM!";
                            "#N/A": "#N/A";
                            "#GETTING_DATA": "#GETTING_DATA";
                            "#SPILL!": "#SPILL!";
                            "#CALC!": "#CALC!";
                            "#FIELD!": "#FIELD!";
                            "#BLOCKED!": "#BLOCKED!";
                            "#UNKNOWN!": "#UNKNOWN!";
                            "#CONNECT!": "#CONNECT!";
                        }>;
                    }, $strict>]>>;
                    arrayRange: ZodOptional<ZodString>;
                    dynamic: ZodOptional<ZodBoolean>;
                }, $strict>]>>;
                hyperlink: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
                    target: ZodString;
                    display: ZodOptional<ZodString>;
                    tooltip: ZodOptional<ZodString>;
                }, $strict>, ZodObject<{
                    location: ZodString;
                    display: ZodOptional<ZodString>;
                    tooltip: ZodOptional<ZodString>;
                }, $strict>]>>;
                comment: ZodOptional<ZodObject<{
                    author: ZodOptional<ZodString>;
                    text: ZodString;
                }, $strict>>;
                colSpan: ZodOptional<ZodNumber>;
                rowSpan: ZodOptional<ZodNumber>;
            }, $strict>>;
        }, $strict>>;
        mergedCells: ZodOptional<ZodArray<ZodString>>;
        freezePane: ZodOptional<ZodObject<{
            row: ZodNumber;
            col: ZodNumber;
        }, $strict>>;
        autoFilter: ZodOptional<ZodUnion<readonly [ZodLiteral<true>, ZodObject<{
            ref: ZodString;
        }, $strict>]>>;
        dataValidations: ZodOptional<ZodArray<ZodObject<{
            ref: ZodString;
            type: ZodEnum<{
                custom: "custom";
                whole: "whole";
                decimal: "decimal";
                list: "list";
                date: "date";
                time: "time";
                textLength: "textLength";
            }>;
            operator: ZodOptional<ZodEnum<{
                between: "between";
                notBetween: "notBetween";
                equal: "equal";
                notEqual: "notEqual";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
                greaterThanOrEqual: "greaterThanOrEqual";
                lessThanOrEqual: "lessThanOrEqual";
            }>>;
            formula1: ZodUnion<readonly [ZodString, ZodNumber, ZodArray<ZodString>]>;
            formula2: ZodOptional<ZodUnion<readonly [ZodString, ZodNumber]>>;
            allowBlank: ZodOptional<ZodBoolean>;
            showDropDown: ZodOptional<ZodBoolean>;
            showInputMessage: ZodOptional<ZodBoolean>;
            promptTitle: ZodOptional<ZodString>;
            prompt: ZodOptional<ZodString>;
            showErrorMessage: ZodOptional<ZodBoolean>;
            errorTitle: ZodOptional<ZodString>;
            error: ZodOptional<ZodString>;
            errorStyle: ZodOptional<ZodEnum<{
                warning: "warning";
                stop: "stop";
                information: "information";
            }>>;
        }, $strict>>>;
        pageSetup: ZodOptional<ZodObject<{
            paperSize: ZodOptional<ZodNumber>;
            orientation: ZodOptional<ZodEnum<{
                portrait: "portrait";
                landscape: "landscape";
            }>>;
            scale: ZodOptional<ZodNumber>;
            fitToWidth: ZodOptional<ZodNumber>;
            fitToHeight: ZodOptional<ZodNumber>;
            printArea: ZodOptional<ZodString>;
            printTitles: ZodOptional<ZodObject<{
                rows: ZodOptional<ZodObject<{
                    start: ZodNumber;
                    end: ZodNumber;
                }, $strict>>;
                columns: ZodOptional<ZodObject<{
                    start: ZodNumber;
                    end: ZodNumber;
                }, $strict>>;
            }, $strict>>;
            options: ZodOptional<ZodObject<{
                gridLines: ZodOptional<ZodBoolean>;
                headings: ZodOptional<ZodBoolean>;
            }, $strict>>;
            margins: ZodOptional<ZodObject<{
                left: ZodOptional<ZodNumber>;
                right: ZodOptional<ZodNumber>;
                top: ZodOptional<ZodNumber>;
                bottom: ZodOptional<ZodNumber>;
                header: ZodOptional<ZodNumber>;
                footer: ZodOptional<ZodNumber>;
            }, $strict>>;
        }, $strict>>;
        state: ZodOptional<ZodEnum<{
            visible: "visible";
            hidden: "hidden";
            veryHidden: "veryHidden";
        }>>;
        tabColor: ZodOptional<ZodString>;
        rightToLeft: ZodOptional<ZodBoolean>;
        styling: ZodOptional<ZodObject<{
            headerRow: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
            alternateRows: ZodOptional<ZodObject<{
                odd: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
                even: ZodOptional<ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>>;
            }, $strict>>;
        }, $strict>>;
        conditionalFormatting: ZodOptional<ZodArray<ZodObject<{
            ref: ZodString;
            rules: ZodArray<ZodDiscriminatedUnion<[ZodObject<{
                type: ZodLiteral<"cellIs">;
                operator: ZodEnum<{
                    between: "between";
                    notBetween: "notBetween";
                    equal: "equal";
                    notEqual: "notEqual";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                    greaterThanOrEqual: "greaterThanOrEqual";
                    lessThanOrEqual: "lessThanOrEqual";
                }>;
                formula: ZodUnion<readonly [ZodString, ZodTuple<[ZodString, ZodString], null>]>;
                style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
            }, $strict>, ZodObject<{
                type: ZodLiteral<"colorScale">;
                scale: ZodObject<{
                    min: ZodObject<{
                        type: ZodEnum<{
                            percent: "percent";
                            min: "min";
                            max: "max";
                            num: "num";
                            percentile: "percentile";
                            formula: "formula";
                        }>;
                        value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                        color: ZodString;
                    }, $strict>;
                    mid: ZodOptional<ZodObject<{
                        type: ZodEnum<{
                            percent: "percent";
                            min: "min";
                            max: "max";
                            num: "num";
                            percentile: "percentile";
                            formula: "formula";
                        }>;
                        value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                        color: ZodString;
                    }, $strict>>;
                    max: ZodObject<{
                        type: ZodEnum<{
                            percent: "percent";
                            min: "min";
                            max: "max";
                            num: "num";
                            percentile: "percentile";
                            formula: "formula";
                        }>;
                        value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                        color: ZodString;
                    }, $strict>;
                }, $strict>;
            }, $strict>, ZodObject<{
                type: ZodLiteral<"dataBar">;
                color: ZodString;
                min: ZodObject<{
                    type: ZodEnum<{
                        percent: "percent";
                        min: "min";
                        max: "max";
                        num: "num";
                        percentile: "percentile";
                        formula: "formula";
                    }>;
                    value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                    color: ZodOptional<ZodString>;
                }, $strict>;
                max: ZodObject<{
                    type: ZodEnum<{
                        percent: "percent";
                        min: "min";
                        max: "max";
                        num: "num";
                        percentile: "percentile";
                        formula: "formula";
                    }>;
                    value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                    color: ZodOptional<ZodString>;
                }, $strict>;
                gradient: ZodOptional<ZodBoolean>;
                showValue: ZodOptional<ZodBoolean>;
                negativeColor: ZodOptional<ZodString>;
                axisPosition: ZodOptional<ZodEnum<{
                    none: "none";
                    automatic: "automatic";
                    middle: "middle";
                }>>;
                direction: ZodOptional<ZodEnum<{
                    leftToRight: "leftToRight";
                    rightToLeft: "rightToLeft";
                }>>;
            }, $strict>, ZodObject<{
                type: ZodLiteral<"top10">;
                rank: ZodNumber;
                percent: ZodOptional<ZodBoolean>;
                bottom: ZodOptional<ZodBoolean>;
                style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
            }, $strict>, ZodObject<{
                type: ZodLiteral<"duplicateValues">;
                style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
            }, $strict>, ZodObject<{
                type: ZodLiteral<"uniqueValues">;
                style: ZodUnion<readonly [ZodString, ZodType<any, unknown, $ZodTypeInternals<any, unknown>>]>;
            }, $strict>, ZodObject<{
                type: ZodLiteral<"iconSet">;
                iconSet: ZodEnum<{
                    "3Arrows": "3Arrows";
                    "3ArrowsGray": "3ArrowsGray";
                    "3Flags": "3Flags";
                    "3TrafficLights1": "3TrafficLights1";
                    "3TrafficLights2": "3TrafficLights2";
                    "3Signs": "3Signs";
                    "3Symbols": "3Symbols";
                    "3Symbols2": "3Symbols2";
                    "3Stars": "3Stars";
                    "3Triangles": "3Triangles";
                    "3Smilies": "3Smilies";
                    "4Arrows": "4Arrows";
                    "4ArrowsGray": "4ArrowsGray";
                    "4RedToBlack": "4RedToBlack";
                    "4Rating": "4Rating";
                    "4TrafficLights": "4TrafficLights";
                    "5Arrows": "5Arrows";
                    "5ArrowsGray": "5ArrowsGray";
                    "5Rating": "5Rating";
                    "5Quarters": "5Quarters";
                }>;
                showValue: ZodOptional<ZodBoolean>;
                reverse: ZodOptional<ZodBoolean>;
                thresholds: ZodOptional<ZodArray<ZodObject<{
                    type: ZodEnum<{
                        percent: "percent";
                        min: "min";
                        max: "max";
                        num: "num";
                        percentile: "percentile";
                        formula: "formula";
                    }>;
                    value: ZodOptional<ZodUnion<readonly [ZodNumber, ZodString]>>;
                    color: ZodOptional<ZodString>;
                }, $strict>>>;
            }, $strict>], "type">>;
        }, $strict>>>;
        tables: ZodOptional<ZodArray<ZodObject<{
            name: ZodString;
            displayName: ZodOptional<ZodString>;
            ref: ZodString;
            totalsRow: ZodOptional<ZodBoolean>;
            columns: ZodOptional<ZodArray<ZodObject<{
                name: ZodOptional<ZodString>;
                totalsRowLabel: ZodOptional<ZodString>;
                totalsRowFunction: ZodOptional<ZodEnum<{
                    min: "min";
                    max: "max";
                    sum: "sum";
                    average: "average";
                    count: "count";
                    countNums: "countNums";
                    stdDev: "stdDev";
                    var: "var";
                }>>;
                totalsRowFormula: ZodOptional<ZodString>;
            }, $strict>>>;
            style: ZodOptional<ZodObject<{
                name: ZodOptional<ZodString>;
                showFirstColumn: ZodOptional<ZodBoolean>;
                showLastColumn: ZodOptional<ZodBoolean>;
                showRowStripes: ZodOptional<ZodBoolean>;
                showColumnStripes: ZodOptional<ZodBoolean>;
            }, $strict>>;
        }, $strict>>>;
        protection: ZodOptional<ZodObject<{
            password: ZodOptional<ZodString>;
            sheet: ZodOptional<ZodBoolean>;
            objects: ZodOptional<ZodBoolean>;
            scenarios: ZodOptional<ZodBoolean>;
            formatCells: ZodOptional<ZodBoolean>;
            formatColumns: ZodOptional<ZodBoolean>;
            formatRows: ZodOptional<ZodBoolean>;
            insertColumns: ZodOptional<ZodBoolean>;
            insertRows: ZodOptional<ZodBoolean>;
            insertHyperlinks: ZodOptional<ZodBoolean>;
            deleteColumns: ZodOptional<ZodBoolean>;
            deleteRows: ZodOptional<ZodBoolean>;
            selectLockedCells: ZodOptional<ZodBoolean>;
            sort: ZodOptional<ZodBoolean>;
            autoFilter: ZodOptional<ZodBoolean>;
            pivotTables: ZodOptional<ZodBoolean>;
            selectUnlockedCells: ZodOptional<ZodBoolean>;
        }, $strict>>;
        images: ZodOptional<ZodArray<ZodObject<{
            data: ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>;
            type: ZodEnum<{
                png: "png";
                jpeg: "jpeg";
            }>;
            anchor: ZodObject<{
                from: ZodObject<{
                    col: ZodNumber;
                    row: ZodNumber;
                    colOffset: ZodOptional<ZodNumber>;
                    rowOffset: ZodOptional<ZodNumber>;
                }, $strict>;
                to: ZodOptional<ZodObject<{
                    col: ZodNumber;
                    row: ZodNumber;
                    colOffset: ZodOptional<ZodNumber>;
                    rowOffset: ZodOptional<ZodNumber>;
                }, $strict>>;
            }, $strict>;
            name: ZodOptional<ZodString>;
            description: ZodOptional<ZodString>;
            width: ZodOptional<ZodNumber>;
            height: ZodOptional<ZodNumber>;
        }, $strict>>>;
        charts: ZodOptional<ZodArray<ZodObject<{
            type: ZodEnum<{
                col: "col";
                bar: "bar";
                line: "line";
                pie: "pie";
                scatter: "scatter";
                area: "area";
                doughnut: "doughnut";
                radar: "radar";
                bubble: "bubble";
                stock: "stock";
                surface: "surface";
            }>;
            title: ZodOptional<ZodString>;
            series: ZodArray<ZodObject<{
                name: ZodOptional<ZodString>;
                categories: ZodOptional<ZodString>;
                values: ZodString;
            }, $strict>>;
            anchor: ZodObject<{
                from: ZodObject<{
                    col: ZodNumber;
                    row: ZodNumber;
                    colOffset: ZodOptional<ZodNumber>;
                    rowOffset: ZodOptional<ZodNumber>;
                }, $strict>;
                to: ZodOptional<ZodObject<{
                    col: ZodNumber;
                    row: ZodNumber;
                    colOffset: ZodOptional<ZodNumber>;
                    rowOffset: ZodOptional<ZodNumber>;
                }, $strict>>;
            }, $strict>;
            width: ZodOptional<ZodNumber>;
            height: ZodOptional<ZodNumber>;
            style: ZodOptional<ZodObject<{
                showLegend: ZodOptional<ZodBoolean>;
                showDataLabels: ZodOptional<ZodBoolean>;
            }, $strict>>;
        }, $strict>>>;
        pivotTables: ZodOptional<ZodArray<ZodObject<{
            name: ZodString;
            sourceSheet: ZodString;
            sourceRef: ZodString;
            targetCell: ZodString;
            rowFields: ZodOptional<ZodArray<ZodUnion<readonly [ZodString, ZodObject<{
                name: ZodString;
                subtotals: ZodOptional<ZodUnion<readonly [ZodLiteral<false>, ZodArray<ZodEnum<{
                    min: "min";
                    max: "max";
                    sum: "sum";
                    average: "average";
                    count: "count";
                    countNums: "countNums";
                    stdDev: "stdDev";
                    var: "var";
                    product: "product";
                    stdDevP: "stdDevP";
                    varP: "varP";
                }>>]>>;
            }, $strict>]>>>;
            columnFields: ZodOptional<ZodArray<ZodUnion<readonly [ZodString, ZodObject<{
                name: ZodString;
                subtotals: ZodOptional<ZodUnion<readonly [ZodLiteral<false>, ZodArray<ZodEnum<{
                    min: "min";
                    max: "max";
                    sum: "sum";
                    average: "average";
                    count: "count";
                    countNums: "countNums";
                    stdDev: "stdDev";
                    var: "var";
                    product: "product";
                    stdDevP: "stdDevP";
                    varP: "varP";
                }>>]>>;
            }, $strict>]>>>;
            filterFields: ZodOptional<ZodArray<ZodString>>;
            valueFields: ZodArray<ZodObject<{
                name: ZodString;
                summarizeBy: ZodOptional<ZodEnum<{
                    min: "min";
                    max: "max";
                    sum: "sum";
                    average: "average";
                    count: "count";
                    countNums: "countNums";
                    stdDev: "stdDev";
                    var: "var";
                    product: "product";
                    stdDevP: "stdDevP";
                    varP: "varP";
                }>>;
                title: ZodOptional<ZodString>;
            }, $strict>>;
            calculatedFields: ZodOptional<ZodArray<ZodObject<{
                name: ZodString;
                formula: ZodString;
            }, $strict>>>;
            valuesAxis: ZodOptional<ZodEnum<{
                column: "column";
                row: "row";
            }>>;
            showRowGrandTotals: ZodOptional<ZodBoolean>;
            showColumnGrandTotals: ZodOptional<ZodBoolean>;
            style: ZodOptional<ZodObject<{
                name: ZodOptional<ZodString>;
                showRowHeaders: ZodOptional<ZodBoolean>;
                showColumnHeaders: ZodOptional<ZodBoolean>;
                showRowStripes: ZodOptional<ZodBoolean>;
                showColumnStripes: ZodOptional<ZodBoolean>;
                showLastColumn: ZodOptional<ZodBoolean>;
            }, $strict>>;
        }, $strict>>>;
        pivotCharts: ZodOptional<ZodArray<ZodObject<{
            pivotTable: ZodString;
            type: ZodEnum<{
                col: "col";
                bar: "bar";
                line: "line";
                pie: "pie";
                scatter: "scatter";
                area: "area";
                doughnut: "doughnut";
                radar: "radar";
                bubble: "bubble";
                stock: "stock";
                surface: "surface";
            }>;
            title: ZodOptional<ZodString>;
            anchor: ZodObject<{
                from: ZodObject<{
                    col: ZodNumber;
                    row: ZodNumber;
                    colOffset: ZodOptional<ZodNumber>;
                    rowOffset: ZodOptional<ZodNumber>;
                }, $strict>;
                to: ZodOptional<ZodObject<{
                    col: ZodNumber;
                    row: ZodNumber;
                    colOffset: ZodOptional<ZodNumber>;
                    rowOffset: ZodOptional<ZodNumber>;
                }, $strict>>;
            }, $strict>;
            width: ZodOptional<ZodNumber>;
            height: ZodOptional<ZodNumber>;
            style: ZodOptional<ZodObject<{
                showLegend: ZodOptional<ZodBoolean>;
                showDataLabels: ZodOptional<ZodBoolean>;
            }, $strict>>;
        }, $strict>>>;
    }, $strict>>;
}, $strict>;
type SpreadsheetDocumentParsed = output<typeof SpreadsheetDocumentSchema>;
declare function validateSpreadsheetDocument(input: unknown, options?: SpreadsheetRelaxedInputOptions): SpreadsheetDocumentParsed;

declare class SharedStringTable {
    private readonly map;
    private readonly strings;
    private referenceCount;
    register(value: string): number;
    get count(): number;
    get uniqueCount(): number;
    get values(): readonly string[];
    toXml(): string;
}

interface FontDef extends SpreadsheetFontStyle {
    family: string;
    size: number;
    familyClassification?: number;
    scheme?: "minor" | "major";
    color?: string;
}

declare class StyleRegistry {
    private readonly defaults?;
    private readonly fontRegistry;
    private readonly fillRegistry;
    private readonly borderRegistry;
    private readonly numFmtRegistry;
    private readonly cellXfRegistry;
    private readonly dxfRegistry;
    private readonly styleIndexCache;
    private readonly dxfIndexCache;
    private readonly defaultFontFamily;
    private readonly defaultFontSize;
    constructor(defaults?: SpreadsheetDefaults | undefined);
    registerStyle(styleInput?: SpreadsheetCellStyleInput, cellValue?: CellValue): number;
    registerResolvedStyle(style: SpreadsheetCellStyle | undefined): number;
    registerDxf(styleInput: SpreadsheetCellStyleInput): number;
    getDefaultFont(): FontDef;
    get cellStyleCount(): number;
    get differentialStyleCount(): number;
    toXml(): string;
}

type NormalizedHyperlink = {
    mode: "external";
    target: string;
    display?: string;
    tooltip?: string;
} | {
    mode: "internal";
    location: string;
    display?: string;
    tooltip?: string;
};
declare function normalizeHyperlinkLocation(value: string): string;
declare function normalizeHyperlink(hyperlink: SpreadsheetHyperlink): NormalizedHyperlink;

declare function colIndexToLetter(index: number): string;
declare function rowIndexToRowNum(index: number): string;
declare function cellRef(row: number, col: number): string;
declare function absCellRef(row: number, col: number): string;
declare function parseCellRef(ref: string): {
    row: number;
    col: number;
};
interface ParsedRangeRef {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}
declare function parseRangeRef(ref: string): ParsedRangeRef;
declare function rangeRef(startRow: number, startCol: number, endRow: number, endCol: number): string;
declare function absRangeRef(startRow: number, startCol: number, endRow: number, endCol: number): string;
declare function formatSheetRef(sheetName: string, cellRef: string): string;
declare function formatSheetRange(sheetName: string, startCell: string, endCell: string): string;
declare function extractSheetReferences(formula: string): string[];

declare const PRESETS: {
    readonly header: {
        readonly font: {
            readonly bold: true;
            readonly color: "#FFFFFF";
            readonly size: 11;
            readonly family: "Calibri";
        };
        readonly fill: {
            readonly color: "#4472C4";
        };
        readonly border: {
            readonly bottom: {
                readonly style: "medium";
                readonly color: "#2F5597";
            };
        };
        readonly alignment: {
            readonly horizontal: "center";
            readonly vertical: "center";
        };
    };
    readonly headerDark: {
        readonly font: {
            readonly bold: true;
            readonly color: "#FFFFFF";
            readonly size: 11;
        };
        readonly fill: {
            readonly color: "#1F3864";
        };
        readonly border: {
            readonly bottom: {
                readonly style: "medium";
                readonly color: "#0D2240";
            };
        };
        readonly alignment: {
            readonly horizontal: "center";
            readonly vertical: "center";
        };
    };
    readonly headerGreen: {
        readonly font: {
            readonly bold: true;
            readonly color: "#FFFFFF";
            readonly size: 11;
        };
        readonly fill: {
            readonly color: "#548235";
        };
        readonly border: {
            readonly bottom: {
                readonly style: "medium";
                readonly color: "#375623";
            };
        };
        readonly alignment: {
            readonly horizontal: "center";
            readonly vertical: "center";
        };
    };
    readonly subheader: {
        readonly font: {
            readonly bold: true;
            readonly size: 10;
            readonly color: "#1F3864";
        };
        readonly fill: {
            readonly color: "#D6E4F0";
        };
        readonly border: {
            readonly bottom: {
                readonly style: "thin";
                readonly color: "#9DC3E6";
            };
        };
    };
    readonly total: {
        readonly font: {
            readonly bold: true;
        };
        readonly border: {
            readonly top: {
                readonly style: "thin";
                readonly color: "#333333";
            };
            readonly bottom: {
                readonly style: "double";
                readonly color: "#333333";
            };
        };
        readonly numberFormat: "#,##0.00";
    };
    readonly subtotal: {
        readonly font: {
            readonly bold: true;
            readonly color: "#44546A";
        };
        readonly border: {
            readonly top: {
                readonly style: "thin";
                readonly color: "#D9D9D9";
            };
        };
        readonly numberFormat: "#,##0.00";
    };
    readonly currency: {
        readonly alignment: {
            readonly horizontal: "right";
        };
        readonly numberFormat: "$#,##0.00";
    };
    readonly currencyKRW: {
        readonly alignment: {
            readonly horizontal: "right";
        };
        readonly numberFormat: "₩#,##0";
    };
    readonly currencyEUR: {
        readonly alignment: {
            readonly horizontal: "right";
        };
        readonly numberFormat: "€#,##0.00";
    };
    readonly percentage: {
        readonly alignment: {
            readonly horizontal: "right";
        };
        readonly numberFormat: "0.0%";
    };
    readonly percentageChange: {
        readonly alignment: {
            readonly horizontal: "right";
        };
        readonly numberFormat: "+0.0%;-0.0%;0.0%";
    };
    readonly integer: {
        readonly alignment: {
            readonly horizontal: "right";
        };
        readonly numberFormat: "#,##0";
    };
    readonly decimal2: {
        readonly alignment: {
            readonly horizontal: "right";
        };
        readonly numberFormat: "#,##0.00";
    };
    readonly date: {
        readonly numberFormat: "yyyy-mm-dd";
    };
    readonly datetime: {
        readonly numberFormat: "yyyy-mm-dd hh:mm";
    };
    readonly warning: {
        readonly font: {
            readonly color: "#9C5700";
        };
        readonly fill: {
            readonly color: "#FFEB9C";
        };
    };
    readonly error: {
        readonly font: {
            readonly color: "#9C0006";
        };
        readonly fill: {
            readonly color: "#FFC7CE";
        };
    };
    readonly success: {
        readonly font: {
            readonly color: "#006100";
        };
        readonly fill: {
            readonly color: "#C6EFCE";
        };
    };
    readonly neutral: {
        readonly font: {
            readonly color: "#44546A";
        };
        readonly fill: {
            readonly color: "#F2F2F2";
        };
    };
};
declare const PRESET_NAMES: string[];

interface StructuralValidationCheck {
    name: string;
    passed: boolean;
    details: string;
}
interface StructuralValidationSummary {
    passed: boolean;
    checks: StructuralValidationCheck[];
}
declare function validateXlsxStructure(buffer: Buffer): Promise<StructuralValidationSummary>;

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

declare function diffSpreadsheetDocuments(before: SpreadsheetDocument, after: SpreadsheetDocument, options?: DiffOptions): ChangeSet;

type XlsxWorkflowCode = "XLSX_ABORTED" | "XLSX_ARCHIVE_UNSAFE" | "XLSX_BUDGET_EXCEEDED" | "XLSX_CELL_NOT_FOUND" | "XLSX_ENCRYPTED_UNSUPPORTED" | "XLSX_EXTERNAL_LINK_PRESERVED" | "XLSX_FORMULA_CHANGED" | "XLSX_FORMULA_INJECTION" | "XLSX_FORMULA_NOT_RECALCULATED" | "XLSX_MACRO_PRESERVED_OPAQUE" | "XLSX_MAPPING_UNRESOLVED" | "XLSX_OPAQUE_PART_CHANGED" | "XLSX_OPAQUE_PART_PRESERVED" | "XLSX_STRUCTURE_CHANGED" | "XLSX_STYLE_CHANGED" | "XLSX_UNSUPPORTED_FEATURE_PRESERVED" | "XLSX_WRITE_CONFLICT" | "XLSX_XML_UNSAFE";
declare class XlsxWorkflowError extends Error {
    readonly code: XlsxWorkflowCode;
    readonly locator?: XlsxLocator;
    constructor(code: XlsxWorkflowCode, message: string, locator?: XlsxLocator);
}
interface XlsxWorkflowBudget {
    maxInputBytes?: number;
    maxPartBytes?: number;
    maxParts?: number;
    maxCells?: number;
}
interface XlsxWorkflowOptions extends XlsxWorkflowBudget {
    artifactId?: string;
    signal?: AbortSignal;
}
interface XlsxLocator {
    artifactId: string;
    scheme: "xlsx.a1";
    value: [sheet: string, ref: string];
}
interface XlsxWorkflowDiagnostic {
    code: XlsxWorkflowCode;
    message: string;
    severity: "info" | "warning" | "error";
    locator?: XlsxLocator;
}
interface XlsxWorkflowCell {
    locator: XlsxLocator;
    value: string | number | boolean | null;
    valueType: "blank" | "boolean" | "error" | "number" | "string";
    formula?: string;
    cachedValue?: string | number | boolean | null;
    styleId?: number;
}
interface XlsxWorkflowComment {
    locator: XlsxLocator;
    author?: string;
    text: string;
}
interface XlsxWorkflowValidation {
    ref: string;
    type?: string;
    operator?: string;
    formula1?: string;
    formula2?: string;
}
interface XlsxWorkflowSheet {
    name: string;
    state: "visible" | "hidden" | "veryHidden";
    dimensionRef?: string;
    hiddenRows: number[];
    hiddenColumns: Array<{
        min: number;
        max: number;
    }>;
    mergedRanges: string[];
    validations: XlsxWorkflowValidation[];
    cells: XlsxWorkflowCell[];
    comments: XlsxWorkflowComment[];
}
interface XlsxWorkflowNamedRange {
    name: string;
    ref: string;
    scopeSheet?: string;
}
interface XlsxWorkflowTable {
    name: string;
    displayName: string;
    sheetName: string;
    ref: string;
}
interface XlsxWorkflowInspection {
    artifactId: string;
    byteLength: number;
    sha256: string;
    date1904: boolean;
    sheets: XlsxWorkflowSheet[];
    namedRanges: XlsxWorkflowNamedRange[];
    tables: XlsxWorkflowTable[];
    styleCount: number;
    styleSha256?: string;
    macroParts: Array<{
        path: string;
        sha256: string;
        byteLength: number;
    }>;
    opaqueParts: Array<{
        path: string;
        sha256: string;
        byteLength: number;
    }>;
    externalLinks: string[];
    warnings: XlsxWorkflowDiagnostic[];
    losses: XlsxWorkflowDiagnostic[];
}
interface XlsxWorkflowPart {
    path: string;
    bytes: Buffer;
}
interface XlsxWorkflowDocument {
    readonly artifactId: string;
    readonly inspection: XlsxWorkflowInspection;
    /** The source package is retained for explicit export/writeback; no embedded code is executed. */
    readonly buffer: Buffer;
    readonly parts: readonly XlsxWorkflowPart[];
}
type XlsxMappingTarget = {
    id: string;
    kind: "a1";
    sheet: string;
    ref: string;
} | {
    id: string;
    kind: "namedRange";
    name: string;
} | {
    id: string;
    kind: "table";
    name: string;
};
interface XlsxMappedTarget {
    id: string;
    source: XlsxMappingTarget["kind"];
    locator: XlsxLocator;
}
type XlsxCellWriteValue = string | number | boolean | null | {
    error: string;
} | {
    dateSerial: number;
};
interface XlsxCellWrite {
    locator: XlsxLocator;
    value?: XlsxCellWriteValue;
    formula?: {
        expression: string;
        cachedValue?: string | number | boolean | null;
    };
    comment?: {
        text: string;
        author?: string;
    } | null;
}
interface XlsxVerificationIssue extends XlsxWorkflowDiagnostic {
    before?: string | number | boolean | null;
    after?: string | number | boolean | null;
}
interface XlsxVerificationResult {
    status: "PASS" | "FAIL";
    issues: XlsxVerificationIssue[];
    allowedCells: XlsxLocator[];
}
declare function importXlsxWorkflow(buffer: Buffer, options?: XlsxWorkflowOptions): Promise<XlsxWorkflowDocument>;
declare function inspectXlsxWorkflow(buffer: Buffer, options?: XlsxWorkflowOptions): Promise<XlsxWorkflowInspection>;
declare function mapXlsxWorkflow(document: XlsxWorkflowDocument, targets: XlsxMappingTarget[]): XlsxMappedTarget[];
declare function readXlsxWorkflow(document: XlsxWorkflowDocument, locators: XlsxLocator[]): XlsxWorkflowCell[];
declare function writeXlsxWorkflow(document: XlsxWorkflowDocument, writes: XlsxCellWrite[], options?: XlsxWorkflowOptions): Promise<XlsxWorkflowDocument>;
declare function exportXlsxWorkflow(document: XlsxWorkflowDocument, options?: {
    signal?: AbortSignal;
}): Promise<Buffer>;
declare function verifyXlsxWorkflow(before: XlsxWorkflowDocument, after: XlsxWorkflowDocument, options: {
    allowedCells: XlsxLocator[];
}): XlsxVerificationResult;
declare const XLSX_STRUCTURED_WORKFLOW_MANIFEST: {
    schemaVersion: 1;
    id: string;
    version: string;
    catalogItemId: string;
    title: string;
    operations: {
        name: string;
        summary: string;
        inputKinds: string[];
        outputKinds: string[];
    }[];
    warningCodes: {
        code: string;
        description: string;
    }[];
    lossCodes: {
        code: string;
        description: string;
    }[];
};
/** Structurally implements the neutral EX01 ExtensionDefinition without adding a runtime dependency. */
declare function createXlsxStructuredWorkflowExtension(): {
    manifest: {
        schemaVersion: 1;
        id: string;
        version: string;
        catalogItemId: string;
        title: string;
        operations: {
            name: string;
            summary: string;
            inputKinds: string[];
            outputKinds: string[];
        }[];
        warningCodes: {
            code: string;
            description: string;
        }[];
        lossCodes: {
            code: string;
            description: string;
        }[];
    };
    execute(request: any, context: any): Promise<{
        status: "ok";
        output: any;
        warnings: XlsxWorkflowDiagnostic[];
        losses: XlsxWorkflowDiagnostic[];
        artifacts: any[];
    }>;
};

export { FREE_XLSX_CHART_TYPES, FormulaEvaluator, PRESETS, PRESET_NAMES, SharedStringTable, SheetNameSchema, SpreadsheetCellSchema, SpreadsheetColumnSchema, SpreadsheetDefaultsSchema, SpreadsheetDocumentSchema, SpreadsheetEngine, SpreadsheetMetaSchema, SpreadsheetRowSchema, SpreadsheetSheetSchema, SpreadsheetTemplateAssemblyError, SpreadsheetTemplateParseError, SpreadsheetValidationError, StyleRegistry, ThemeConfigSchema, XLSX_RELAXED_INPUT_COERCIONS, XLSX_STRUCTURED_WORKFLOW_MANIFEST, XlsxWorkflowError, absCellRef, absRangeRef, cellRef, colIndexToLetter, createRenderPlan, createXlsxStructuredWorkflowExtension, diffSpreadsheetDocuments, exportXlsxWorkflow, extractSheetReferences, formatSheetRange, formatSheetRef, F as formula, importXlsxWorkflow, inspectXlsxWorkflow, isDeterministicModeEnabled, lintSpreadsheetDocument, mapXlsxWorkflow, normalizeHyperlink, normalizeHyperlinkLocation, offsetFormulaRows, parseCellRef, parseRangeRef, preflightSpreadsheet, preprocessSpreadsheetDocumentInput, rangeRef, readXlsxWorkflow, remediateSpreadsheetAccessibility, rowIndexToRowNum, setDeterministicMode, shiftFormulaRows, validateSpreadsheetAccessibility, validateSpreadsheetBuffer, validateSpreadsheetDocument, validateXlsxStructure, verifyXlsxWorkflow, writeXlsxWorkflow };
export type { AccessibilityConfig, AccessibilityConfigBase, AccessibilityFix, AccessibilityIssue, AccessibilityIssueCode, AccessibilityLevel, AccessibilityRemediationResult, AccessibilityReport, AccessibilitySeverity, AccessibilitySummary, CellValue, Change, ChangeSet, DiffOptions, FindingCode, FreeXlsxChartType, ProXlsxChartType, QualityFinding, QualityReport, QualityVerdict, RenderWithQualityResult, RepairEntry, RepairRisk, SpreadsheetAccessibilityConfig, SpreadsheetAccessibilityConfigBase, SpreadsheetBufferValidateOptions, SpreadsheetCell, SpreadsheetCellComment, SpreadsheetCellFormula, SpreadsheetCellFormulaInput, SpreadsheetCellStyle, SpreadsheetCellStyleInput, SpreadsheetChart, SpreadsheetChartSeries, SpreadsheetChartType, SpreadsheetColumn, SpreadsheetConditionalFormatting, SpreadsheetConditionalFormattingIconSetRule, SpreadsheetConditionalFormattingRule, SpreadsheetDataValidation, SpreadsheetDataValidationErrorStyle, SpreadsheetDataValidationOperator, SpreadsheetDataValidationType, SpreadsheetDefaults, SpreadsheetDocument, SpreadsheetEngineCapability, SpreadsheetErrorCode, SpreadsheetErrorValue, SpreadsheetExternalHyperlink, SpreadsheetFillStyle, SpreadsheetFinding, SpreadsheetFindingCategory, SpreadsheetFindingCode, SpreadsheetFindingSeverity, SpreadsheetFontStyle, SpreadsheetFreezePane, SpreadsheetHyperlink, SpreadsheetIconSetType, SpreadsheetImage, SpreadsheetImageAnchor, SpreadsheetInputWarning, SpreadsheetInternalHyperlink, SpreadsheetLintIssue, SpreadsheetLintIssueCode, SpreadsheetLintResult, SpreadsheetMeta, SpreadsheetNamedRange, SpreadsheetPageMargins, SpreadsheetPageSetup, SpreadsheetPartManifestEntry, SpreadsheetPartRenderMetrics, SpreadsheetPivotCalculatedField, SpreadsheetPivotChart, SpreadsheetPivotDimension, SpreadsheetPivotSubtotal, SpreadsheetPivotTable, SpreadsheetPivotTableStyle, SpreadsheetPivotValueField, SpreadsheetPreservedOpaquePart, SpreadsheetPrintOptions, SpreadsheetPrintRange, SpreadsheetPrintTitles, SpreadsheetQualityReport, SpreadsheetRelaxedInputOptions, SpreadsheetRenderKeyPartBytes, SpreadsheetRenderMetrics, SpreadsheetRenderModeRecommendation, SpreadsheetRenderOptions, SpreadsheetRenderPlan, SpreadsheetRenderResult, SpreadsheetRenderStageMetrics, SpreadsheetRepairAction, SpreadsheetRepairOptions, SpreadsheetRepairResult, SpreadsheetRepairValidationResult, SpreadsheetRequestedStringStrategy, SpreadsheetRichTextRun, SpreadsheetRichTextValue, SpreadsheetRow, SpreadsheetSheet, SpreadsheetSheetChunkMetrics, SpreadsheetSheetProtection, SpreadsheetSheetRenderMetrics, SpreadsheetSheetRenderPlan, SpreadsheetSheetStyling, SpreadsheetStringStrategy, SpreadsheetTable, SpreadsheetTableColumn, SpreadsheetTableStyle, SpreadsheetTableTotalsRowFunction, SpreadsheetTemplateAssemblyInput, SpreadsheetTemplateAssemblyIssue, SpreadsheetTemplateAssemblyIssueCode, SpreadsheetTemplateAssemblyOptions, SpreadsheetTemplateIndex, SpreadsheetTemplateInjectionAnchor, SpreadsheetTemplateInspectionReport, SpreadsheetTemplateNamedRange, SpreadsheetTemplateParseIssue, SpreadsheetTemplateParseIssueCode, SpreadsheetTemplateParseOptions, SpreadsheetTemplateRangeInput, SpreadsheetTemplateRelationship, SpreadsheetTemplateRowExpansionInput, SpreadsheetTemplateRowExpansionValue, SpreadsheetTemplateRowHint, SpreadsheetTemplateSanitizationAction, SpreadsheetTemplateSanitizationDisposition, SpreadsheetTemplateSheet, SpreadsheetTemplateStylesInventory, SpreadsheetTemplateSyntax, SpreadsheetTemplateTable, SpreadsheetTemplateValueInput, SpreadsheetValidationIssue, SpreadsheetValidationIssueCode, SpreadsheetValidationSummary, SpreadsheetValidationVerdict, SpreadsheetWorkloadEstimate, StructuralValidationCheck, StructuralValidationSummary, ThemeColorScheme, ThemeConfig, ThemeFontScheme, XlsxCellWrite, XlsxCellWriteValue, XlsxLocator, XlsxMappedTarget, XlsxMappingTarget, XlsxVerificationIssue, XlsxVerificationResult, XlsxWorkflowBudget, XlsxWorkflowCell, XlsxWorkflowCode, XlsxWorkflowComment, XlsxWorkflowDiagnostic, XlsxWorkflowDocument, XlsxWorkflowInspection, XlsxWorkflowNamedRange, XlsxWorkflowOptions, XlsxWorkflowSheet, XlsxWorkflowTable, XlsxWorkflowValidation };
