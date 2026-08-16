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

interface ResourceLimits$1 {
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
    readonly limits?: ResourceLimits$1;
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

/**
 * Central registry of public-facing warning / issue codes.
 *
 * Every code that surfaces to consumers through `DocxWarning.code`,
 * `DocxInputWarning.code`, or the public `ValidationIssue.code`
 * (from `validateDocxDocument()`) must be declared here.
 *
 * Not covered by this registry: subsystems that surface their own typed
 * code streams (accessibility `DocxAccessibilityViolationCode`, internal
 * `vlt-validator` issues, internal `DOCXWarningCode` factory codes).
 * Those have their own enums in their own modules — isolation by design.
 *
 * Category prefixes (informational — not enforced by the type system):
 *   DOCX_RELAXED_*      — legacy-shape coercions (relaxed-input.ts)
 *   DOCX_VALIDATE_*     — validateDocxDocument() issues
 *   DOCX_SERIALIZER_*   — emitted by the native OOXML serializer
 *   DOCX_HTML_*         — HTML adapter diagnostics
 *   DOCX_PDF_*          — PDF bridge diagnostics
 *   DOCX_HYDRATE_*      — template hydration diagnostics
 */
declare const WARNING_CODES: readonly ["DOCX_RELAXED_THEME_STRING", "DOCX_RELAXED_CODE_BLOCK", "DOCX_RELAXED_MARGIN_TWIPS", "DOCX_RELAXED_PAGE_NUMBERS", "DOCX_RELAXED_META_KEY", "DOCX_RELAXED_CHART_POINTS", "DOCX_RELAXED_KIND_INJECTED", "DOCX_VALIDATE_SCHEMA", "DOCX_VALIDATE_IMAGE_NO_SRC", "DOCX_VALIDATE_TABLE_EMPTY", "DOCX_VALIDATE_CHART_NO_DATA", "DOCX_VALIDATE_HEADING_EMPTY", "DOCX_SERIALIZER_WARNING", "DOCX_STRICT_VALIDATOR_WARNING", "DOCX_HTML_CONVERSION_WARNING", "DOCX_PDF_BRIDGE_FALLBACK", "DOCX_HYDRATE_UNFILLED_PLACEHOLDER", "DOCX_HYDRATE_SPLIT_PLACEHOLDER"];
type DocxWarningCode = (typeof WARNING_CODES)[number];

interface ResourceLimits {
    maxPages: number;
    maxSections: number;
    maxElements: number;
    maxParagraphs: number;
    maxRunsPerParagraph: number;
    maxTextLength: number;
    maxTextNodeChars: number;
    maxFonts: number;
    maxTableColumns: number;
    maxTableNestingDepth: number;
    maxListNestingLevel: number;
    maxImageSizeBytes: number;
    maxTotalMediaBytes: number;
    maxTotalXmlBytes: number;
    maxInputJsonBytes: number;
    maxInputStringBytes: number;
    maxInputBase64Bytes: number;
}

/**
 * Image extraction utilities for DOCX.
 *
 * Extracts image information from StructuredDocument elements.
 * Production-ready with timeout, retry logic, and size limits.
 */

/**
 * Image fetching configuration for production reliability.
 */
interface ImageFetchConfig {
    /** Whether remote http(s) image fetching is allowed (default: false) */
    allowExternal?: boolean;
    /** Timeout in milliseconds for image fetch (default: 10000) */
    timeout?: number;
    /** Number of retry attempts (default: 3) */
    retries?: number;
    /** Maximum HTTP redirects to follow (default: 3) */
    maxRedirects?: number;
    /** Maximum image size in bytes (default: 10MB) */
    maxSize?: number;
    /** Base delay for exponential backoff in ms (default: 1000) */
    retryBaseDelay?: number;
}

/**
 * StructuredDocument Types
 *
 * Intermediate representation consumed by the DOCX serializer.
 * These types represent the bridge between input formats (DocxDocument, PaperDocument)
 * and the OOXML generation layer.
 *
 * Ported from: packages/converter/src/extraction/types.ts
 */

/**
 * Root document containing all pages and shared resources.
 */
interface StructuredDocument {
    /**
     * Kind discriminator. Required; distinguishes a StructuredDocument from
     * a DocxDocument at runtime without relying on duck typing.
     *
     * Legacy callers that construct this object without `__kind` will have
     * it injected by the serializer entry point with a
     * `DOCX_RELAXED_KIND_INJECTED` warning — but new code should always
     * set it explicitly.
     */
    __kind: 'StructuredDocument';
    /** Document metadata (title, author, etc.) */
    metadata: DocumentMetadata;
    /** Track changes session metadata */
    revisionInfo?: RevisionInfo;
    /** Pages in document order */
    pages: StructuredPage[];
    /** Shared style definitions */
    styles: StyleDefinitions;
    /** Asset registry (images, fonts, embedded files) */
    assets: AssetRegistry;
    /** Extraction/conversion statistics */
    stats: ExtractionStats;
    /** Warnings encountered during conversion */
    warnings: string[];
    /** Table of Contents configuration */
    toc?: TableOfContentsConfig;
}
/**
 * Table of Contents configuration.
 */
interface TableOfContentsConfig {
    title?: string;
    levels?: number;
    showPageNumbers?: boolean;
    hyperlinks?: boolean;
    leader?: 'dot' | 'dash' | 'underscore' | 'none';
    position?: 'start' | 'after-cover';
}
/**
 * Document metadata.
 */
interface DocumentMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    /** Custom metadata */
    custom?: Record<string, string>;
    /** BCP 47 language tag (e.g. "en-US", "fr-FR") */
    language?: string;
}
/**
 * Track changes session metadata.
 */
interface RevisionInfo {
    author?: string;
    date?: string;
    rsid?: string;
}
/**
 * A single page/section in the document.
 */
interface StructuredPage {
    /** 1-based page number */
    pageNumber: number;
    /** Page dimensions in CSS pixels */
    dimensions: PageDimensions;
    /** Content elements */
    elements: StructuredElement[];
    /** Background color or image */
    background?: Background;
    /** DOCX: Section break before this page */
    sectionBreak?: SectionBreak;
    /** DOCX: Header content */
    header?: HeaderFooterContent;
    /** DOCX: Footer content */
    footer?: HeaderFooterContent;
}
/**
 * Page dimensions and margins.
 */
interface PageDimensions {
    /** Width in CSS pixels */
    width: number;
    /** Height in CSS pixels */
    height: number;
    /** Margins in CSS pixels */
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}
/**
 * Union of all element types.
 */
type StructuredElement = HeadingElement | ParagraphElement | TextRunElement | CodeBlockElement | PageBreakElement | DividerElement | TableElement | ImageElement | ChartElement | ShapeElement | ListElement | ContainerElement;
/**
 * Element type discriminator.
 */
type ElementType = 'heading' | 'paragraph' | 'text-run' | 'code-block' | 'page-break' | 'divider' | 'table' | 'image' | 'chart' | 'shape' | 'list' | 'container';
/**
 * Base properties shared by all elements.
 */
interface BaseElement {
    /** Unique element ID */
    id: string;
    /** Element type discriminator */
    type: ElementType;
    /** Bounding box */
    position: BoundingBox;
    /** Z-index (stacking order) */
    zIndex: number;
    /** Opacity (0-1) */
    opacity: number;
    /** Computed styles */
    style: ComputedStyle;
    /** Layout information (CSS Grid, Flexbox, etc.) */
    layout?: ExtractedLayoutInfo;
    /** Original HTML tag name */
    tagName: string;
    /** Data attributes */
    dataAttributes: Record<string, string>;
    /** DOCX-specific hints */
    docx?: DOCXHints;
}
/**
 * Bounding box.
 */
interface BoundingBox {
    /** X position relative to page origin */
    x: number;
    /** Y position relative to page origin */
    y: number;
    /** Width in CSS pixels */
    width: number;
    /** Height in CSS pixels */
    height: number;
}
/**
 * Heading element (h1-h6).
 */
interface HeadingElement extends BaseElement {
    type: 'heading';
    /** Heading level (1-6) */
    level: 1 | 2 | 3 | 4 | 5 | 6;
    /** Plain text content */
    text: string;
    /** Formatted text runs */
    runs: TextRun[];
    /** Track changes metadata for paragraph-level revisions */
    revision?: ParagraphRevision;
    /** Paragraph-level comment metadata */
    comment?: CommentInfo;
}
/**
 * Paragraph element.
 */
interface ParagraphElement extends BaseElement {
    type: 'paragraph';
    /** Plain text content */
    text: string;
    /** Formatted text runs */
    runs: TextRun[];
    /** Track changes metadata for paragraph-level revisions */
    revision?: ParagraphRevision;
    /** Paragraph-level comment metadata */
    comment?: CommentInfo;
}
/**
 * Inline text run (span-level content).
 */
interface TextRunElement extends BaseElement {
    type: 'text-run';
    /** Plain text content */
    text: string;
    /** Formatted text runs */
    runs: TextRun[];
    /** Paragraph-level comment metadata */
    comment?: CommentInfo;
}
/**
 * Code block element.
 */
interface CodeBlockElement extends BaseElement {
    type: 'code-block';
    /** Raw code content */
    code: string;
    /** Optional language identifier */
    language?: string;
    /** Whether line numbers should be shown */
    showLineNumbers?: boolean;
}
/**
 * Explicit page break element.
 */
interface PageBreakElement extends BaseElement {
    type: 'page-break';
}
/**
 * Horizontal divider element.
 */
interface DividerElement extends BaseElement {
    type: 'divider';
    /** Border style */
    styleType?: 'solid' | 'dashed' | 'dotted' | 'double';
    /** Divider color */
    color?: string;
    /** Divider thickness in points */
    thickness?: number;
}
/**
 * Table element with full structure.
 */
interface TableElement extends BaseElement {
    type: 'table';
    /** Visual table preset from the JSON DOCX surface */
    tableStyle?: 'plain' | 'striped' | 'bordered' | 'modern' | 'minimal' | 'corporate';
    /** Column definitions */
    columns: TableColumn[];
    /** All rows (header + body + footer) */
    rows: TableRow[];
    /** Number of header rows (to repeat on page break) */
    headerRowCount: number;
    /** Number of footer rows */
    footerRowCount: number;
    /** Should headers repeat on page breaks */
    repeatHeaders: boolean;
    /** Keep a short table on one page when Word can do so */
    keepTogether?: boolean;
    /** Keep the final table row with the following block when Word can do so */
    keepWithNext?: boolean;
    /** 2D matrix for rowspan/colspan tracking */
    cellMatrix: CellReference[][];
    /** Table caption (if any) */
    caption?: string;
    /** OOXML table description for accessibility (<w:tblDescription>) */
    tableDescription?: string;
    /** OOXML table caption for accessibility (<w:tblCaption>) */
    tableCaption?: string;
    /** Track changes metadata for table-level revisions */
    revision?: TableRevision;
}
/**
 * Table column definition.
 */
interface TableColumn {
    /** Column width in CSS pixels */
    width: number;
    /** Minimum width */
    minWidth?: number;
    /** Maximum width */
    maxWidth?: number;
}
/**
 * Table row.
 */
interface TableRow {
    /** Row index (0-based) */
    index: number;
    /** Row height in CSS pixels */
    height: number;
    /** Cells in this row */
    cells: TableCell[];
    /** Is this a header row */
    isHeader: boolean;
    /** Is this a footer row */
    isFooter: boolean;
    /** Track changes metadata for row structural revisions */
    revision?: TableRowRevision;
}
/**
 * Table cell.
 */
interface TableCell {
    /** Cell position in grid */
    row: number;
    col: number;
    /** Span counts */
    rowSpan: number;
    colSpan: number;
    /** Cell content (text runs) */
    content: TextRun[];
    /** Plain text content */
    text: string;
    /** Rich block content for nested tables or structured cell bodies */
    elements?: StructuredElement[];
    /** Cell-specific styles */
    style: CellStyle;
    /** Is this a header cell (th) */
    isHeader: boolean;
    /** Track changes metadata for cell structural revisions */
    revision?: TableCellRevision;
}
/**
 * Cell reference in the matrix (for rowspan/colspan tracking).
 */
interface CellReference {
    /** Origin row of the cell */
    originRow: number;
    /** Origin column of the cell */
    originCol: number;
    /** Is this the origin position */
    isOrigin: boolean;
    /** Reference to the actual cell */
    cell: TableCell;
}
/**
 * Cell-specific styles.
 */
interface CellStyle {
    /** Background color */
    backgroundColor?: string;
    /** Text color */
    color?: string;
    /** Font family */
    fontFamily?: string;
    /** Font size */
    fontSize?: number;
    /** Font weight */
    fontWeight?: string;
    /** Border styles */
    borderTop?: BorderStyle;
    borderRight?: BorderStyle;
    borderBottom?: BorderStyle;
    borderLeft?: BorderStyle;
    /** Padding */
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    /** Vertical alignment */
    verticalAlign: 'top' | 'middle' | 'bottom';
    /** Text alignment */
    textAlign: 'left' | 'center' | 'right' | 'justify';
}
/**
 * Image element.
 */
interface ImageElement extends BaseElement {
    type: 'image';
    /** Image source (URL, data URI, or asset reference) */
    src: string;
    /** Binary image data, used when the public input provided a Buffer */
    binaryData?: Buffer;
    /** Alternative text */
    alt: string;
    /** Natural dimensions (if available) */
    naturalWidth?: number;
    naturalHeight?: number;
    /** Asset ID (if registered in AssetRegistry) */
    assetId?: string;
    /** Image fit mode */
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    /** Whether the image is decorative (no alt text needed for screen readers) */
    decorative?: boolean;
}
/**
 * Chart element.
 */
interface ChartElement extends BaseElement {
    type: 'chart';
    /** Chart type */
    chartType: ChartType;
    /** Chart title */
    title?: string;
    /** Data series */
    series: ChartSeries[];
    /** Category labels (X-axis) */
    categories?: string[];
    /** Legend configuration */
    legend?: LegendConfig;
    /** Axes configuration */
    axes?: AxesConfig;
    /** For Office formats: should embed Excel data */
    embedData: boolean;
}
/**
 * Supported chart types.
 */
type ChartType = 'bar' | 'column' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar';
/**
 * Chart data series.
 */
interface ChartSeries {
    /** Series name */
    name: string;
    /** Data values */
    values: number[];
    /** Series color */
    color?: string;
}
/**
 * Shape element.
 */
interface ShapeElement extends BaseElement {
    type: 'shape';
    /** Shape type */
    shapeType: ShapeType;
    /** Fill color or gradient */
    fill?: FillStyle;
    /** Stroke/outline */
    stroke?: StrokeStyle;
    /** Text content (if shape contains text) */
    text?: string;
    /** Text runs (if shape contains formatted text) */
    runs?: TextRun[];
    /** Custom path data (for custom shapes) */
    pathData?: string;
}
/**
 * Supported shape types.
 */
type ShapeType = 'rectangle' | 'ellipse' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'line' | 'custom';
/**
 * List element (ul/ol).
 */
interface ListElement extends BaseElement {
    type: 'list';
    /** List type */
    listType: 'bullet' | 'number' | 'letter' | 'roman';
    /** Starting number (for numbered lists) */
    start: number;
    /** List items */
    items: ListItem[];
    /** Nesting level (0 = top level) */
    level: number;
}
/**
 * List item.
 */
interface ListItem {
    /** Item content (text runs) */
    content: TextRun[];
    /** Plain text */
    text: string;
    /** Nested list (if any) */
    nestedList?: ListElement;
}
/**
 * Container element (div, section, etc.).
 */
interface ContainerElement extends BaseElement {
    type: 'container';
    /** Keep a bounded vertical group on one page when Word can do so */
    keepTogether?: boolean;
    /** Child elements */
    children: StructuredElement[];
}
/**
 * A run of text with consistent formatting.
 */
interface TextRun {
    /** Text content */
    text: string;
    /** Font family */
    fontFamily: string;
    /** Font size in points */
    fontSize: number;
    /** Font weight */
    fontWeight: 'normal' | 'bold' | number;
    /** Font style */
    fontStyle: 'normal' | 'italic';
    /** Text decoration */
    textDecoration: 'none' | 'underline' | 'line-through' | 'underline line-through';
    /** Text color (hex) */
    color: string;
    /** Background/highlight color */
    backgroundColor?: string;
    /** Hyperlink URL */
    link?: string;
    /** Superscript */
    superscript?: boolean;
    /** Subscript */
    subscript?: boolean;
    /** Track changes metadata */
    revision?: TextRunRevision;
}
/**
 * Run style snapshot used for formatting revisions.
 */
interface TextRunStyleSnapshot {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | number;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    color?: string;
    backgroundColor?: string;
    superscript?: boolean;
    subscript?: boolean;
    letterSpacing?: number;
}
/**
 * Track changes metadata attached to a text run.
 */
interface TextRunRevision {
    type: 'insert' | 'delete' | 'format';
    id?: number;
    author?: string;
    date?: string;
    beforeStyle?: TextRunStyleSnapshot;
}
/**
 * Base metadata shared by non-run tracked-change records.
 */
interface BaseRevisionMetadata {
    id?: number;
    author?: string;
    date?: string;
}
/**
 * Snapshot of paragraph properties for paragraph property revisions.
 */
interface ParagraphRevisionProperties {
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    keepLines?: boolean;
    keepNext?: boolean;
    pageBreakBefore?: boolean;
    indent?: {
        firstLine?: number;
        left?: number;
        right?: number;
    };
}
/**
 * Track changes metadata attached to a paragraph-level element.
 */
interface ParagraphRevision extends BaseRevisionMetadata {
    type: 'insert' | 'delete' | 'property' | 'moveFrom' | 'moveTo';
    moveName?: string;
    before?: ParagraphRevisionProperties;
}
/**
 * Snapshot of table-level properties for table property revisions.
 */
interface TableRevisionProperties {
    caption?: string;
    tableDescription?: string;
    tableCaption?: string;
}
/**
 * Track changes metadata attached to a table element.
 */
interface TableRevision extends BaseRevisionMetadata {
    type: 'property';
    before?: TableRevisionProperties;
}
/**
 * Track changes metadata attached to a table cell.
 */
interface TableCellRevision extends BaseRevisionMetadata {
    type: 'insert' | 'delete';
}
/**
 * Track changes metadata attached to a table row.
 */
interface TableRowRevision extends BaseRevisionMetadata {
    type: 'insert' | 'delete';
}
/**
 * Computed styles.
 */
interface ComputedStyle {
    backgroundColor?: string;
    backgroundImage?: string;
    borderTopWidth: number;
    borderTopColor: string;
    borderTopStyle: string;
    borderRightWidth: number;
    borderRightColor: string;
    borderRightStyle: string;
    borderBottomWidth: number;
    borderBottomColor: string;
    borderBottomStyle: string;
    borderLeftWidth: number;
    borderLeftColor: string;
    borderLeftStyle: string;
    borderRadius: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    lineHeight: number;
    letterSpacing: number;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    textDecoration: string;
    color: string;
    display: string;
    visibility: string;
    overflow: string;
    boxShadow?: string;
    opacity: number;
    transform?: string;
}
/**
 * Border style definition.
 */
interface BorderStyle {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
}
/**
 * Fill style (solid or gradient).
 */
interface FillStyle {
    type: 'solid' | 'gradient';
    color?: string;
    gradient?: GradientDefinition;
}
/**
 * Gradient definition.
 */
interface GradientDefinition {
    type: 'linear' | 'radial';
    angle?: number;
    stops: GradientStop[];
}
/**
 * Gradient stop.
 */
interface GradientStop {
    color: string;
    position: number;
}
/**
 * Stroke/outline style.
 */
interface StrokeStyle {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
}
/**
 * DOCX-specific hints.
 */
interface DOCXHints {
    /** Word style ID */
    styleId?: string;
    /** Paragraph style ID */
    paragraphStyleId?: string;
    /** Heading level for outline */
    outlineLevel?: number;
    /** List numbering info */
    listInfo?: ListNumberingInfo;
    /** Bookmark ID */
    bookmarkId?: string;
    /** Keep lines together */
    keepLines?: boolean;
    /** Keep with next paragraph */
    keepNext?: boolean;
    /** Page break before */
    pageBreakBefore?: boolean;
    /** Explicit paragraph indentation in points */
    indent?: {
        firstLine?: number;
        left?: number;
        right?: number;
    };
    /** Footnote content */
    footnote?: string;
    /** Endnote content */
    endnote?: string;
    /** Comment */
    comment?: CommentInfo;
}
/**
 * List numbering info for DOCX.
 */
interface ListNumberingInfo {
    /** Numbering definition ID */
    numId: number;
    /** Indent level */
    level: number;
}
/**
 * Comment info for DOCX.
 */
interface CommentInfo {
    id?: number;
    parentId?: number;
    text: string;
    author?: string;
    initials?: string;
    date?: Date | string;
    done?: boolean;
}
/**
 * Asset registry for images, fonts, embedded files.
 */
interface AssetRegistry {
    /** Images by ID */
    images: Map<string, ImageAsset>;
    /** Fonts by family name */
    fonts: Map<string, FontAsset>;
    /** Embedded files by ID */
    embeddedFiles: Map<string, EmbeddedFile>;
}
/**
 * Image asset.
 */
interface ImageAsset {
    id: string;
    src: string;
    mimeType: string;
    width: number;
    height: number;
    data?: ArrayBuffer;
}
/**
 * Font asset.
 */
interface FontAsset {
    family: string;
    src: string;
    weight?: string;
    style?: string;
    data?: ArrayBuffer;
}
/**
 * Embedded file (for charts with Excel data, etc.).
 */
interface EmbeddedFile {
    id: string;
    name: string;
    mimeType: string;
    data: ArrayBuffer;
}
/**
 * Shared style definitions.
 */
interface StyleDefinitions {
    /** Named paragraph styles */
    paragraphStyles: Map<string, ParagraphStyleDef>;
    /** Named character styles */
    characterStyles: Map<string, CharacterStyleDef>;
    /** Table styles */
    tableStyles: Map<string, TableStyleDef>;
}
/**
 * Paragraph style definition.
 */
interface ParagraphStyleDef {
    name: string;
    basedOn?: string;
    nextStyle?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    lineHeight?: number;
    spacingBefore?: number;
    spacingAfter?: number;
    textAlign?: string;
    color?: string;
}
/**
 * Character style definition.
 */
interface CharacterStyleDef {
    name: string;
    basedOn?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    textDecoration?: string;
}
/**
 * Table style definition.
 */
interface TableStyleDef {
    name: string;
    borderColor?: string;
    borderWidth?: number;
    headerBackground?: string;
    alternateRowBackground?: string;
}
/**
 * Background definition.
 */
interface Background {
    type: 'color' | 'image' | 'gradient';
    color?: string;
    image?: string;
    gradient?: GradientDefinition;
}
/**
 * Section break for DOCX.
 */
interface SectionBreak {
    type: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage';
}
/**
 * Header/footer content.
 */
interface HeaderFooterContent {
    /** Content elements */
    elements: StructuredElement[];
    /** First-page content elements, when differentFirst is enabled */
    firstElements?: StructuredElement[];
    /** Even-page content elements, when differentOddEven is enabled */
    evenElements?: StructuredElement[];
    /** Different first page */
    differentFirst?: boolean;
    /** Different odd/even pages */
    differentOddEven?: boolean;
}
/**
 * Legend configuration for charts.
 */
interface LegendConfig {
    position: 'top' | 'bottom' | 'left' | 'right' | 'none';
    entries?: string[];
}
/**
 * Axes configuration for charts.
 */
interface AxesConfig {
    xAxis?: AxisConfig;
    yAxis?: AxisConfig;
}
/**
 * Single axis configuration.
 */
interface AxisConfig {
    title?: string;
    min?: number;
    max?: number;
    gridLines?: boolean;
}
/**
 * CSS Grid position for a child element within a grid container.
 */
interface GridPosition {
    columnStart: number;
    columnEnd: number;
    rowStart: number;
    rowEnd: number;
}
/**
 * Parsed grid track (column or row) definition.
 */
interface GridTrack {
    type: 'fr' | 'px' | 'percent' | 'auto' | 'min-content' | 'max-content';
    value: number;
    computedSize?: number;
}
/**
 * Layout semantic information.
 */
interface ExtractedLayoutInfo {
    type: 'block' | 'flex' | 'grid' | 'inline' | 'inline-flex' | 'inline-grid' | 'none';
    flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
    flexGap?: number;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: string;
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    order?: number;
    gridTemplateColumns?: GridTrack[];
    gridTemplateRows?: GridTrack[];
    gridColumnGap?: number;
    gridRowGap?: number;
    gridTemplateColumnsRaw?: string;
    gridTemplateRowsRaw?: string;
    columnCount?: number;
    rowCount?: number;
    gridPosition?: GridPosition;
    gridArea?: string;
    childrenLayout?: 'horizontal' | 'vertical' | 'grid' | 'none';
    isLayoutContainer?: boolean;
    hasUniformChildren?: boolean;
    detectedColumns?: number;
    detectedRows?: number;
}
/**
 * Statistics from extraction/conversion process.
 */
interface ExtractionStats {
    /** Total pages */
    pageCount: number;
    /** Total elements */
    elementCount: number;
    /** Elements by type */
    elementsByType: Record<ElementType, number>;
    /** Total images */
    imageCount: number;
    /** Total tables */
    tableCount: number;
    /** Total charts */
    chartCount: number;
    /** Conversion time in ms */
    extractionTimeMs: number;
}
/**
 * Render options.
 */
interface RenderOptions {
    /** Pluggable image processing (default: no-op) */
    imageAdapter?: ImageAdapter;
    /** Pluggable chart rendering (default: data-table fallback) */
    chartAdapter?: ChartAdapter;
    /** Enable opt-in legacy input coercions before schema validation. */
    relaxed?: boolean;
    /** Structured callback for relaxed-input warnings. */
    onInputWarning?: (warning: DocxInputWarning) => void;
    /**
     * Use a fixed serializer seed for byte-stable ZIP metadata, relationship
     * numbering, revision IDs, and generated OOXML IDs. Defaults to the
     * package-level `setDeterministicMode()` value, which is enabled.
     */
    deterministic?: boolean;
    /** Override the fixed serializer seed used when deterministic mode is on. */
    deterministicSeed?: string;
    /** Request archival PDF output when rendering PDF buffers */
    pdfA?: 'PDF/A-1b' | 'PDF/A-2b';
    /** Request tagged PDF output when rendering PDF buffers */
    tagged?: boolean;
    /** Progress callback for streaming */
    onProgress?: (progress: RenderProgress) => void;
    /** Abort signal */
    signal?: AbortSignal;
    /**
     * Run a post-emit OOXML strict validator on the produced buffer and
     * throw if it finds structural violations (negative tab positions,
     * Content_Types overrides without a backing part, unresolved r:id
     * references). Defaults to `true`; pass `strict: false` to skip this
     * post-emit guard. See `validateDocxBuffer`.
     */
    strict?: boolean;
    /**
     * Override native serializer and public input resource limits. These limits
     * are checked before schema conversion and again before OOXML serialization.
     */
    resourceLimits?: Partial<ResourceLimits>;
    /**
     * External image fetching policy for native DOCX renders. Remote http(s)
     * sources are disabled by default and require `allowExternal: true`.
     * Deterministic renders force-disable network image fetches regardless.
     */
    imageFetch?: ImageFetchConfig & {
        /** Maximum simultaneous external image fetches inside one render. */
        maxConcurrentExternalFetches?: number;
        /** Aggregate external-fetch wall time allowed per render (default: 30000ms). */
        maxTotalExternalFetchTimeMs?: number;
        /** Aggregate external image bytes allowed per render (default: 50MB). */
        maxTotalExternalFetchBytes?: number;
    };
}
/**
 * Render progress information.
 *
 * `pageIndex` / `pageCount` are populated during the 'serializing' phase
 * when the native serializer is walking page-by-page, so UIs can show
 * granular progress on multi-page documents. They are omitted for
 * setup-time phases like 'validating' and 'converting'.
 */
interface RenderProgress {
    phase: 'validating' | 'converting' | 'serializing' | 'optimizing';
    percent: number;
    message?: string;
    pageIndex?: number;
    pageCount?: number;
}
/**
 * Pluggable image processing adapter.
 */
interface ImageAdapter {
    /** Rasterize SVG to PNG buffer */
    rasterizeSvg?(svg: string, width: number, height: number): Promise<Buffer>;
    /** Convert image format (WebP/HEIC → PNG) */
    convertFormat?(buffer: Buffer, fromMime: string, toMime: string): Promise<Buffer>;
    /** Fetch remote image */
    fetchImage?(url: string, timeoutMs?: number): Promise<{
        buffer: Buffer;
        mimeType: string;
    }>;
}
/**
 * Pluggable chart rendering adapter.
 */
interface ChartAdapter {
    /** Render chart data to PNG image buffer */
    renderChart?(chart: ChartRenderInput, width: number, height: number): Promise<Buffer>;
}
/**
 * Input for chart rendering.
 */
interface ChartRenderInput {
    chartType: string;
    title?: string;
    series: Array<{
        name: string;
        values: number[];
        color?: string;
    }>;
    categories?: string[];
    legend?: {
        position: string;
    };
    axes?: {
        x?: {
            title?: string;
        };
        y?: {
            title?: string;
            min?: number;
            max?: number;
        };
    };
}
/**
 * Validation result from validateDocxDocument().
 */
interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    stats: {
        elementsChecked: number;
        errorsFound: number;
        warningsFound: number;
    };
}
/**
 * A single validation issue.
 */
interface ValidationIssue {
    severity: 'error' | 'warning';
    code: DocxWarningCode;
    message: string;
    path?: string;
    details?: Record<string, unknown>;
}
interface DocxInputWarning {
    code: DocxWarningCode;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
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
interface ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodIntersectionInternals<A, B>>, $ZodIntersection<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodIntersection: $constructor<ZodIntersection>;
interface ZodRecord<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends _ZodType<$ZodRecordInternals<Key, Value>>, $ZodRecord<Key, Value> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    keyType: Key;
    valueType: Value;
}
declare const ZodRecord: $constructor<ZodRecord>;
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
interface ZodLazy<T extends SomeType = $ZodType> extends _ZodType<$ZodLazyInternals<T>>, $ZodLazy<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodLazy: $constructor<ZodLazy>;
interface ZodCustom<O = unknown, I = unknown> extends _ZodType<$ZodCustomInternals<O, I>>, $ZodCustom<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodCustom: $constructor<ZodCustom>;

/**
 * DocxDocument Zod Schema
 *
 * JSON-first schema for DOCX generation. AI agents produce this directly.
 * No React, no DOM, no coordinates — pure document semantics.
 */

interface DocxElementInput {
    type: string;
    [key: string]: unknown;
}
declare const DocxDocumentSchema: ZodObject<{
    type: ZodDefault<ZodLiteral<"DocxDocument">>;
    metadata: ZodOptional<ZodObject<{
        title: ZodOptional<ZodString>;
        author: ZodOptional<ZodString>;
        subject: ZodOptional<ZodString>;
        keywords: ZodOptional<ZodArray<ZodString>>;
        creator: ZodOptional<ZodString>;
        custom: ZodOptional<ZodRecord<ZodString, ZodString>>;
        language: ZodOptional<ZodString>;
    }, $strip>>;
    accessible: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodObject<{
        level: ZodDefault<ZodEnum<{
            A: "A";
            AA: "AA";
            AAA: "AAA";
        }>>;
        language: ZodOptional<ZodString>;
        title: ZodOptional<ZodString>;
        enforceHeadingHierarchy: ZodOptional<ZodBoolean>;
        enforceTableHeaders: ZodOptional<ZodBoolean>;
    }, $strict>]>>;
    pageSize: ZodDefault<ZodEnum<{
        letter: "letter";
        a4: "a4";
        legal: "legal";
        a3: "a3";
        a5: "a5";
    }>>;
    orientation: ZodDefault<ZodEnum<{
        portrait: "portrait";
        landscape: "landscape";
    }>>;
    margins: ZodOptional<ZodObject<{
        top: ZodDefault<ZodNumber>;
        right: ZodDefault<ZodNumber>;
        bottom: ZodDefault<ZodNumber>;
        left: ZodDefault<ZodNumber>;
    }, $strip>>;
    theme: ZodOptional<ZodObject<{
        preset: ZodOptional<ZodEnum<{
            modern: "modern";
            minimal: "minimal";
            corporate: "corporate";
            classic: "classic";
            academic: "academic";
            dark: "dark";
        }>>;
        colors: ZodOptional<ZodObject<{
            primary: ZodOptional<ZodString>;
            secondary: ZodOptional<ZodString>;
            accent: ZodOptional<ZodString>;
            text: ZodOptional<ZodString>;
            background: ZodOptional<ZodString>;
        }, $strip>>;
        fonts: ZodOptional<ZodObject<{
            heading: ZodOptional<ZodString>;
            body: ZodOptional<ZodString>;
            monospace: ZodOptional<ZodString>;
        }, $strip>>;
    }, $strip>>;
    template: ZodOptional<ZodEnum<{
        letter: "letter";
        blank: "blank";
        report: "report";
        memo: "memo";
        invoice: "invoice";
        proposal: "proposal";
        resume: "resume";
        newsletter: "newsletter";
        manual: "manual";
        thesis: "thesis";
    }>>;
    tableOfContents: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodObject<{
        title: ZodOptional<ZodString>;
        maxLevel: ZodDefault<ZodNumber>;
        showPageNumbers: ZodOptional<ZodBoolean>;
        hyperlinks: ZodOptional<ZodBoolean>;
        leader: ZodOptional<ZodEnum<{
            none: "none";
            dot: "dot";
            dash: "dash";
            underscore: "underscore";
        }>>;
        position: ZodOptional<ZodEnum<{
            start: "start";
            "after-cover": "after-cover";
        }>>;
    }, $strip>]>>;
    header: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    footer: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    differentFirstPage: ZodOptional<ZodBoolean>;
    firstPageHeader: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    firstPageFooter: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    oddPageHeader: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    oddPageFooter: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    evenPageHeader: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    evenPageFooter: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    watermark: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
        text: ZodOptional<ZodString>;
        image: ZodOptional<ZodString>;
        opacity: ZodDefault<ZodNumber>;
        rotation: ZodDefault<ZodNumber>;
    }, $strip>]>>;
    revisionInfo: ZodOptional<ZodObject<{
        author: ZodOptional<ZodString>;
        date: ZodOptional<ZodString>;
        rsid: ZodOptional<ZodString>;
    }, $strip>>;
    pages: ZodArray<ZodObject<{
        elements: ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>;
        sectionBreak: ZodOptional<ZodEnum<{
            nextPage: "nextPage";
            continuous: "continuous";
            evenPage: "evenPage";
            oddPage: "oddPage";
        }>>;
        header: ZodOptional<ZodObject<{
            content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
            text: ZodOptional<ZodString>;
            style: ZodOptional<ZodObject<{
                color: ZodOptional<ZodString>;
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                backgroundColor: ZodOptional<ZodString>;
                border: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                padding: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                margin: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                textAlign: ZodOptional<ZodEnum<{
                    right: "right";
                    left: "left";
                    center: "center";
                    justify: "justify";
                }>>;
                lineHeight: ZodOptional<ZodNumber>;
                opacity: ZodOptional<ZodNumber>;
                comment: ZodOptional<ZodObject<{
                    id: ZodOptional<ZodNumber>;
                    parentId: ZodOptional<ZodNumber>;
                    text: ZodString;
                    author: ZodOptional<ZodString>;
                    initials: ZodOptional<ZodString>;
                    date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                    done: ZodOptional<ZodBoolean>;
                }, $strip>>;
            }, $strict>>;
            includePageNumber: ZodOptional<ZodBoolean>;
            pageNumberFormat: ZodOptional<ZodEnum<{
                letter: "letter";
                roman: "roman";
                decimal: "decimal";
                romanUpper: "romanUpper";
                letterUpper: "letterUpper";
            }>>;
        }, $strip>>;
        footer: ZodOptional<ZodObject<{
            content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
            text: ZodOptional<ZodString>;
            style: ZodOptional<ZodObject<{
                color: ZodOptional<ZodString>;
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                backgroundColor: ZodOptional<ZodString>;
                border: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                padding: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                margin: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                textAlign: ZodOptional<ZodEnum<{
                    right: "right";
                    left: "left";
                    center: "center";
                    justify: "justify";
                }>>;
                lineHeight: ZodOptional<ZodNumber>;
                opacity: ZodOptional<ZodNumber>;
                comment: ZodOptional<ZodObject<{
                    id: ZodOptional<ZodNumber>;
                    parentId: ZodOptional<ZodNumber>;
                    text: ZodString;
                    author: ZodOptional<ZodString>;
                    initials: ZodOptional<ZodString>;
                    date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                    done: ZodOptional<ZodBoolean>;
                }, $strip>>;
            }, $strict>>;
            includePageNumber: ZodOptional<ZodBoolean>;
            pageNumberFormat: ZodOptional<ZodEnum<{
                letter: "letter";
                roman: "roman";
                decimal: "decimal";
                romanUpper: "romanUpper";
                letterUpper: "letterUpper";
            }>>;
        }, $strip>>;
        headerFooter: ZodOptional<ZodObject<{
            header: ZodOptional<ZodObject<{
                content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
                text: ZodOptional<ZodString>;
                style: ZodOptional<ZodObject<{
                    color: ZodOptional<ZodString>;
                    fontFamily: ZodOptional<ZodString>;
                    fontSize: ZodOptional<ZodCustom<number, number>>;
                    fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                        normal: "normal";
                        bold: "bold";
                    }>, ZodNumber]>>;
                    fontStyle: ZodOptional<ZodEnum<{
                        normal: "normal";
                        italic: "italic";
                    }>>;
                    textDecoration: ZodOptional<ZodEnum<{
                        none: "none";
                        underline: "underline";
                        "line-through": "line-through";
                        "underline line-through": "underline line-through";
                    }>>;
                    backgroundColor: ZodOptional<ZodString>;
                    border: ZodOptional<ZodObject<{
                        width: ZodDefault<ZodNumber>;
                        color: ZodDefault<ZodString>;
                        style: ZodDefault<ZodEnum<{
                            solid: "solid";
                            dashed: "dashed";
                            dotted: "dotted";
                            double: "double";
                            none: "none";
                        }>>;
                    }, $strip>>;
                    padding: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    margin: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    textAlign: ZodOptional<ZodEnum<{
                        right: "right";
                        left: "left";
                        center: "center";
                        justify: "justify";
                    }>>;
                    lineHeight: ZodOptional<ZodNumber>;
                    opacity: ZodOptional<ZodNumber>;
                    comment: ZodOptional<ZodObject<{
                        id: ZodOptional<ZodNumber>;
                        parentId: ZodOptional<ZodNumber>;
                        text: ZodString;
                        author: ZodOptional<ZodString>;
                        initials: ZodOptional<ZodString>;
                        date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                        done: ZodOptional<ZodBoolean>;
                    }, $strip>>;
                }, $strict>>;
                includePageNumber: ZodOptional<ZodBoolean>;
                pageNumberFormat: ZodOptional<ZodEnum<{
                    letter: "letter";
                    roman: "roman";
                    decimal: "decimal";
                    romanUpper: "romanUpper";
                    letterUpper: "letterUpper";
                }>>;
            }, $strip>>;
            footer: ZodOptional<ZodObject<{
                content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
                text: ZodOptional<ZodString>;
                style: ZodOptional<ZodObject<{
                    color: ZodOptional<ZodString>;
                    fontFamily: ZodOptional<ZodString>;
                    fontSize: ZodOptional<ZodCustom<number, number>>;
                    fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                        normal: "normal";
                        bold: "bold";
                    }>, ZodNumber]>>;
                    fontStyle: ZodOptional<ZodEnum<{
                        normal: "normal";
                        italic: "italic";
                    }>>;
                    textDecoration: ZodOptional<ZodEnum<{
                        none: "none";
                        underline: "underline";
                        "line-through": "line-through";
                        "underline line-through": "underline line-through";
                    }>>;
                    backgroundColor: ZodOptional<ZodString>;
                    border: ZodOptional<ZodObject<{
                        width: ZodDefault<ZodNumber>;
                        color: ZodDefault<ZodString>;
                        style: ZodDefault<ZodEnum<{
                            solid: "solid";
                            dashed: "dashed";
                            dotted: "dotted";
                            double: "double";
                            none: "none";
                        }>>;
                    }, $strip>>;
                    padding: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    margin: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    textAlign: ZodOptional<ZodEnum<{
                        right: "right";
                        left: "left";
                        center: "center";
                        justify: "justify";
                    }>>;
                    lineHeight: ZodOptional<ZodNumber>;
                    opacity: ZodOptional<ZodNumber>;
                    comment: ZodOptional<ZodObject<{
                        id: ZodOptional<ZodNumber>;
                        parentId: ZodOptional<ZodNumber>;
                        text: ZodString;
                        author: ZodOptional<ZodString>;
                        initials: ZodOptional<ZodString>;
                        date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                        done: ZodOptional<ZodBoolean>;
                    }, $strip>>;
                }, $strict>>;
                includePageNumber: ZodOptional<ZodBoolean>;
                pageNumberFormat: ZodOptional<ZodEnum<{
                    letter: "letter";
                    roman: "roman";
                    decimal: "decimal";
                    romanUpper: "romanUpper";
                    letterUpper: "letterUpper";
                }>>;
            }, $strip>>;
        }, $strip>>;
        dimensions: ZodOptional<ZodObject<{
            width: ZodOptional<ZodNumber>;
            height: ZodOptional<ZodNumber>;
            orientation: ZodOptional<ZodEnum<{
                portrait: "portrait";
                landscape: "landscape";
            }>>;
        }, $strip>>;
    }, $strict>>;
    options: ZodOptional<ZodObject<{
        trackChanges: ZodOptional<ZodBoolean>;
        columns: ZodOptional<ZodNumber>;
        footnoteStyle: ZodOptional<ZodEnum<{
            roman: "roman";
            numeric: "numeric";
            alphabetic: "alphabetic";
        }>>;
        pagination: ZodOptional<ZodEnum<{
            preserve: "preserve";
            reflow: "reflow";
        }>>;
    }, $strip>>;
}, $strict>;
declare const HtmlDocxOptionsSchema: ZodOptional<ZodObject<{
    docxOptions: ZodOptional<ZodObject<{
        pageSize: ZodOptional<ZodEnum<{
            letter: "letter";
            a4: "a4";
            legal: "legal";
            a3: "a3";
            a5: "a5";
        }>>;
        orientation: ZodOptional<ZodEnum<{
            portrait: "portrait";
            landscape: "landscape";
        }>>;
        margins: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        defaultFont: ZodOptional<ZodString>;
        defaultFontSize: ZodOptional<ZodNumber>;
    }, $strip>>;
    imageOptions: ZodOptional<ZodObject<{
        fetchTimeout: ZodOptional<ZodNumber>;
        maxImageSize: ZodOptional<ZodNumber>;
        defaultWidth: ZodOptional<ZodNumber>;
    }, $strip>>;
    cssMode: ZodOptional<ZodEnum<{
        inline: "inline";
        ignore: "ignore";
    }>>;
    baseUrl: ZodOptional<ZodString>;
}, $strip>>;
type HtmlDocxOptions = output<typeof HtmlDocxOptionsSchema>;
type ParsedDocxDocument = output<typeof DocxDocumentSchema>;
/**
 * Public input contract. The parser materializes `orientation: "portrait"`,
 * but callers may omit it just as they can in JSON input.
 */
type DocxDocument = Omit<ParsedDocxDocument, 'orientation'> & {
    orientation?: ParsedDocxDocument['orientation'];
};

/**
 * `@runstamp/docx/ops` — the OC-1 operation surface for the `docx` domain.
 *
 * Every export is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * These are thin adapters over the existing engine — no rendering logic is
 * reimplemented. The legacy exports on the package root keep working unchanged
 * through the deprecation window.
 */

type DocxInput = DocxDocument | StructuredDocument;
/** Options accepted by `render`, layered on the shared operation options. */
interface DocxRenderOpOptions extends OperationOptions {
    readonly render?: RenderOptions;
}
/**
 * Structured document → native DOCX bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.docx", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
declare function render(input: DocxInput, options?: DocxRenderOpOptions): Promise<OperationResult<ArtifactBytes>>;
/** Native DOCX document model → the shared structured model. */
declare function parse(input: DocxDocument, options?: OperationOptions): Promise<OperationResult<StructuredDocument>>;
/** Check a document for defects. Never mutates the input. */
declare function validate(input: unknown, options?: OperationOptions): Promise<OperationResult<ValidationResult>>;
/** The in-format mutations `transform` supports. */
type DocxTransformPlan = {
    readonly kind: "hydrate";
    readonly data: Record<string, unknown>;
};
/**
 * Cross-format conversion. Today only DOCX → PDF.
 *
 * Every approximation the PDF bridge makes is reported as a loss, so a caller
 * can see what changed rather than receiving silently-different output.
 */
declare function convert(input: DocxInput, options?: DocxRenderOpOptions & {
    readonly to?: "pdf";
}): Promise<OperationResult<ArtifactBytes>>;
interface DocxDiffValue {
    /** The revised document with tracked changes applied. */
    readonly artifact: ArtifactBytes;
    readonly changes: readonly unknown[];
    readonly summary: string;
    readonly statistics: unknown;
}
/** Semantic comparison of two DOCX files, as tracked changes. */
declare function diff(input: readonly [Uint8Array | Buffer, Uint8Array | Buffer], options?: OperationOptions & {
    readonly author?: string;
    readonly date?: string;
}): Promise<OperationResult<DocxDiffValue>>;
/** HTML → native DOCX bytes. Unsupported constructs are reported as losses. */
declare function transform(input: string, options?: OperationOptions & {
    readonly html?: HtmlDocxOptions;
}): Promise<OperationResult<ArtifactBytes>>;

declare const redact: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;
declare const inspect: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;

export { PaperError, convert, diff, inspect, parse, redact, render, transform, validate };
export type { ArtifactBytes, Diagnostic, DocxDiffValue, DocxRenderOpOptions, DocxTransformPlan, Locator, Loss, OperationOptions, OperationResult, Receipt };
