import { L as Locator, E as ErrorCode, a as ErrorPhase, b as ErrorDomain, O as OperationName, c as OperationOptions, d as EffectiveOptions, N as NondeterminismSource, e as Loss, D as Diagnostic, V as Verb, S as SideEffects, f as Stability } from './options-soAllhqJ.js';
export { g as DEFAULT_DETERMINISTIC, h as DEFAULT_LOSS_POLICY, i as DiagnosticInit, j as DiagnosticSeverity, k as ERROR_DOMAINS, l as LOCATOR_KINDS, m as LOSS_SEVERITY_ORDER, n as LocatorKind, o as LocatorRange, p as LocatorSegment, q as LossInit, r as LossPolicy, s as LossSeverity, R as ResourceLimits, t as VERBS, u as compareLocators, v as compareLosses, w as createDiagnostic, x as createLoss, y as formatLocator, z as hasDroppedLoss, A as isDeterministicModeEnabled, B as lossSeverityRank, C as parseLocator, F as resetDeterministicMode, G as resolveOptions, H as setDeterministicMode, I as sortLosses } from './options-soAllhqJ.js';

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
 * `instanceof` alone is not enough.
 *
 * A consumer can easily hold two copies of `@runstamp/contract` — a transitive
 * dependency pinning a different range, or a bundler emitting the module into
 * two chunks — and an error built by one copy then fails `instanceof` against
 * the other, so a legitimate error is silently rejected. The determinism flag
 * already defends against duplicate copies via the global symbol registry; this
 * is the same defence for the error model, using the shape the class guarantees.
 */
declare function isPaperError(value: unknown): value is PaperError;
/**
 * Rebuild a {@link PaperError} from its wire form.
 *
 * `stack` and `cause` are not carried across the boundary; every other field
 * round-trips exactly (OC-1 R13).
 */
declare function paperErrorFromJSON(json: PaperErrorJSON): PaperError;
/**
 * The contract's own violation error: a required argument was missing, an
 * argument had the wrong type at the boundary, or an internal invariant broke.
 *
 * Per OC-1 §3.3.1 this is one of the few conditions that is *thrown* rather than
 * returned, because a caller could not have produced it with valid code.
 */
declare function contractViolation(message: string, details?: Readonly<Record<string, unknown>>): PaperError;

/**
 * The normative `common/*` error codes (OC-1 §3.3.2).
 *
 * These behave identically in every package. A cross-cutting condition must use
 * the `common/` code rather than minting a domain-specific synonym — that is what
 * makes `switch (result.error.code)` portable across formats.
 *
 * Domain-specific codes (`pdf/PDFA_VIOLATION`, `docx/IMAGE_TIMEOUT`) live in their
 * own packages and are declared in that package's registry entry.
 */

/** A required argument was missing or malformed at the API boundary. */
declare const CONTRACT_VIOLATION: "common/CONTRACT_VIOLATION";
/** Input failed schema validation. */
declare const SCHEMA_REJECTED: "common/SCHEMA_REJECTED";
/** A declared resource limit was exceeded. */
declare const RESOURCE_LIMIT_EXCEEDED: "common/RESOURCE_LIMIT_EXCEEDED";
/** The caller's AbortSignal fired. */
declare const OPERATION_CANCELLED: "common/OPERATION_CANCELLED";
/** The operation exceeded its time budget. */
declare const OPERATION_TIMEOUT: "common/OPERATION_TIMEOUT";
/** Two supplied options cannot be combined. */
declare const OPTIONS_CONFLICT: "common/OPTIONS_CONFLICT";
/** The input uses a feature this operation does not support. */
declare const UNSUPPORTED_FEATURE: "common/UNSUPPORTED_FEATURE";
/** The input's format version is outside the supported range. */
declare const UNSUPPORTED_VERSION: "common/UNSUPPORTED_VERSION";
/** The input bytes are damaged or not the claimed format. */
declare const INPUT_CORRUPT: "common/INPUT_CORRUPT";
/** The input is encrypted and no key was supplied. */
declare const INPUT_ENCRYPTED: "common/INPUT_ENCRYPTED";
/** A referenced asset was refused by the configured policy. */
declare const ASSET_REJECTED: "common/ASSET_REJECTED";
/** A referenced asset passed policy but could not be loaded or decoded. */
declare const ASSET_FETCH_FAILED: "common/ASSET_FETCH_FAILED";
/** Deterministic output was requested but cannot be produced here. */
declare const DETERMINISM_UNAVAILABLE: "common/DETERMINISM_UNAVAILABLE";
/** A declared operation exists but has no implementation on this path. */
declare const NOT_IMPLEMENTED: "common/NOT_IMPLEMENTED";
declare const COMMON_ERROR_CODES: readonly ErrorCode[];
/** True when `code` is one of the normative `common/*` codes. */
declare function isCommonErrorCode(code: string): code is ErrorCode;

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
interface BuildReceiptInit {
    readonly operation: OperationName;
    readonly domain: ErrorDomain;
    readonly engine: EngineIdentity;
    readonly inputHash: string;
    /** Supply either the resolved options or the raw options to resolve. */
    readonly options?: OperationOptions;
    readonly effectiveOptions?: EffectiveOptions;
    readonly outputHash?: string;
    readonly nondeterminismSources?: readonly NondeterminismSource[];
    readonly tools?: readonly ToolVersion[];
    /**
     * Wall-clock stamp for non-deterministic runs. Ignored when deterministic.
     * Injected rather than read from the clock so this module stays pure.
     */
    readonly producedAt?: string;
}
/**
 * Build a receipt, enforcing the two honesty rules that make it worth anything:
 * `producedAt` is omitted (not zeroed) under determinism (R25), and a
 * non-deterministic receipt must name at least one actual source (R26).
 */
declare function buildReceipt(init: BuildReceiptInit): Receipt;

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
 * The canonical operation signature (R1–R5): exactly two positional parameters,
 * always Promise-returning, never mutating its input.
 */
type Operation<TInput, TOptions, TValue> = (input: TInput, options?: TOptions) => Promise<OperationResult<TValue>>;
interface SuccessParts {
    readonly losses?: readonly Loss[];
    readonly diagnostics?: readonly Diagnostic[];
    readonly receipt: Receipt;
}
interface FailureParts {
    readonly losses?: readonly Loss[];
    readonly diagnostics?: readonly Diagnostic[];
    readonly receipt?: Receipt;
}
declare function ok<T>(value: T, parts: SuccessParts): OperationSuccess<T>;
declare function fail(error: PaperError, parts?: FailureParts): OperationFailure;
declare function isOk<T>(result: OperationResult<T>): result is OperationSuccess<T>;
declare function isFail<T>(result: OperationResult<T>): result is OperationFailure;
/**
 * Ergonomic escape hatch for call sites that prefer exceptions: returns the value
 * or throws the error. Operations themselves still never throw — this is opt-in,
 * at the boundary the caller chooses.
 */
declare function unwrap<T>(result: OperationResult<T>): T;

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
/** Well-known media types for the formats the platform renders natively. */
declare const MEDIA_TYPES: {
    readonly pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    readonly docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    readonly xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    readonly pdf: "application/pdf";
    readonly html: "text/html";
};
declare function createArtifactBytes(bytes: Uint8Array, mediaType: string, extension: string): ArtifactBytes;
/**
 * Narrow an operation input to bytes, as a document condition rather than a throw.
 *
 * Every byte-input verb — `validate`, `repair`, `transform`, `extract`, `diff` —
 * used to reach `Buffer.from(input)` directly, which raises a raw `TypeError`
 * for anything that is not array-like. That is precisely the R4 line: a caller
 * who passes a parsed object where bytes were wanted has supplied bad data, and
 * bad data is a result with a remediation, not an exception the caller has to
 * wrap in try/catch. Nine operations across four engines shipped with that bug,
 * unnoticed because the hostile-input corpus only ever exercised `render`.
 *
 * Call this **lazily**, from inside `inputHash` or `execute`, so `runOperation`
 * owns the failure. Calling it before `runOperation` puts the throw back outside
 * the guard and restores the bug.
 */
declare function requireBytes(input: unknown, expected?: string): Uint8Array;

/**
 * Canonical JSON encoding and hashing (OC-1 §3.7 R27).
 *
 * `optionsHash`, `inputHash` and `outputHash` in every receipt are derived here,
 * so this module defines what "the same input" means platform-wide. The encoding
 * is deliberately strict: anything whose JSON form could vary between runs is
 * rejected rather than silently coerced, because a determinism claim built on a
 * lenient encoder is not a guarantee.
 *
 * The `node:crypto` dependency is isolated to this file so a Web Crypto backend
 * can be substituted for browser/embedded targets without touching callers.
 */
/**
 * Deterministic JSON: object keys sorted recursively, no insignificant whitespace,
 * `undefined` properties omitted, arrays order-preserving.
 */
declare function canonicalJson(value: unknown): string;
/** Lowercase hex SHA-256 of a UTF-8 string or raw bytes. */
declare function sha256Hex(input: string | Uint8Array): string;
/** `sha256:<hex>` digest of raw bytes — the form used by `artifact` and `outputHash`. */
declare function hashBytes(bytes: Uint8Array): string;
/** `sha256:<hex>` digest of any canonicalizable value. */
declare function hashValue(value: unknown): string;

/**
 * Runtime deprecation notices (OC-1 §9.5).
 *
 * §9.5 promises "a minimum of two minor versions with a runtime notice before
 * removal". A comment in a `.d.ts` is not a runtime notice: it reaches whoever
 * reads the source, not whoever runs the code, and the people who need warning
 * are precisely the ones who have not read it.
 *
 * Each notice fires **once per symbol per process**, on first use rather than on
 * import. Warning at import time would fire for anyone who merely pulls in the
 * package; warning per call would flood a loop. First-use is the point at which
 * the caller has actually depended on the thing being removed.
 */
/**
 * Wrap a value so its first use warns.
 *
 * Functions are wrapped; objects and arrays are proxied so a property read
 * counts as use. A primitive cannot be intercepted, so it is returned unchanged
 * — the `.d.ts` `@deprecated` tag is the only signal available for those.
 */
declare function deprecate<T>(name: string, replacement: string, value: T): T;
/** Reset the announced set. Intended for tests. */
declare function resetDeprecationNotices(): void;

/**
 * Legacy error-code tables — the OC-1 Phase 1 migration aid.
 *
 * The platform shipped four error models with 71 codes between them, in three
 * mutually incompatible shapes. This module maps every one of them onto a
 * namespaced {@link ErrorCode}, supplies the `phase` and `remediation` the legacy
 * models lacked, and records the original code so nothing is lost.
 *
 * Two genuine collisions are resolved here:
 *
 * - `RESOURCE_LIMIT_EXCEEDED` was emitted by both `PaperError` (core) and
 *   `DOCXError`. Both mean the same thing, so both map to
 *   `common/RESOURCE_LIMIT_EXCEEDED` — and because it is now a *common* code, a
 *   consumer can finally branch on it portably.
 * - `FEATURE_REQUIRES_UPGRADE` was emitted by both `PaperError` and
 *   `RunstampFeatureError`. Both map to `license/FEATURE_REQUIRES_UPGRADE`.
 *
 * Mapping rule: a legacy code maps to `common/*` **only when it is an exact
 * synonym** of a normative common code. Otherwise it keeps its meaning under its
 * domain prefix, so no semantic detail is flattened. The original string is always
 * preserved at `details.legacyCode`.
 *
 * @remarks This module exists to retire the legacy surfaces and is removed with
 * them at the next major. New code should never consult it.
 */

interface LegacyCodeMapping {
    readonly contractCode: ErrorCode;
    readonly phase: ErrorPhase;
    /** Supplied here for models that had no remediation concept at all (PdfError). */
    readonly remediation: string;
    readonly retryable?: boolean;
}
/** `PaperError` from `packages/core` (`@runstamp/pptx`). 27 codes. */
declare const CORE_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>>;
/** `PdfError` from `packages/json-to-pdf`. 8 codes, none of which had a remediation. */
declare const PDF_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>>;
/**
 * `DOCXError` from `packages/docx`. 33 codes.
 *
 * Keyed by the enum's *value*, which is what reaches a consumer's `err.code`.
 * Five values were missing the `DOCX_` prefix their siblings carry
 * (`TABLE_GRID_MISMATCH`, `INVALID_COLOR`, `INVALID_FONT_SIZE`,
 * `RESOURCE_LIMIT_EXCEEDED`, `IMAGE_SIZE_EXCEEDED`); namespacing removes the
 * inconsistency without changing the legacy strings themselves.
 */
declare const DOCX_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>>;
/** `RunstampFeatureError` from `packages/license`. 3 codes. */
declare const LICENSE_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>>;
/**
 * `@runstamp/xlsx` error classes.
 *
 * The spreadsheet engine predates the shared error model and throws plain
 * `Error` subclasses keyed by class name rather than a `code` field, so the
 * class name *is* the legacy code here. Each carries an `issues` array that the
 * `./ops` adapter surfaces in `details`.
 */
declare const XLSX_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>>;
/** Which legacy table applies to an error, selected by its originating model. */
type LegacyErrorModel = "core" | "pdf" | "docx" | "license" | "xlsx";
declare const LEGACY_CODE_TABLES: Readonly<Record<LegacyErrorModel, Readonly<Record<string, LegacyCodeMapping>>>>;
declare function lookupLegacyCode(model: LegacyErrorModel, legacyCode: string): LegacyCodeMapping | undefined;

/**
 * Legacy error interop — the OC-1 Phase 1 bridge.
 *
 * `toPaperError` accepts anything an engine can throw — `PaperError` (core),
 * `PdfError`, `DOCXError`, `RunstampFeatureError`, a plain `Error`, or a
 * non-Error throwable — and returns a single OC-1 {@link PaperError} with a
 * namespaced code, a phase, and a non-empty remediation.
 *
 * Phase 1 deliberately does **not** rewrite the engines' error classes. Their
 * `code` values are load-bearing for existing `catch` sites, and re-basing three
 * shipped classes onto a new prototype would risk `instanceof` breakage in
 * duplicated-package installs for no user-visible gain until the `./ops` surfaces
 * exist. Instead the engines keep throwing exactly what they throw today, and the
 * Phase 3 adapters normalize at the boundary with this function — which is the
 * only place the OC-1 code needs to appear.
 *
 * The original code is always preserved at `details.legacyCode` so no information
 * is lost in translation.
 *
 * @remarks Removed together with the legacy surfaces at the next major.
 */

interface ToPaperErrorOptions {
    /**
     * Which legacy table to consult. When omitted it is inferred from the error's
     * `name`, falling back to `domain`.
     */
    readonly model?: LegacyErrorModel;
    /** Domain to attribute unmapped errors to. Defaults to `common`. */
    readonly domain?: ErrorDomain;
    /** Phase to attribute unmapped errors to. Defaults to `rendering`. */
    readonly phase?: ErrorPhase;
}
/**
 * Normalize any thrown value into an OC-1 {@link PaperError}.
 *
 * Already-compliant `PaperError`s pass through untouched, so this is safe to
 * apply at every boundary without double-translating.
 */
declare function toPaperError(value: unknown, options?: ToPaperErrorOptions): PaperError;

/**
 * The operation harness (OC-1 §3.1–§3.2).
 *
 * `runOperation` is the single place the envelope is constructed, so every verb in
 * every package gets identical behavior for free: options resolution, loss and
 * diagnostic collection, loss policy, deterministic loss ordering, receipt
 * construction, and — critically — the R4 guarantee that a document condition
 * comes back as `{ ok: false }` rather than an exception.
 *
 * A Phase 3 adapter is then a thin mapping: describe the operation, hash the
 * input, call the existing engine, return the value.
 */

/** Handed to an operation body so it can record losses and diagnostics as it works. */
interface OperationContext {
    readonly effectiveOptions: EffectiveOptions;
    readonly deterministic: boolean;
    readonly signal?: AbortSignal;
    /** Record a faithfulness deviation. Also invokes `options.onLoss` if supplied. */
    addLoss(loss: Loss): void;
    /** Record a non-fatal observation. Also invokes `options.onDiagnostic` if supplied. */
    addDiagnostic(diagnostic: Diagnostic): void;
    /** Declare a nondeterminism source actually consumed. */
    addNondeterminism(source: NondeterminismSource): void;
    /** Declare an external tool invoked, with its pinned version. */
    addTool(tool: ToolVersion): void;
}
interface OperationOutcome<TValue> {
    readonly value: TValue;
    /** `sha256:<hex>` of produced bytes, when the operation produced any. */
    readonly outputHash?: string;
}
interface RunOperationInit<TValue> {
    readonly operation: OperationName;
    readonly domain: ErrorDomain;
    readonly engine: EngineIdentity;
    /**
     * `sha256:<hex>` of the input, normally via `hashValue` or `hashBytes`.
     *
     * Prefer the thunk form. Hashing an arbitrary caller-supplied value can itself
     * fail (a cycle, a `Date`, `undefined`), and a thunk is evaluated *inside* the
     * harness's guard so that failure becomes a typed result rather than an
     * exception — which R4 requires and an eagerly-computed hash would violate.
     */
    readonly inputHash: string | (() => string);
    readonly options?: OperationOptions;
    /** How to attribute errors the engine throws that are not already OC-1. */
    readonly errorContext?: ToPaperErrorOptions;
    readonly execute: (context: OperationContext) => Promise<OperationOutcome<TValue>>;
}
declare function runOperation<TValue>(init: RunOperationInit<TValue>): Promise<OperationResult<TValue>>;

/**
 * The operation registry (OC-1 §6).
 *
 * One descriptor per operation, from which the SDK docs, the hosted HTTP routes,
 * the MCP tool catalog and the embedded UI are all *generated*. Generation from a
 * single registry — rather than four hand-written surfaces — is the mechanism
 * that keeps the projections uniform as the catalog grows.
 */

/**
 * A JSON Schema document. Permissive for now; tightening this to a real JSON
 * Schema type is deferred until the Phase 3 `./ops` surfaces exist and the shapes
 * they actually need are known.
 */
type JSONSchema = Record<string, unknown>;
/**
 * How a qualified operation selects itself within its base verb.
 *
 * `pdf.extract.signatures` and a future `pdf.extract.text` are the *same*
 * exported `extract` function; what separates them is an option value. A
 * projection that resolves the descriptor and then calls the base verb without
 * setting that option reaches the verb's default instead of the operation the
 * caller asked for — a silent misroute that returns 200 with the wrong answer.
 *
 * Declaring the binding here is what lets every projection dispatch correctly
 * from the registry alone, with no per-operation special casing.
 */
interface QualifierBinding {
    /** The option key that selects this operation, e.g. `"selector"`. */
    readonly option: string;
    /** The value that key must take. */
    readonly value: string;
}
interface OperationDescriptor {
    readonly name: OperationName;
    readonly domain: ErrorDomain;
    readonly verb: Verb;
    /**
     * Required on a qualified operation whose verb hosts more than one form.
     *
     * `defineOperations` enforces the invariant per `(domain, verb)` group: either
     * the group holds exactly one operation — the verb dispatches it unambiguously
     * and no binding is needed — or every member declares a distinct binding. The
     * second qualified form added to a verb therefore fails at module load rather
     * than silently shadowing the first.
     */
    readonly qualifier?: QualifierBinding;
    /** One line, agent-facing. Becomes the MCP tool description. */
    readonly summary: string;
    readonly inputSchema: JSONSchema;
    readonly optionsSchema: JSONSchema;
    readonly valueSchema: JSONSchema;
    /** Every error code this operation may emit. Enforced by conformance gate C5. */
    readonly errorCodes: readonly ErrorCode[];
    /** Every loss code this operation may emit. */
    readonly lossCodes: readonly ErrorCode[];
    /**
     * The module a projection should import to invoke this operation.
     *
     * A domain is no longer one package. `pdf` is served by both
     * `@runstamp/pdf` and `@runstamp/forms`, and `common` by whichever
     * extensions declare it — so a projection that maps domain to package reaches
     * the wrong module and reports the operation as unknown. Carrying the
     * specifier on the descriptor is what keeps the registry the single source
     * the projections are generated from (§6).
     *
     * Absent on the engines' hand-written operations, where the domain still
     * identifies the package unambiguously.
     */
    readonly implementation?: string;
    readonly deterministic: boolean;
    readonly sideEffects: SideEffects;
    readonly stability: Stability;
}
declare function isVerb(value: string): value is Verb;
/**
 * Validate and freeze a package's operation descriptors.
 *
 * Every package declares its catalog through this, so the errors that would
 * otherwise surface as a malformed MCP tool or an HTTP route that cannot be
 * generated are caught where the descriptor is written instead. Throws rather
 * than returning a result: a bad descriptor is programmer error at module load,
 * not a document condition, which is the R4 line.
 */
declare function defineOperations(descriptors: readonly OperationDescriptor[]): readonly OperationDescriptor[];
/**
 * Split an operation name into its parts.
 *
 * Returns `undefined` rather than throwing, so callers validating untrusted
 * registry data can decide how to report the problem.
 */
declare function parseOperationName(name: string): {
    domain: string;
    verb: Verb;
    qualifier?: string;
} | undefined;

export { ASSET_FETCH_FAILED, ASSET_REJECTED, type ArtifactBytes, type BuildReceiptInit, COMMON_ERROR_CODES, CONTRACT_VERSION, CONTRACT_VIOLATION, CORE_LEGACY_CODES, type ContractVersion, DETERMINISM_UNAVAILABLE, DOCX_LEGACY_CODES, Diagnostic, EffectiveOptions, type EngineIdentity, ErrorCode, ErrorDomain, type ErrorIssue, ErrorPhase, type FailureParts, INPUT_CORRUPT, INPUT_ENCRYPTED, type JSONSchema, LEGACY_CODE_TABLES, LICENSE_LEGACY_CODES, type LegacyCodeMapping, type LegacyErrorModel, Locator, Loss, MEDIA_TYPES, NOT_IMPLEMENTED, NondeterminismSource, OPERATION_CANCELLED, OPERATION_TIMEOUT, OPTIONS_CONFLICT, type Operation, type OperationContext, type OperationDescriptor, type OperationFailure, OperationName, OperationOptions, type OperationOutcome, type OperationResult, type OperationSuccess, PDF_LEGACY_CODES, PaperError, type PaperErrorInit, type PaperErrorJSON, type QualifierBinding, RESOURCE_LIMIT_EXCEEDED, type Receipt, type RunOperationInit, SCHEMA_REJECTED, SideEffects, Stability, type SuccessParts, type ToPaperErrorOptions, type ToolVersion, UNSUPPORTED_FEATURE, UNSUPPORTED_VERSION, Verb, XLSX_LEGACY_CODES, buildReceipt, canonicalJson, contractViolation, createArtifactBytes, defineOperations, deprecate, fail, hashBytes, hashValue, isCommonErrorCode, isFail, isOk, isPaperError, isVerb, lookupLegacyCode, ok, paperErrorFromJSON, parseOperationName, requireBytes, resetDeprecationNotices, runOperation, sha256Hex, toPaperError, unwrap };
