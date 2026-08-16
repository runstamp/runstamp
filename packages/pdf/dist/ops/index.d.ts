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

interface PdfInputWarning {
    code: string;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
}

type PdfEncryptionAlgorithm = "aes-128" | "aes-256";
interface PdfPermissionFlags {
    print?: boolean;
    modify?: boolean;
    copy?: boolean;
    annotate?: boolean;
    fillForms?: boolean;
    extract?: boolean;
    assemble?: boolean;
    printHighQuality?: boolean;
}
interface PdfEncryptionConfig {
    userPassword: string;
    ownerPassword?: string;
    permissions?: PdfPermissionFlags;
    algorithm?: PdfEncryptionAlgorithm;
}

interface PdfCapabilities {
    assets: boolean;
    encryption: boolean;
    flatPages: boolean;
    forms: boolean;
    interactive: boolean;
    layout: boolean;
    pdfa: boolean;
    signature: boolean;
    streaming: boolean;
    tables: boolean;
    taggedAccessibility: boolean;
}
type PdfSelectedPhase = "phase2-flat" | "phase3-layout" | "phase5-tables" | "phase6-interactive" | "phase7-tagged" | "phase8-pdfa";
interface PdfCapabilityPlan {
    capabilities: PdfCapabilities;
    passes: string[];
    selectedPhase: PdfSelectedPhase;
}

type PdfBinarySource = Buffer | Uint8Array | string;
type PdfColor = {
    space: "cmyk";
    c: number;
    k: number;
    m: number;
    y: number;
} | {
    b: number;
    g: number;
    r: number;
    space: "rgb";
};
interface PdfGradientStop {
    color: PdfColor;
    offset: number;
}
interface PdfLinearGradientFill {
    endX: number;
    endY: number;
    opacity?: number;
    space: "linear-gradient";
    startX: number;
    startY: number;
    stops: [PdfGradientStop, PdfGradientStop];
}
interface PdfRadialGradientFill {
    endRadius: number;
    endX: number;
    endY: number;
    opacity?: number;
    space: "radial-gradient";
    startRadius: number;
    startX: number;
    startY: number;
    stops: [PdfGradientStop, PdfGradientStop];
}
interface PdfSolidFill {
    color: PdfColor;
    opacity?: number;
    space: "solid";
}
type PdfFill = PdfLinearGradientFill | PdfRadialGradientFill | PdfSolidFill;
interface PdfStrokeStyle {
    color: PdfColor;
    dash?: number[];
    lineCap?: "butt" | "round" | "square";
    opacity?: number;
    style?: "dashed" | "dotted" | "solid";
    width?: number;
}
interface PdfRectGraphic {
    fill?: PdfFill;
    height: number;
    layer?: "background" | "foreground";
    radius?: number;
    stroke?: PdfStrokeStyle;
    type: "rect";
    width: number;
    x: number;
    y: number;
}
interface PdfLineGraphic {
    layer?: "background" | "foreground";
    stroke: PdfStrokeStyle;
    type: "line";
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}
interface PdfPathGraphic {
    d: string;
    fill?: PdfFill;
    fillRule?: "evenodd" | "nonzero";
    layer?: "background" | "foreground";
    scaleX?: number;
    scaleY?: number;
    stroke?: PdfStrokeStyle;
    type: "path";
    x?: number;
    y?: number;
}
interface PdfImageGraphic {
    format?: "jpeg" | "png";
    height: number;
    layer?: "background" | "foreground";
    opacity?: number;
    source: PdfBinarySource;
    type: "image";
    width: number;
    x: number;
    y: number;
}
interface PdfSvgGraphic {
    height: number;
    layer?: "background" | "foreground";
    opacity?: number;
    source: PdfBinarySource;
    type: "svg";
    width: number;
    x: number;
    y: number;
}
type PdfGraphic = PdfImageGraphic | PdfLineGraphic | PdfPathGraphic | PdfRectGraphic | PdfSvgGraphic;

interface PdfP12CertificateSource {
    format: "p12";
    passphrase?: string;
    source: PdfBinarySource;
}
interface PdfPemCertificateSource {
    cert: PdfBinarySource;
    format: "pem";
    key: PdfBinarySource;
    passphrase?: string;
}
type PdfCertificateSource = PdfP12CertificateSource | PdfPemCertificateSource;
interface PdfTimestampAuthorityOptions {
    certificate: PdfCertificateSource;
    fieldName?: string;
    placeholderBytes?: number;
    policyOid?: string;
}
interface PdfSignOptions {
    certificate: PdfCertificateSource;
    contactInfo?: string;
    fieldName?: string;
    location?: string;
    placeholderBytes?: number;
    reason?: string;
    signerName?: string;
    signingDate?: Date | string;
    timestamp?: false | PdfTimestampAuthorityOptions;
}

type PdfVersion = "1.4" | "1.5" | "1.6" | "1.7" | "2.0";
interface PdfAssetPolicy {
    /**
     * Remote URL sources are disabled by default. Set this to true to permit
     * `http:` / `https:` sources after scheme and byte-limit checks.
     */
    allowRemoteSources?: boolean;
    /** Schemes accepted for string sources. Defaults to file/data/http/https with remote gated separately. */
    allowedSchemes?: Array<"file" | "data" | "http" | "https">;
    /** Optional directory that file paths must resolve within. */
    baseDirectory?: string;
    /** Maximum bytes for a single source. Per-loader defaults still apply when omitted. */
    maxSourceBytes?: number;
    /** Timeout for remote fetches. Defaults to 5000ms. */
    timeoutMs?: number;
}
interface PdfRenderTrace extends PdfCapabilityPlan {
    annotationsCount: number;
    durationMs: number;
    fontCount: number;
    imageCount: number;
    outputBytes: number;
    pageCount: number;
    structureElementCount: number;
    warningCount: number;
}
interface PdfRenderOptions {
    assetPolicy?: PdfAssetPolicy;
    /** Explicit signed license. Takes precedence over RUNSTAMP_LICENSE_KEY. */
    licenseKey?: string;
    encryption?: PdfEncryptionConfig;
    flattenForms?: boolean;
    linearize?: boolean;
    onInputWarning?: (warning: PdfInputWarning) => void;
    onPageSerialized?: (pageIndex: number, totalPages: number) => void;
    onRenderTrace?: (trace: PdfRenderTrace) => void;
    pdfA?: "PDF/A-1b" | "PDF/A-2b";
    /**
     * Target PDF specification version for the file header. The engine
     * may auto-bump above this if a feature requires it (PDF/A-2b → 1.7,
     * AES-256 → 1.7, AES-128 → 1.6) but will never auto-downgrade. When
     * omitted, the engine picks the lowest version that satisfies the
     * requested feature set (1.4 default; bumped only by encryption /
     * PDF/A constraints). Future versions will use this hint to gate
     * 1.5+ features such as object streams.
     */
    pdfVersion?: PdfVersion;
    relaxed?: boolean;
    /**
     * Emit deterministic trailer identifiers for byte-stable test output.
     * Defaults to the package-level `setDeterministicMode()` value.
     */
    deterministic?: boolean;
    signature?: PdfSignOptions;
    /**
     * Throw `PdfError("SCHEMA_REJECTED")` if the input fails Zod schema
     * validation. Defaults to `true`; pass `strict: false` to surface schema
     * failures through `onInputWarning` and render the original input.
     */
    strict?: boolean;
    /**
     * @deprecated Use `strict` instead. When supplied, this legacy option still
     * overrides the default so existing callers can opt into permissive rendering
     * with `strictSchema: false`.
     */
    strictSchema?: boolean;
}

interface PdfEmbeddedFontInput {
    family: string;
    postscriptName?: string;
    source: Buffer | Uint8Array | string;
}
type PdfBuiltInFont = "Helvetica" | "Helvetica-Bold";
type PdfFontInput = PdfBuiltInFont | PdfEmbeddedFontInput;

interface PdfPhase5Border {
    color: PdfColor;
    style?: "dashed" | "dotted" | "double" | "none" | "solid";
    width?: number;
}
interface PdfPhase5TableColumn {
    maxWidth?: number;
    minWidth?: number;
    width?: number | string;
}
interface PdfPhase5CellStyle {
    backgroundColor?: PdfColor;
    borderBottom?: PdfPhase5Border;
    borderLeft?: PdfPhase5Border;
    borderRight?: PdfPhase5Border;
    borderTop?: PdfPhase5Border;
    minHeight?: number;
    padding?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    verticalAlign?: "bottom" | "middle" | "top";
}
interface PdfPhase5RowStyle {
    backgroundColor?: PdfColor;
}
interface PdfPhase5TableStyle extends PdfPhase3Style {
    backgroundColor?: PdfColor;
    borderBottom?: PdfPhase5Border;
    borderCollapse?: "collapse";
    borderLeft?: PdfPhase5Border;
    borderRight?: PdfPhase5Border;
    borderTop?: PdfPhase5Border;
}
type PdfPhase5CellContentNode = PdfPhase3ContainerNode | PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode | PdfPhase5TableNode;
interface PdfPhase5TableCell {
    children: PdfPhase5CellContentNode[];
    colSpan?: number;
    role?: "td" | "th";
    rowSpan?: number;
    style?: PdfPhase5CellStyle;
}
interface PdfPhase5TableRow {
    cells: PdfPhase5TableCell[];
    keepTogether?: boolean;
    style?: PdfPhase5RowStyle;
}
interface PdfPhase5TableNode {
    body: PdfPhase5TableRow[];
    borderCollapse?: "collapse";
    columns?: PdfPhase5TableColumn[];
    footer?: PdfPhase5TableRow[];
    header?: PdfPhase5TableRow[];
    style?: PdfPhase5TableStyle;
    type: "table";
}

type PdfPhase3Size = "A4" | "Letter" | "a4" | "letter" | {
    height: number;
    width: number;
};
interface PdfPhase3Margins {
    bottom: number;
    left: number;
    right: number;
    top: number;
}
interface PdfPhase3Page {
    margin?: number | Partial<PdfPhase3Margins>;
    size?: PdfPhase3Size;
}
interface PdfPhase3Style {
    alignItems?: "center" | "flex-end" | "flex-start" | "stretch";
    alignSelf?: "center" | "flex-end" | "flex-start" | "stretch";
    bottom?: number;
    columnGap?: number;
    flexBasis?: number | string;
    flexDirection?: "column" | "row";
    flexGrow?: number;
    flexShrink?: number;
    flexWrap?: "nowrap" | "wrap";
    gap?: number;
    height?: number | string;
    justifyContent?: "center" | "flex-end" | "flex-start" | "space-around" | "space-between";
    left?: number;
    margin?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    marginTop?: number;
    maxHeight?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    minWidth?: number | string;
    padding?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    position?: "absolute" | "relative";
    right?: number;
    rowGap?: number;
    top?: number;
    width?: number | string;
}
interface PdfPhase3WidowOrphan {
    minLinesAfterBreak?: number;
    minLinesBeforeBreak?: number;
}
interface PdfPhase3ExternalLink {
    kind: "external";
    url: string;
}
interface PdfPhase3InternalLink {
    kind: "internal";
    target: string;
}
type PdfPhase3Link = PdfPhase3ExternalLink | PdfPhase3InternalLink;
interface PdfPhase3TextBase {
    direction?: "auto" | "ltr" | "rtl";
    font?: PdfFontInput;
    fontSize?: number;
    id?: string;
    lang?: string;
    lineHeight?: number;
    link?: PdfPhase3Link;
    style?: PdfPhase3Style;
    text?: string;
    textAlign?: "center" | "justify" | "left" | "right";
    value?: string;
    widowOrphan?: PdfPhase3WidowOrphan;
}
interface PdfPhase3ParagraphNode extends PdfPhase3TextBase {
    type: "paragraph";
}
interface PdfPhase3HeadingNode extends PdfPhase3TextBase {
    keepWithNext?: boolean;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    type: "heading";
}
interface PdfPhase3ContainerNode {
    children: PdfDocumentLayoutNode[];
    graphics?: PdfGraphic[];
    id?: string;
    lang?: string;
    style?: PdfPhase3Style;
    type: "container";
}
interface PdfPhase3PreformattedNode extends PdfPhase3TextBase {
    type: "preformatted";
}
interface PdfPhase3DividerNode {
    id?: string;
    lang?: string;
    style?: PdfPhase3Style;
    type: "divider";
}
interface PdfPhase3PageBreakNode {
    id?: string;
    style?: PdfPhase3Style;
    type: "page-break";
}
type PdfPhase3Node = PdfPhase3ContainerNode | PdfPhase3DividerNode | PdfPhase3HeadingNode | PdfPhase3PageBreakNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode;
type PdfDocumentLayoutNode = PdfPhase3Node | PdfPhase5TableNode;
interface PdfDocumentPhase3 {
    children?: PdfDocumentLayoutNode[];
    content?: PdfDocumentLayoutNode[];
    meta?: {
        author?: string;
        creationDate?: Date | string;
        creator?: string;
        keywords?: string[];
        modDate?: Date | string;
        producer?: string;
        subject?: string;
        title?: string;
    };
    page?: PdfPhase3Page;
}

interface PdfPhase6TocNode {
    fontSize?: number;
    id?: string;
    indentPerLevel?: number;
    lineHeight?: number;
    maxLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    style?: PdfPhase3Style;
    title?: string;
    titleFontSize?: number;
    type: "toc";
}
interface PdfPhase6TextFieldNode {
    calculate?: string;
    fontColor?: string;
    fontSize?: number;
    height?: number;
    label?: string;
    maxLength?: number;
    multiline?: boolean;
    name: string;
    readOnly?: boolean;
    required?: boolean;
    tooltip?: string;
    tabOrder?: number;
    style?: PdfPhase3Style;
    type: "form-text";
    value?: string;
    width?: number | string;
}
interface PdfPhase6CheckboxNode {
    calculate?: string;
    checked?: boolean;
    fontColor?: string;
    label?: string;
    name: string;
    size?: number;
    readOnly?: boolean;
    required?: boolean;
    tabOrder?: number;
    tooltip?: string;
    style?: PdfPhase3Style;
    type: "form-checkbox";
}
interface PdfPhase6DropdownNode {
    calculate?: string;
    fontColor?: string;
    fontSize?: number;
    height?: number;
    label?: string;
    name: string;
    readOnly?: boolean;
    required?: boolean;
    options: string[];
    tabOrder?: number;
    tooltip?: string;
    style?: PdfPhase3Style;
    type: "form-dropdown";
    value?: string;
    width?: number | string;
}
interface PdfPhase6RadioButtonNode {
    calculate?: string;
    checked?: boolean;
    fontColor?: string;
    label?: string;
    name: string;
    group: string;
    readOnly?: boolean;
    required?: boolean;
    size?: number;
    tabOrder?: number;
    tooltip?: string;
    style?: PdfPhase3Style;
    type: "form-radio";
    value: string;
}
interface PdfPhase6SignatureFieldNode {
    fieldName: string;
    fontColor?: string;
    fontSize?: number;
    height?: number;
    label?: string;
    mode?: "digital" | "visual";
    style?: PdfPhase3Style;
    tabOrder?: number;
    tooltip?: string;
    type: "form-signature";
    value?: string;
    width?: number | string;
}
interface PdfPhase6NoteAnnotationNode {
    contents: string;
    height?: number;
    open?: boolean;
    style?: PdfPhase3Style;
    title?: string;
    type: "note-annotation";
    width?: number | string;
}
interface PdfPhase6HighlightAnnotationNode {
    contents?: string;
    style?: PdfPhase3Style;
    target: string;
    type: "highlight-annotation";
}
interface PdfPhase6PageLabel {
    prefix?: string;
    startNumber?: number;
    startPage: number;
    style: "arabic" | "roman-lower" | "roman-upper";
}
interface PdfPhase6PageNumberOptions {
    fontSize?: number;
    format?: string;
    x?: number;
    y?: number;
}
interface PdfPhase6BookmarkOptions {
    fromHeadings?: boolean;
}
type PdfPhase6DocumentNode = PdfDocumentLayoutNode | PdfPhase6CheckboxNode | PdfPhase6DropdownNode | PdfPhase6HighlightAnnotationNode | PdfPhase6NoteAnnotationNode | PdfPhase6RadioButtonNode | PdfPhase6SignatureFieldNode | PdfPhase6TextFieldNode | PdfPhase6TocNode;
type PdfDynamicHeaderFooterContent = string | PdfDocumentLayoutNode[];
/** Standard report header/footer zones. Each zone is aligned within one third of the configured region. */
interface PdfDynamicHeaderFooterZones {
    center?: string;
    left?: string;
    right?: string;
}
type PdfDynamicHeaderFooterConfiguredContent = PdfDynamicHeaderFooterContent | PdfDynamicHeaderFooterZones;
interface PdfDynamicHeaderFooterOptions {
    content: PdfDynamicHeaderFooterConfiguredContent;
    fontSize?: number;
    height?: number;
    /** Omit this running region from page 1 while retaining its reserved body space. */
    skipFirstPage?: boolean;
    width?: number;
    x?: number;
    y?: number;
}
interface PdfDynamicHeaderOptions extends PdfDynamicHeaderFooterOptions {
    y?: number;
}
interface PdfDynamicFooterOptions extends PdfDynamicHeaderFooterOptions {
    y?: number;
}
interface PdfDocumentPhase6 extends Omit<PdfDocumentPhase3, "children" | "content"> {
    bookmarks?: PdfPhase6BookmarkOptions;
    children?: PdfPhase6DocumentNode[];
    content?: PdfPhase6DocumentNode[];
    dynamicHeader?: PdfDynamicHeaderOptions;
    dynamicFooter?: PdfDynamicFooterOptions;
    pageLabels?: PdfPhase6PageLabel[];
    pageNumber?: PdfPhase6PageNumberOptions;
}

interface PdfPhase7AccessibilityOptions {
    lang?: string;
    tagged?: boolean;
}
interface PdfPhase7FigureNode {
    alt: string;
    format?: "jpeg" | "png" | "svg";
    height: number;
    id?: string;
    lang?: string;
    source: PdfBinarySource;
    style?: PdfPhase3Style;
    type: "figure";
    width: number | string;
}
interface PdfPhase7GraphicNode {
    alt?: string;
    graphic: PdfGraphic;
    id?: string;
    lang?: string;
    style?: PdfPhase3Style;
    type: "graphic";
}
interface PdfPhase7ListItemNode {
    id?: string;
    lang?: string;
    text: string;
}
interface PdfPhase7ListNode {
    id?: string;
    items: PdfPhase7ListItemNode[];
    lang?: string;
    ordered?: boolean;
    style?: PdfPhase3Style;
    type: "list";
}
type PdfPhase7DocumentNode = PdfPhase7FigureNode | PdfPhase7GraphicNode | PdfPhase7ListNode | PdfPhase6DocumentNode;
interface PdfDocumentPhase7 extends Omit<PdfDocumentPhase6, "children" | "content"> {
    accessibility?: PdfPhase7AccessibilityOptions;
    children?: PdfPhase7DocumentNode[];
    content?: PdfPhase7DocumentNode[];
}

type PdfaConformanceLevel = "1b" | "2a" | "2b";
interface PdfPhase8PdfaOptions {
    conformance?: PdfaConformanceLevel;
    enabled?: boolean;
    fallbackFont?: PdfEmbeddedFontInput;
    fallbackFonts?: PdfEmbeddedFontInput[];
    iccProfile?: PdfBinarySource;
    outputConditionIdentifier?: string;
}
interface PdfDocumentPhase8 extends PdfDocumentPhase7 {
    pdfa?: PdfPhase8PdfaOptions;
}

interface PdfMetaPhase1 {
    author?: string;
    creationDate?: Date | string;
    creator?: string;
    keywords?: string[];
    modDate?: Date | string;
    producer?: string;
    subject?: string;
    title?: string;
}
interface PdfTextPhase1 {
    direction?: "auto" | "ltr" | "rtl";
    font?: PdfFontInput;
    fallbackFonts?: PdfEmbeddedFontInput[];
    fontSize?: number;
    value: string;
    x?: number;
    y?: number;
}
interface PdfPagePhase2 {
    graphics?: PdfGraphic[];
    height?: number;
    text?: PdfTextPhase1;
    texts?: PdfTextPhase1[];
    width?: number;
}
interface PdfDocumentPhase2 {
    meta?: PdfMetaPhase1;
    pages: PdfPagePhase2[];
}
type PdfDocument = PdfDocumentPhase2 | PdfDocumentPhase8;

/**
 * `@runstamp/pdf/ops` — the OC-1 operation surface for the `pdf` domain.
 *
 * Every export here is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * These are thin adapters over the existing engine — no rendering logic is
 * reimplemented here. The legacy exports on the package root keep working
 * unchanged for the deprecation window.
 */

/** Options accepted by `render`, layered on the shared operation options. */
interface PdfRenderOpOptions extends OperationOptions {
    readonly render?: PdfRenderOptions;
}
/**
 * Structured document → native PDF bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.pdf", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
declare function render(input: PdfDocument, options?: PdfRenderOpOptions): Promise<OperationResult<ArtifactBytes>>;
interface PdfValidationReport {
    readonly valid: boolean;
    /** The engine's native validation summary, unmodified. */
    readonly summary: unknown;
}
/** Inspect PDF bytes for conformance defects. Never mutates the input. */
declare function validate(input: Uint8Array | Buffer, options?: OperationOptions): Promise<OperationResult<PdfValidationReport>>;
/**
 * Repair defects in PDF bytes.
 *
 * Every change the repairer makes is reported as a `substituted` loss, so a caller
 * can see exactly what was altered rather than receiving silently-rewritten bytes.
 */
declare function repair(input: Uint8Array | Buffer, options?: OperationOptions): Promise<OperationResult<ArtifactBytes>>;
/** The in-format mutations `transform` supports. */
type PdfTransformPlan = {
    readonly kind: "linearize";
};
/** Bounded in-format mutation of PDF bytes. */
declare function transform(input: Uint8Array | Buffer, options?: OperationOptions & {
    readonly plan?: PdfTransformPlan;
}): Promise<OperationResult<ArtifactBytes>>;
/** What `extract` can pull out of a PDF. */
type PdfExtractSelector = "signatures";
interface PdfExtraction {
    readonly selector: PdfExtractSelector;
    readonly items: readonly unknown[];
}
/** Pull typed content out of PDF bytes. */
declare function extract(input: Uint8Array | Buffer, options?: OperationOptions & {
    readonly selector?: PdfExtractSelector;
}): Promise<OperationResult<PdfExtraction>>;

declare const redact: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;
declare const convert: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;
declare const inspect: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<unknown>>;

export { PaperError, convert, extract, inspect, redact, render, repair, transform, validate };
export type { ArtifactBytes, Diagnostic, Locator, Loss, OperationOptions, OperationResult, PdfExtractSelector, PdfExtraction, PdfRenderOpOptions, PdfTransformPlan, PdfValidationReport, Receipt };
