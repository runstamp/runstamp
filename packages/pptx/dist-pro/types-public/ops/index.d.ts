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

type PptxFallbackLevel = "native_editable" | "native_anchored" | "alternate_content" | "visual_fallback";

type PptxOutputMode = "strict_editable" | "editable_preferred" | "visual_safe";
type PptxValidationMode = "none" | "structural" | "desktop_async" | "desktop_blocking";
type PptxRepairMode = "none" | "structural";
interface EngineQualityOptions {
    outputMode?: PptxOutputMode;
    validationMode?: PptxValidationMode;
    maxFallbackLevel?: PptxFallbackLevel;
    desktopValidationId?: string;
    repairMode?: PptxRepairMode;
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

interface LockedBrandPalette {
    /** Allowed colors as 6-char uppercase hex without leading '#'. */
    allowedColors: ReadonlySet<string>;
    /** Allowed font family names. Substring/prefix matching is applied. */
    allowedFonts: ReadonlySet<string>;
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

/**
 * `@runstamp/pptx/ops` — the OC-1 operation surface for the `pptx` domain.
 *
 * Every export is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * Thin adapters over the existing engine — no rendering logic is reimplemented.
 * The legacy exports on the package root keep working unchanged through the
 * deprecation window.
 */

/** Options accepted by `render`, layered on the shared operation options. */
interface PptxRenderOpOptions extends OperationOptions {
    readonly render?: EngineRenderOptions;
}
/**
 * Structured document → native PPTX bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.pptx", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
declare function render(input: RenderInput, options?: PptxRenderOpOptions): Promise<OperationResult<ArtifactBytes>>;
interface PptxValidationReport {
    readonly valid: boolean;
    /** The engine's native structural report, unmodified. */
    readonly summary: unknown;
}
/** Inspect PPTX bytes for structural defects. Never mutates the input. */
declare function validate(input: Uint8Array | Buffer, options?: OperationOptions): Promise<OperationResult<PptxValidationReport>>;
/**
 * Repair structural defects in PPTX bytes.
 *
 * Every change is reported as a loss, so a caller sees exactly what was altered
 * rather than receiving silently-rewritten bytes.
 */
declare function repair(input: Uint8Array | Buffer, options?: OperationOptions): Promise<OperationResult<ArtifactBytes>>;
/** Cross-format conversion. Today only PPTX → PDF. */
declare function convert(input: RenderInput, options?: OperationOptions & {
    readonly to?: "pdf";
    readonly pdf?: EnginePdfRenderOptions;
}): Promise<OperationResult<ArtifactBytes>>;

export { PaperError, convert, render, repair, validate };
export type { ArtifactBytes, Diagnostic, Locator, Loss, OperationOptions, OperationResult, PptxRenderOpOptions, PptxValidationReport, Receipt };
