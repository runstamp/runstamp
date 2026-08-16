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
declare const ERROR_DOMAINS: readonly ErrorDomain[];
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
declare const LOSS_SEVERITY_ORDER: readonly LossSeverity[];
/** A node kind addressable by a {@link import("./locator.js").Locator}. */
type LocatorKind = "page" | "slide" | "sheet" | "section" | "paragraph" | "run" | "table" | "row" | "column" | "cell" | "shape" | "image" | "chart" | "note" | "header" | "footer" | "comment" | "annotation"
/** A raw package part (an OOXML part, a PDF object). */
 | "part";
declare const LOCATOR_KINDS: readonly LocatorKind[];
/**
 * The canonical verb taxonomy (OC-1 §4). Exactly these twelve.
 *
 * Packages may add *qualifiers* (`xlsx.extract.tables`) but never a new base verb;
 * a new verb requires an amendment to the contract.
 */
type Verb = "render" | "parse" | "inspect" | "validate" | "repair" | "convert" | "transform" | "diff" | "merge" | "split" | "extract" | "redact";
declare const VERBS: readonly Verb[];
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
/** Side effects an operation may perform, declared in the registry. */
type SideEffects = "none" | "network" | "filesystem";
/** Public stability of a registry entry. */
type Stability = "experimental" | "stable" | "deprecated";

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
/** Render a locator in its canonical string form. */
declare function formatLocator(locator: Locator): string;
/** Parse a canonical locator string. Throws `common/CONTRACT_VIOLATION` if malformed. */
declare function parseLocator(text: string): Locator;
/**
 * Total, stable ordering over locators, approximating document order.
 *
 * Ordinals compare numerically so `slide[2]` precedes `slide[10]`; a shorter path
 * sorts ahead of a longer path that extends it, so a parent precedes its children.
 * Used to keep loss ledgers identical across runs (R18).
 */
declare function compareLocators(a: Locator, b: Locator): number;

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
interface DiagnosticInit {
    readonly code: ErrorCode;
    readonly severity: DiagnosticSeverity;
    readonly message: string;
    readonly phase: ErrorPhase;
    readonly locator?: Locator;
    readonly details?: Readonly<Record<string, unknown>>;
}
declare function createDiagnostic(init: DiagnosticInit): Diagnostic;

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
interface LossInit {
    readonly code: ErrorCode;
    readonly severity: LossSeverity;
    readonly subject: string;
    readonly message: string;
    readonly locator?: Locator;
    readonly expected?: string;
    readonly actual?: string;
    readonly avoidable?: boolean;
    readonly remediation?: string;
    readonly details?: Readonly<Record<string, unknown>>;
}
declare function createLoss(init: LossInit): Loss;
/** Rank a severity for comparison; higher means more severe. */
declare function lossSeverityRank(severity: LossSeverity): number;
/**
 * Total ordering over losses (R18): by locator, then severity (most severe first),
 * then code, then subject. Deterministic and independent of discovery order, so
 * two runs over identical input produce an identical ledger.
 */
declare function compareLosses(a: Loss, b: Loss): number;
/** Return a new array sorted by {@link compareLosses}. Does not mutate the input. */
declare function sortLosses(losses: readonly Loss[]): readonly Loss[];
/** True when any loss dropped content outright. */
declare function hasDroppedLoss(losses: readonly Loss[]): boolean;

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
 * The hashable projection of {@link OperationOptions}.
 *
 * Callbacks and the AbortSignal are excluded deliberately: they are not
 * serializable and do not affect the output bytes, so including them would make
 * `optionsHash` unstable for identical work.
 */
interface EffectiveOptions {
    readonly deterministic: boolean;
    readonly lossPolicy: LossPolicy;
    readonly deterministicSeed?: string;
    readonly timeoutMs?: number;
    readonly limits?: ResourceLimits;
    readonly locale?: string;
}
declare const DEFAULT_DETERMINISTIC = true;
declare const DEFAULT_LOSS_POLICY: LossPolicy;
/**
 * Process-wide default for deterministic mode.
 *
 * Preserved from the package-level implementations so their call sites keep
 * working unchanged when they migrate onto the contract.
 */
declare function setDeterministicMode(enabled?: boolean): void;
/** Reset the process default. Intended for tests. */
declare function resetDeterministicMode(): void;
/**
 * Resolve deterministic mode. Precedence (R28):
 * explicit option → `RUNSTAMP_DETERMINISTIC` → process default (initially true).
 */
declare function isDeterministicModeEnabled(options?: OperationOptions): boolean;
/**
 * Apply defaults and drop non-serializable fields, yielding the value that
 * `optionsHash` is computed over.
 */
declare function resolveOptions(options?: OperationOptions): EffectiveOptions;

export { isDeterministicModeEnabled as A, lossSeverityRank as B, parseLocator as C, type Diagnostic as D, type ErrorCode as E, resetDeterministicMode as F, resolveOptions as G, setDeterministicMode as H, sortLosses as I, type Locator as L, type NondeterminismSource as N, type OperationName as O, type ResourceLimits as R, type SideEffects as S, type Verb as V, type ErrorPhase as a, type ErrorDomain as b, type OperationOptions as c, type EffectiveOptions as d, type Loss as e, type Stability as f, DEFAULT_DETERMINISTIC as g, DEFAULT_LOSS_POLICY as h, type DiagnosticInit as i, type DiagnosticSeverity as j, ERROR_DOMAINS as k, LOCATOR_KINDS as l, LOSS_SEVERITY_ORDER as m, type LocatorKind as n, type LocatorRange as o, type LocatorSegment as p, type LossInit as q, type LossPolicy as r, type LossSeverity as s, VERBS as t, compareLocators as u, compareLosses as v, createDiagnostic as w, createLoss as x, formatLocator as y, hasDroppedLoss as z };
