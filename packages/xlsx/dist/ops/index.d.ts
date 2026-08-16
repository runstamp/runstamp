/**
 * Shared type vocabulary for OC-1.
 *
 * This module is intentionally **runtime-free**: it contains only type aliases and
 * unions. Every other contract module may import it without creating a runtime
 * import cycle. See docs/architecture/operation-contract.md §3.
 */
/**
 * The domain a code, locator, or operation belongs to.
 *
 * Domains namespace error codes so that two packages cannot collide on the same
 * bare identifier — the defect OC-1 §1.1 documents between `PaperError` and
 * `DOCXError`, which both emitted `RESOURCE_LIMIT_EXCEEDED`.
 */
type ErrorDomain = "common" | "pptx" | "docx" | "xlsx" | "pdf" | "html" | "policy" | "license" | "connector" | "host";
/**
 * A stable, greppable, collision-proof code: `${domain}/${SCREAMING_SNAKE}`.
 *
 * Codes are contractual (OC-1 §9.1); messages are not. Consumers branch on `code`.
 */
type ErrorCode = `${ErrorDomain}/${string}`;
/** The pipeline stage that produced an error, diagnostic, or loss. */
type ErrorPhase = "input" | "validation" | "compilation" | "layout" | "typography" | "media" | "chart" | "serialization" | "archive" | "font" | "template" | "rendering" | "parsing" | "policy" | "transport";
/** Severity of a non-fatal observation that is *not* a faithfulness deviation. */
type DiagnosticSeverity = "debug" | "info" | "warn";
/**
 * How far an operation departed from faithfully representing its input.
 *
 * Ordered from least to most severe; `compareLossSeverity` relies on this order.
 */
type LossSeverity = 
/** Preserved, but represented differently (e.g. font substituted, metrics equal). */
"substituted"
/** Preserved with reduced fidelity (e.g. vector flattened to raster). */
 | "degraded"
/** Not represented in the output at all. */
 | "dropped";
/** A node kind addressable by a {@link import("./locator.js").Locator}. */
type LocatorKind = "page" | "slide" | "sheet" | "section" | "paragraph" | "run" | "table" | "row" | "column" | "cell" | "shape" | "image" | "chart" | "note" | "header" | "footer" | "comment" | "annotation"
/** A raw package part (an OOXML part, a PDF object). */
 | "part";
/**
 * The canonical verb taxonomy (OC-1 §4). Exactly these twelve.
 *
 * Packages may add *qualifiers* (`xlsx.extract.tables`) but never a new base verb;
 * a new verb requires an amendment to the contract.
 */
type Verb = "render" | "parse" | "inspect" | "validate" | "repair" | "convert" | "transform" | "diff" | "merge" | "split" | "extract" | "redact";
/**
 * A fully-qualified operation name: `${domain}.${verb}` with an optional qualifier.
 *
 * Examples: `docx.render`, `pdf.validate`, `xlsx.extract.tables`.
 */
type OperationName = `${ErrorDomain}.${Verb}` | `${ErrorDomain}.${Verb}.${string}`;
/** A source of non-reproducibility actually consumed by an operation. */
type NondeterminismSource = "clock" | "random" | "network" | "locale" | "filesystem" | "environment" | "concurrency";
/** How losses affect the success/failure decision. */
type LossPolicy = "collect" | "failOnDropped" | "failOnAny";

/**
 * The universal address into an artifact (OC-1 §3.6).
 *
 * A locator is the substrate every later capability depends on: citation
 * resolution, redaction plans, privilege logs, governance receipts and RAG
 * provenance all need to name "this exact position in these exact bytes" in a way
 * that survives JSON, a log line, and an agent's context window.
 *
 * Two properties are contractual:
 *
 * - **Bijective** — `parseLocator(formatLocator(l))` deep-equals `l`, and
 *   `formatLocator(parseLocator(s)) === s` for any canonically-formatted `s` (R20).
 * - **Stable** — the same logical position in the same bytes always produces the
 *   same string, across processes and platforms (R21).
 *
 * Canonical string form:
 *
 * ```
 * sha256:ab12…/pptx:slide[2]/shape[0]/run[3]
 * sha256:cd34…/xlsx:sheet[id=Sheet1]/cell[id=R4C7]
 * sha256:ef56…/pdf:page[11]/paragraph[4]#120-168
 * ```
 */

/** One step in a locator path. */
interface LocatorSegment {
    readonly kind: LocatorKind;
    /** Zero-based ordinal within the parent. */
    readonly index?: number;
    /** Stable native identity when the format provides one (sheet name, XML id). */
    readonly id?: string;
}
/** A character range within the addressed node. */
interface LocatorRange {
    readonly start: number;
    readonly end: number;
}
interface Locator {
    /**
     * Content hash of the artifact this locator points into, e.g. `sha256:<hex>`.
     * Binding the address to the bytes is what stops a locator from silently
     * resolving against a different version of the document (R22).
     */
    readonly artifact: string;
    readonly domain: ErrorDomain;
    /** Ordered, most-significant first. */
    readonly path: readonly LocatorSegment[];
    readonly range?: LocatorRange;
}

/**
 * Non-fatal observations that are *not* faithfulness deviations (OC-1 §3.4).
 *
 * A diagnostic reports something the caller may want to know — a heuristic taken,
 * an auto-fit applied, a deprecation — where the output still faithfully
 * represents the input.
 *
 * The boundary against {@link import("./loss.js").Loss} is the single most
 * important judgement in the contract: **if the output no longer faithfully
 * represents the input, it is a Loss, not a Diagnostic.** When in doubt, it is a
 * Loss (R15). Clipped text and truncated tables are losses, not warnings.
 */

interface Diagnostic {
    readonly code: ErrorCode;
    readonly severity: DiagnosticSeverity;
    readonly message: string;
    readonly phase: ErrorPhase;
    readonly locator?: Locator;
    readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * The loss ledger (OC-1 §3.5) — the contract's differentiating artifact.
 *
 * A `Loss` records that the operation could not faithfully preserve something.
 * The governing rule is **R16, no silent loss**: any transformation that does not
 * faithfully preserve its source must emit a Loss. An empty `losses` array is
 * therefore a positive, testable claim of full fidelity — not the absence of
 * information.
 *
 * This is what lets a buyer trust output without opening it, and it is the runtime
 * counterpart to the `losses.json` the extension factory already produces as
 * build-time evidence.
 */

interface Loss {
    readonly code: ErrorCode;
    readonly severity: LossSeverity;
    /** What was affected, in the caller's vocabulary (e.g. "embedded font Calibri"). */
    readonly subject: string;
    readonly message: string;
    /** Where it happened in the source. Required whenever positionally attributable. */
    readonly locator?: Locator;
    readonly expected?: string;
    readonly actual?: string;
    /** True when a supported option would have avoided this loss. */
    readonly avoidable: boolean;
    /** Names the option that would avoid it. Required when `avoidable` is true (R19). */
    readonly remediation?: string;
    readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Shared operation options (OC-1 §3.8).
 *
 * This module replaces the three independent `isDeterministicModeEnabled()`
 * implementations in `packages/docx`, `packages/json-to-pdf` and `packages/xlsx`,
 * which had drifted into three different meanings of "deterministic mode".
 *
 * **The process default is `true`**, matching all three current implementations —
 * each initializes `deterministicMode = true`. Defaulting to `false` here would
 * silently flip behavior in three packages when they migrate in Phase 2. The
 * `setDeterministicMode` mutator and the seed concept (`resolveDeterministicSeed`
 * in docx, `deterministicPdfFileIdSeed` in pdf) are carried forward for the same
 * reason. Reading the environment is new and purely additive: none of the three
 * existing implementations consult it.
 */

interface ResourceLimits {
    readonly maxInputBytes?: number;
    readonly maxOutputBytes?: number;
    readonly maxPages?: number;
    readonly maxElements?: number;
    readonly maxArchiveEntries?: number;
    /** Guards against zip bombs: decompressed bytes ÷ compressed bytes. */
    readonly maxExpansionRatio?: number;
    readonly maxDurationMs?: number;
}
interface OperationOptions {
    /** Force byte-reproducible output. Defaults to true. */
    readonly deterministic?: boolean;
    /** Seed for deterministic identifier generation (file ids, relationship ids). */
    readonly deterministicSeed?: string;
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
    readonly limits?: ResourceLimits;
    /** BCP-47 tag. Affects formatting only, never structure. */
    readonly locale?: string;
    /** Streaming sink; the result still carries the complete array. */
    readonly onDiagnostic?: (diagnostic: Diagnostic) => void;
    /** Streaming sink; the result still carries the complete array. */
    readonly onLoss?: (loss: Loss) => void;
    /** How losses affect the success decision. Defaults to "collect". */
    readonly lossPolicy?: LossPolicy;
}

/**
 * The contract version, independent of any package version.
 *
 * It appears in every {@link import("./receipt.js").Receipt} so a consumer can pin
 * behavior across package upgrades (OC-1 §9.6).
 */
declare const CONTRACT_VERSION: "1.0.0";
type ContractVersion = typeof CONTRACT_VERSION;

/**
 * The single error model for every Runstamp document operation (OC-1 §3.3).
 *
 * Before OC-1 the platform shipped four incompatible error models — `PaperError`
 * (core), `PdfError` (json-to-pdf), `DOCXError` (docx) and `RunstampFeatureError` —
 * with three different names for the remediation concept and a live code collision
 * on `RESOURCE_LIMIT_EXCEEDED`. This class replaces all of them.
 *
 * Two properties are load-bearing and deliberately non-optional:
 *
 * - `code` is namespaced (`docx/IMAGE_TIMEOUT`), so collisions are unrepresentable.
 * - `remediation` is **required**. An error a caller cannot act on is a defect; the
 *   MCP projection hands this string straight to a model so it can self-correct in
 *   one turn.
 */

/** One structured problem attached to a {@link PaperError}. */
interface ErrorIssue {
    /** Dotted/indexed path into the input, e.g. `slides[2].composition.blocks[0]`. */
    readonly path: string;
    readonly message: string;
    readonly expected?: string;
    readonly received?: string;
    /** One imperative sentence telling the caller how to fix this specific issue. */
    readonly remediation?: string;
    /** Where in the artifact, when the issue is positionally attributable. */
    readonly locator?: Locator;
}
/** The wire form of a {@link PaperError}. Lossless except `stack` and `cause`. */
interface PaperErrorJSON {
    readonly name: "PaperError";
    readonly code: ErrorCode;
    readonly phase: ErrorPhase;
    readonly message: string;
    readonly remediation: string;
    readonly issues: readonly ErrorIssue[];
    readonly retryable: boolean;
    readonly locator?: Locator;
    readonly details?: Readonly<Record<string, unknown>>;
}
interface PaperErrorInit {
    readonly code: ErrorCode;
    readonly phase: ErrorPhase;
    readonly message: string;
    /** Required. One imperative sentence naming the concrete fix. */
    readonly remediation: string;
    readonly issues?: readonly ErrorIssue[];
    readonly locator?: Locator;
    readonly details?: Readonly<Record<string, unknown>>;
    /**
     * True for transient conditions (rate limits, timeouts) where the identical
     * call may later succeed. Agents branch on this; retrying a conformance
     * violation is always wrong.
     */
    readonly retryable?: boolean;
    readonly cause?: unknown;
}
declare class PaperError extends Error {
    readonly code: ErrorCode;
    readonly phase: ErrorPhase;
    readonly remediation: string;
    readonly issues: readonly ErrorIssue[];
    readonly retryable: boolean;
    readonly locator?: Locator;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(init: PaperErrorInit);
    /** The domain segment of {@link code}. */
    get domain(): ErrorDomain;
    toJSON(): PaperErrorJSON;
}

/**
 * The determinism and provenance receipt (OC-1 §3.7).
 *
 * A receipt makes reproducibility *observable*: the platform already tests
 * determinism, but never returned proof of it, so a caller had no way to verify
 * what they received. `deterministic: true` is a falsifiable claim, verified by
 * the two-process byte-identity gate (C7); asserting it without that gate passing
 * is itself a contract violation.
 */

interface ToolVersion {
    readonly name: string;
    readonly version: string;
}
interface EngineIdentity {
    readonly name: string;
    readonly version: string;
}
interface Receipt {
    readonly contractVersion: ContractVersion;
    readonly operation: OperationName;
    readonly domain: ErrorDomain;
    readonly engine: EngineIdentity;
    /** `sha256:<hex>` of the input. */
    readonly inputHash: string;
    /** `sha256:<hex>` of the *effective* options, after defaults are applied. */
    readonly optionsHash: string;
    /** `sha256:<hex>` of the produced bytes, when the operation produced any. */
    readonly outputHash?: string;
    /**
     * True ⇒ identical (`inputHash`, `optionsHash`, `engine.version`) yields an
     * identical `outputHash`.
     */
    readonly deterministic: boolean;
    /** Non-deterministic inputs actually consumed. Non-empty when not deterministic. */
    readonly nondeterminismSources: readonly NondeterminismSource[];
    /** External tools or oracles invoked, with pinned versions. */
    readonly tools?: readonly ToolVersion[];
    /** Omitted entirely in deterministic mode — a timestamp would break byte-identity. */
    readonly producedAt?: string;
}

/**
 * The result envelope every operation returns (OC-1 §3.2).
 *
 * The defining rule is **R4: operations never throw for a document condition.**
 * Bad input, an unsupported feature, a conformance violation, a resource limit —
 * all return `{ ok: false }`. Throwing is reserved for programmer error and host
 * failure. This is what lets an agent consume any operation without wrapping every
 * call in try/catch, and what lets the MCP projection hand a model a `remediation`
 * string it can act on in a single turn.
 */

interface OperationSuccess<T> {
    readonly ok: true;
    readonly value: T;
    /** Faithfulness deviations. `[]` is a positive claim of full fidelity (R17). */
    readonly losses: readonly Loss[];
    readonly diagnostics: readonly Diagnostic[];
    readonly receipt: Receipt;
}
interface OperationFailure {
    readonly ok: false;
    readonly error: PaperError;
    /** Losses accrued before failure, preserved for partial-progress diagnosis. */
    readonly losses: readonly Loss[];
    readonly diagnostics: readonly Diagnostic[];
    /** Present when enough of the operation ran to bind its inputs. */
    readonly receipt?: Receipt;
}
type OperationResult<T> = OperationSuccess<T> | OperationFailure;

/**
 * Artifact payloads (OC-1 §3.9).
 *
 * Operations that produce a file return {@link ArtifactBytes}, never a bare
 * `Uint8Array`/`Buffer` (R31), so the hash and media type always travel with the
 * bytes and no caller has to re-derive them.
 */
interface ArtifactBytes {
    readonly bytes: Uint8Array;
    /** IANA media type, e.g. `application/pdf`. */
    readonly mediaType: string;
    /** Conventional file extension without a leading dot, e.g. `pdf`. */
    readonly extension: string;
    readonly byteLength: number;
    /** `sha256:<hex>` of `bytes`. */
    readonly hash: string;
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

/**
 * `@runstamp/xlsx/ops` — the OC-1 operation surface for the `xlsx` domain.
 *
 * Every export is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * Thin adapters over the existing engine — no spreadsheet logic is
 * reimplemented. The legacy exports on the package root keep working unchanged
 * through the deprecation window.
 */

/** Options accepted by `render`, layered on the shared operation options. */
interface XlsxRenderOpOptions extends OperationOptions {
    readonly render?: SpreadsheetRenderOptions;
}
/**
 * Structured document → native XLSX bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.xlsx", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
declare function render(input: SpreadsheetDocument, options?: XlsxRenderOpOptions): Promise<OperationResult<ArtifactBytes>>;
interface XlsxValidationReport {
    readonly valid: boolean;
    /** The engine's native lint or buffer-validation summary, unmodified. */
    readonly summary: unknown;
}
/**
 * Check a document or workbook bytes for defects. Never mutates the input.
 *
 * A structured document is linted; bytes are inspected as a package.
 */
declare function validate(input: SpreadsheetDocument | Uint8Array | Buffer, options?: OperationOptions): Promise<OperationResult<XlsxValidationReport>>;
/**
 * Repair defects in workbook bytes.
 *
 * Every change the repairer makes is reported as a loss, so a caller sees
 * exactly what was altered or removed rather than receiving silently-rewritten
 * bytes. Stripped macros and external connections are `dropped`, not merely
 * degraded — the content is gone.
 */
declare function repair(input: Uint8Array | Buffer, options?: OperationOptions): Promise<OperationResult<ArtifactBytes>>;
/** A cheap structural read of what a render would cost, without rendering. */
declare function inspect(input: SpreadsheetDocument, options?: OperationOptions): Promise<OperationResult<unknown>>;

declare const parse: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;
declare const transform: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;
declare const convert: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;

export { PaperError, convert, inspect, parse, render, repair, transform, validate };
export type { ArtifactBytes, Diagnostic, Locator, Loss, OperationOptions, OperationResult, Receipt, XlsxRenderOpOptions, XlsxValidationReport };
