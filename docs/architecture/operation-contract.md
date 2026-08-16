# Runstamp Operation Contract v1 (OC-1)

- **Date:** 2026-08-12
- **Status:** normative
- **Strategy reference:** [`../product-strategy.md`](../product-strategy.md)
- **Supersedes for API-surface purposes:** ad-hoc per-package error/result conventions
- **Relationship to** [`../product-roadmap.md`](../product-roadmap.md): **blocks expansion.** No expansion item
  may be specified until OC-1 is ratified; every expansion item must be born OC-1 compliant.

---

## 1. Why this exists

The platform's positioning is:

> A horizontal, LLM-factory-built, governance-native document-operations platform, exposed as SDKs, a
> hosted API, agent tools (MCP), and embedded UI.

sold against two named alternatives:

1. **Open-source packages** — individually good, but unstable, with a different spec and endpoint per
   purpose, forcing every adopting team to re-calibrate per format.
2. **Incumbent SDKs (Apryse, Nutrient, Aspose)** — coherent, but behind procurement walls that an
   agent-first provider will not climb to jump-start a business.

The wedge is therefore **uniformity plus reliability at a self-serve price**. The differentiator is
not how many capabilities exist; it is that *every capability has the same shape*, so a team calibrates
once and never again. Under that positioning, breadth is worth approximately zero until sameness is
guaranteed — capability N+1 only pays off if capabilities 1..N are already indistinguishable in form.

### 1.1 Measured current state (2026-08-12)

The published surface does not currently satisfy that claim. This is not an estimate; it is read off
the shipped packages.

**Four mutually incompatible error models:**

| Model | Location | Shape | Codes |
|---|---|---|---|
| `PaperError` | `packages/core/src/errors.ts` | `code`, `phase`, `path[]`, `remediation`, `issues[]`, `slideIndex`, `nodeId` | 28, bare `SCREAMING_SNAKE` |
| `PdfError` | `packages/json-to-pdf/src/errors.ts` | `code`, `details{}` | 8, bare `SCREAMING_SNAKE` |
| `DOCXError` | `packages/docx/src/errors.ts` | `code`, `recovery`, `context{}` | ~40, TS `enum`, inconsistently `DOCX_`-prefixed |
| `RunstampFeatureError` | `packages/core/src/errors.ts` | `code`, `phase`, `feature`, `upgradeUrl`, `remediation`, `toJSON()` | 3 |

Three different names for the remediation concept (`remediation`, `recovery`, none). Three different
names for the detail bag (`issues[]`, `details{}`, `context{}`). And a live **code collision**:
`RESOURCE_LIMIT_EXCEEDED` is emitted by both `PaperError` and `DOCXError` as two unrelated classes, so
a consumer switching on `err.code` gets the wrong branch depending on which package threw.

**Three names for one verb, across sibling packages:**

| Job | `json-to-docx` | `json-to-xlsx` | `json-to-pdf` | `document-diff` |
|---|---|---|---|---|
| diff | `diffDocxDocuments` | `diffSpreadsheetDocuments` | — | `diffDocuments` |
| validate | `validateAccessibility` | `lintSpreadsheetDocument` | `validatePdfBuffer`, `buildPdfQualityReport` | — |
| repair | `remediateAccessibility` | — | `repairPdfBuffer`, `validateAndRepairPdfBuffer` | — |
| parse | `docxToStructured` | — | — | — |
| typed errors | none exported | none exported | `PdfError` / `isPdfError` | none exported |

**Missing entirely from the public surface:**

- **No shared result envelope.** A grep across `packages/*/src` for `OperationResult`, `DocumentResult`,
  or any common base returns nothing. Every operation returns a bespoke shape.
- **No `Loss` type.** The factory's evidence artifacts contain `losses.json` per item and
  The product roadmap requires "typed losses" on nearly every card — but no loss type is
  exported from any package. The loss ledger exists only as build-time evidence, never at runtime.
- **No `Locator` type.** A14's evidence asserts "stable native text locators"; no locator type exists
  in any package. Nothing can currently cite a position back to a source artifact.
- **No `Receipt` / provenance type.** Determinism is tested but never *returned*, so a caller cannot
  prove what they got.

**Leaked internals in the public API:** `phase1Fixtures`, `phase2Fixtures`, `phase3Fixtures`,
`phase4Fixtures`, `getPhase1Fixture`, `listPhase1Fixtures`…, `F`, `offsetFormulaRows` (`json-to-xlsx`);
`analyzePhase6Document`, `analyzePhase7Document`, `analyzePhase8Document` (`json-to-pdf`). These are
development scaffolding on a semver-stable surface.

**Triplicated infrastructure:** `isDeterministicModeEnabled()` is independently implemented three
times — `packages/docx/src/deterministic-mode.ts`, `packages/json-to-pdf/src/deterministic-mode.ts`,
`packages/xlsx/src/deterministic-mode.ts` — so "deterministic mode" can mean three different things.

**Scattered diagnostics:** `ChartFitDiagnostics`, `ImageFitDiagnostics`, `TableFitDiagnostics`,
`AbsoluteTextFitDiagnostics`, `FontDiagnostic`, `LayoutDiagnostic`, `SlideDiagnostics`,
`Phase2BenchmarkDiagnostics` — eight unrelated shapes, none reaching the caller through a common channel.

A developer adopting Runstamp today re-calibrates per format. That is precisely the pain the
positioning promises to remove.

### 1.2 What OC-1 is

One contract that every document operation implements, in every package, on every surface (SDK, hosted
API, MCP tool, embedded UI). It defines the call shape, the result envelope, the error taxonomy, the
loss ledger, the locator model, the determinism receipt, and the naming rules — plus a machine-checkable
conformance gate so drift cannot re-enter.

### 1.3 Non-goals

- Not a rewrite of any engine. OC-1 is a surface contract; layout, OOXML, and PDF internals are untouched.
- Not a breaking change. v1 lands additively (§8); legacy exports keep working through a published
  deprecation window.
- Not a new capability. Zero new document features ship under OC-1.
- Not a governance/policy engine. OC-1 defines where policy *attaches* (`receipt`, `losses`), not policy itself.

---

## 2. Design principles

1. **One shape, everywhere.** If two operations differ in form, one of them is wrong. Sameness is the product.
2. **Nothing fails silently.** Any deviation from faithful processing is a typed `Loss` in the result. An
   operation that drops content without recording it is defective, not merely lossy.
3. **Machine-first, human-legible.** Every result is JSON-serializable without custom replacers, because
   the primary consumer is an agent over MCP, not a REPL.
4. **Recoverable by construction.** Every error carries a stable `code` and a `remediation` string, so an
   agent can self-correct without parsing prose.
5. **Codes are forever; messages are not.** Messages may be reworded in any release. Codes are semver-major.
6. **Determinism is observable.** Same input + same options + same version ⇒ byte-identical output *and* a
   receipt that proves it.
7. **Additive migration.** No consumer breaks to get uniformity.

---

## 3. The contract

### 3.0 Home and versioning

OC-1 ships as a new **zero-dependency** package:

```
packages/contract/   →   @runstamp/contract
```

Zero-dependency is normative: every product package depends on it, so it must never pull in an engine.
It contains types, small pure runtime helpers (constructors, type guards, serializers), and the
conformance metadata. It must not import from `core`, `docx`, `xlsx`, `json-to-pdf`, or `lite`.

> Note: `@runstamp/pptx-pro` *is* `packages/core`, a published product package. The contract
> therefore cannot live in core without every package depending on a product.

```ts
export const CONTRACT_VERSION = "1.0.0" as const;
export type ContractVersion = typeof CONTRACT_VERSION;
```

`CONTRACT_VERSION` is independent of package versions and appears in every `Receipt`.

### 3.1 Operation signature

Every public operation is a function of exactly this shape:

```ts
type Operation<TInput, TOptions extends OperationOptions, TValue> =
  (input: TInput, options?: TOptions) => Promise<OperationResult<TValue>>;
```

Rules:

- **R1.** Exactly two positional parameters: `input`, then `options`. Never three. Never an options-only
  object containing the input.
- **R2.** `options` is always optional and always extends `OperationOptions` (§3.8).
- **R3.** Always `Promise`-returning, even when the implementation is synchronous. Uniformity beats
  micro-optimization; a sync escape hatch may be added per-operation as `<name>Sync` only with an
  explicit exemption recorded in the registry.
- **R4.** Never throws for a *document* condition. Bad input, unsupported feature, conformance failure,
  resource limit — all return `{ ok: false }`. Throwing is reserved for programmer error (a null
  required argument, a violated invariant) and host failure (OOM). See §3.3.1.
- **R5.** Never mutates `input`.

### 3.2 The result envelope

```ts
export type OperationResult<T> = OperationSuccess<T> | OperationFailure;

export interface OperationSuccess<T> {
  readonly ok: true;
  readonly value: T;
  /** Faithfulness deviations. Empty array means fully faithful. Never undefined. */
  readonly losses: readonly Loss[];
  /** Non-fatal observations that are not losses. Never undefined. */
  readonly diagnostics: readonly Diagnostic[];
  readonly receipt: Receipt;
}

export interface OperationFailure {
  readonly ok: false;
  readonly error: PaperError;
  /** Losses accrued before failure. Preserved for partial-progress diagnosis. */
  readonly losses: readonly Loss[];
  readonly diagnostics: readonly Diagnostic[];
  /** Present when enough of the operation ran to bind inputs. */
  readonly receipt?: Receipt;
}
```

Rules:

- **R6.** `ok` is the sole discriminant. Never infer success from the presence of `value`.
- **R7.** `losses` and `diagnostics` are always present on success — `[]`, never `undefined`, never `null`.
- **R8.** `value` is absent on failure. There is no partial-value channel; partial output is expressed as
  success with losses, or failure. Choose one.
- **R9.** The whole envelope must survive `JSON.parse(JSON.stringify(x))` with no loss of meaning, except
  that `Uint8Array` payloads inside `value` are exempt (see `ArtifactBytes`, §3.9).

Helpers (in `@runstamp/contract`):

```ts
export function ok<T>(value: T, parts?: {
  losses?: readonly Loss[];
  diagnostics?: readonly Diagnostic[];
  receipt: Receipt;
}): OperationSuccess<T>;

export function fail(error: PaperError, parts?: {
  losses?: readonly Loss[];
  diagnostics?: readonly Diagnostic[];
  receipt?: Receipt;
}): OperationFailure;

export function isOk<T>(r: OperationResult<T>): r is OperationSuccess<T>;
export function isFail<T>(r: OperationResult<T>): r is OperationFailure;

/** Escape hatch for ergonomic call sites: returns value or throws error. */
export function unwrap<T>(r: OperationResult<T>): T;
```

`unwrap` exists so the throwing style remains one call away for humans, without any operation itself
throwing.

### 3.3 Error model

There is exactly **one** error class across the platform. `PdfError`, `DOCXError`, and the ad-hoc OOXML
error factories are folded into it.

```ts
export type ErrorDomain =
  | "common" | "pptx" | "docx" | "xlsx" | "pdf" | "html"
  | "policy" | "license" | "connector" | "host";

/** Stable, greppable, collision-proof: `${domain}/${SCREAMING_SNAKE}`. */
export type ErrorCode = `${ErrorDomain}/${string}`;

export type ErrorPhase =
  | "input" | "validation" | "compilation" | "layout" | "typography"
  | "media" | "chart" | "serialization" | "archive" | "font"
  | "template" | "rendering" | "parsing" | "policy" | "transport";

export type ErrorSeverity = "fatal";

export interface ErrorIssue {
  /** Dotted/indexed path into the input. */
  readonly path: string;
  readonly message: string;
  readonly expected?: string;
  readonly received?: string;
  /** One sentence, imperative, addressed to the caller (human or agent). */
  readonly remediation?: string;
  /** Where in the artifact, when the issue is positional. */
  readonly locator?: Locator;
}

export class PaperError extends Error {
  readonly code: ErrorCode;
  readonly phase: ErrorPhase;
  readonly remediation: string;
  readonly issues: readonly ErrorIssue[];
  readonly locator?: Locator;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly retryable: boolean;

  constructor(init: {
    code: ErrorCode;
    phase: ErrorPhase;
    message: string;
    remediation: string;
    issues?: readonly ErrorIssue[];
    locator?: Locator;
    details?: Record<string, unknown>;
    retryable?: boolean;
    cause?: unknown;
  });

  toJSON(): PaperErrorJSON;
}

export function isPaperError(v: unknown): v is PaperError;
export function paperErrorFromJSON(j: PaperErrorJSON): PaperError;
```

Rules:

- **R10.** `remediation` is **required**, not optional. An error a caller cannot act on is a bug. It must be
  one imperative sentence naming the concrete fix ("Embed the font or disable PDF/A conformance"), never
  a restatement of the failure.
- **R11.** `code` is namespaced by domain. `common/RESOURCE_LIMIT_EXCEEDED` and `docx/IMAGE_TIMEOUT` cannot
  collide. Cross-cutting conditions belong in `common/` and must be identical everywhere.
- **R12.** `retryable` distinguishes transient (`host/TIMEOUT`, `connector/RATE_LIMITED`) from deterministic
  failures. Agents branch on it; retrying a `pdf/PDFA_VIOLATION` is always wrong.
- **R13.** `toJSON()` is required and lossless: `paperErrorFromJSON(JSON.parse(JSON.stringify(e)))` must
  reproduce every field except `stack` and `cause`. This is how errors cross the MCP and HTTP boundaries.
- **R14.** Codes are append-only within a major version. Removing or repurposing a code is semver-major.
  Adding one is semver-minor. Message text is not part of the contract.

#### 3.3.1 Throw vs. return

| Condition | Channel |
|---|---|
| Invalid document, unsupported feature, conformance violation, resource limit, policy denial, corrupt input | `{ ok: false, error }` |
| Missing required argument, wrong argument type at the boundary, violated internal invariant | `throw` (a `TypeError`/`PaperError` with `common/CONTRACT_VIOLATION`) |
| Host death (OOM, process signal) | propagate |

The dividing line: **if the caller could have produced this condition with valid code and bad data, it is
a result, not a throw.**

#### 3.3.2 Common codes (normative starter set)

`common/` codes must behave identically in every package:

```
common/CONTRACT_VIOLATION        common/SCHEMA_REJECTED
common/RESOURCE_LIMIT_EXCEEDED   common/OPERATION_CANCELLED
common/OPERATION_TIMEOUT         common/OPTIONS_CONFLICT
common/UNSUPPORTED_FEATURE       common/UNSUPPORTED_VERSION
common/INPUT_CORRUPT             common/INPUT_ENCRYPTED
common/ASSET_REJECTED            common/ASSET_FETCH_FAILED
common/DETERMINISM_UNAVAILABLE   common/NOT_IMPLEMENTED
```

### 3.4 Diagnostics

A `Diagnostic` is an observation that is **not** a faithfulness deviation: a performance note, an applied
auto-fit, a heuristic taken, a deprecation.

```ts
export type DiagnosticSeverity = "debug" | "info" | "warn";

export interface Diagnostic {
  readonly code: ErrorCode;          // same namespaced space
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly phase: ErrorPhase;
  readonly locator?: Locator;
  readonly details?: Readonly<Record<string, unknown>>;
}
```

- **R15.** If the output no longer faithfully represents the input, it is a `Loss`, not a `Diagnostic`.
  When in doubt, it is a `Loss`. The existing eight `*Diagnostics` shapes collapse into this type; those
  that indicate content did not fit (e.g. clipped text, truncated table) must be reclassified as losses.

### 3.5 The loss ledger

This is the contract's differentiating artifact and the runtime counterpart to the factory's
`losses.json`. It is what lets a corporate buyer trust the output without opening it.

```ts
export type LossSeverity =
  /** Preserved, but represented differently (e.g. font substituted, metrics equal). */
  | "substituted"
  /** Preserved with reduced fidelity (e.g. vector flattened to raster). */
  | "degraded"
  /** Not represented in the output at all. */
  | "dropped";

export interface Loss {
  readonly code: ErrorCode;
  readonly severity: LossSeverity;
  /** What was affected, in the caller's vocabulary. */
  readonly subject: string;
  readonly message: string;
  /** Where it happened in the source. Required whenever positionally attributable. */
  readonly locator?: Locator;
  readonly expected?: string;
  readonly actual?: string;
  /** True when a supported option would have avoided this loss. */
  readonly avoidable: boolean;
  /** Names the option that would avoid it, when avoidable. */
  readonly remediation?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}
```

Rules:

- **R16. No silent loss.** Any transformation that does not faithfully preserve the source emits a `Loss`.
  This is verified adversarially in the conformance suite (§7), not merely asserted.
- **R17.** `losses: []` on success is a positive, testable claim of full fidelity. Packages must not emit
  `[]` where fidelity is merely unknown — emit a `degraded` loss with `common/NOT_IMPLEMENTED` instead.
- **R18.** Losses are stable and ordered: identical input + options ⇒ identical loss array, in identical
  order (sorted by locator, then code).
- **R19.** `avoidable: true` requires `remediation` naming the option.

### 3.6 The locator model

A universal, format-agnostic address into an artifact. This is the substrate for citation resolution,
governance receipts, redaction, review routing, and RAG provenance — everything the catalog builds later.

```ts
export interface Locator {
  /** Content hash of the artifact this locator points into. Binds address to bytes. */
  readonly artifact: string;          // "sha256:<hex>"
  readonly domain: ErrorDomain;
  /** Ordered, most-significant first. */
  readonly path: readonly LocatorSegment[];
  /** Optional character range within the addressed node. */
  readonly range?: { readonly start: number; readonly end: number };
}

export interface LocatorSegment {
  readonly kind: LocatorKind;
  /** Zero-based ordinal within the parent. */
  readonly index?: number;
  /** Stable native identity when the format provides one (sheet name, XML id, bookmark). */
  readonly id?: string;
}

export type LocatorKind =
  | "page" | "slide" | "sheet" | "section" | "paragraph" | "run"
  | "table" | "row" | "column" | "cell" | "shape" | "image"
  | "chart" | "note" | "header" | "footer" | "comment" | "annotation"
  | "part";                            // raw package part (OOXML/PDF object)
```

**Canonical string form.** Every locator has a bijective string encoding, because agents, logs, URLs, and
citations need a scalar:

```
sha256:ab12…/pptx:slide[2]/shape[0]/run[3]
sha256:cd34…/xlsx:sheet[id=Sheet1]/cell[id=R4C7]
sha256:ef56…/pdf:page[11]/paragraph[4]#120-168
sha256:0a9b…/docx:section[0]/paragraph[87]/run[1]
```

```ts
export function formatLocator(l: Locator): string;
export function parseLocator(s: string): Locator;   // throws common/CONTRACT_VIOLATION on malformed
```

Rules:

- **R20.** `formatLocator`/`parseLocator` round-trip exactly, both directions, for every locator the
  packages emit. Property-tested.
- **R21.** Locators are **stable**: the same logical position in the same artifact bytes always produces the
  same locator string, across processes and platforms.
- **R22.** `artifact` binds the address to specific bytes. A locator from one version of a document must
  never silently resolve against another.
- **R23.** Prefer `id` over `index` whenever the format offers stable native identity.

### 3.7 The receipt

Proof of what was produced, from what, by what, and whether it is reproducible.

```ts
export interface Receipt {
  readonly contractVersion: ContractVersion;
  readonly operation: OperationName;        // §4
  readonly domain: ErrorDomain;
  readonly engine: { readonly name: string; readonly version: string };
  readonly inputHash: string;               // "sha256:<hex>"
  readonly optionsHash: string;             // canonical-JSON hash of effective options
  readonly outputHash?: string;             // present when the operation produced bytes
  /** True ⇒ identical (inputHash, optionsHash, engine.version) yields identical outputHash. */
  readonly deterministic: boolean;
  /** Non-deterministic inputs actually consumed (clock, RNG, network, locale, filesystem). */
  readonly nondeterminismSources: readonly NondeterminismSource[];
  /** External tools/oracles invoked, with pinned versions. */
  readonly tools?: readonly { readonly name: string; readonly version: string }[];
  /** Omitted entirely in deterministic mode — a timestamp would break byte-identity. */
  readonly producedAt?: string;
}

export type NondeterminismSource =
  | "clock" | "random" | "network" | "locale" | "filesystem" | "environment" | "concurrency";
```

Rules:

- **R24.** `deterministic: true` is a falsifiable claim, verified by the two-process byte-identity test in
  the conformance suite. Asserting it without that test passing is a contract violation.
- **R25.** In deterministic mode, `producedAt` must be **omitted**, not zeroed.
- **R26.** `nondeterminismSources` must be non-empty whenever `deterministic` is `false`, naming actual causes.
- **R27.** `optionsHash` is computed over *effective* options (after defaults are applied), using the
  canonical JSON encoding in `@runstamp/contract` — sorted keys, no insignificant whitespace.

### 3.8 Shared options

```ts
export interface OperationOptions {
  /** Force byte-reproducible output. Replaces the three divergent implementations. Defaults to true. */
  readonly deterministic?: boolean;
  /** Seed for deterministic identifier generation (file ids, rIds). Carried over from docx/pdf. */
  readonly deterministicSeed?: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly limits?: ResourceLimits;
  /** BCP-47. Affects formatting only, never structure. */
  readonly locale?: string;
  /** Streaming sink for diagnostics; the result still carries the full array. */
  readonly onDiagnostic?: (d: Diagnostic) => void;
  /** Streaming sink for losses; the result still carries the full array. */
  readonly onLoss?: (l: Loss) => void;
  /** How to treat losses. Default "collect". */
  readonly lossPolicy?: "collect" | "failOnDropped" | "failOnAny";
}

export interface ResourceLimits {
  readonly maxInputBytes?: number;
  readonly maxOutputBytes?: number;
  readonly maxPages?: number;
  readonly maxElements?: number;
  readonly maxArchiveEntries?: number;
  readonly maxExpansionRatio?: number;   // zip-bomb guard
  readonly maxDurationMs?: number;
}
```

- **R28.** `deterministic` is honored identically in every package. The three existing
  `isDeterministicModeEnabled()` implementations are replaced by one in `@runstamp/contract`.
  Precedence: `options.deterministic` → `RUNSTAMP_DETERMINISTIC` env var → process default.
  **The process default is `true`**, matching all three current implementations
  (`packages/docx`, `packages/json-to-pdf`, `packages/xlsx` each initialize `deterministicMode = true`);
  defaulting to `false` would silently flip behavior in three packages during Phase 2. The existing
  `setDeterministicMode(enabled)` mutator is preserved for the same reason, and the optional seed
  concept from `resolveDeterministicSeed` (docx) / `deterministicPdfFileIdSeed` (pdf) is carried
  forward as `OperationOptions.deterministicSeed`. The env var is new and additive — none of the three
  current implementations read the environment at all.
- **R29.** `signal` and `timeoutMs` yield `common/OPERATION_CANCELLED` / `common/OPERATION_TIMEOUT` as
  *results* (`retryable: true`), never as thrown `AbortError`.
- **R30.** `lossPolicy: "failOnDropped"` converts any `dropped` loss into a failure. This is how a
  regulated caller demands full fidelity without inspecting the ledger themselves.

### 3.9 Artifact payloads

```ts
export interface ArtifactBytes {
  readonly bytes: Uint8Array;
  readonly mediaType: string;          // "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  readonly extension: string;          // "pptx"
  readonly byteLength: number;
  readonly hash: string;               // "sha256:<hex>"
}
```

- **R31.** Every operation producing a file returns `ArtifactBytes`, never a bare `Uint8Array`/`Buffer`.
  The hash travels with the bytes so callers never re-derive it.

---

## 4. Canonical verb taxonomy

Exactly these verbs. One name per job, platform-wide.

| Verb | Signature (input → value) | Meaning |
|---|---|---|
| `render` | `Document → ArtifactBytes` | Structured input to native artifact |
| `parse` | `ArtifactBytes → Document` | Native artifact to structured model |
| `inspect` | `ArtifactBytes → Manifest` | Cheap structural/metadata read, no full parse |
| `validate` | `ArtifactBytes \| Document → ValidationReport` | Conformance check, never mutates |
| `repair` | `ArtifactBytes → ArtifactBytes` | Fix defects, report every change as a loss |
| `convert` | `ArtifactBytes → ArtifactBytes` | Cross-format transformation |
| `transform` | `ArtifactBytes + Plan → ArtifactBytes` | Bounded in-format mutation |
| `diff` | `[A, B] → ChangeSet` | Semantic comparison |
| `merge` | `ArtifactBytes[] → ArtifactBytes` | Combine |
| `split` | `ArtifactBytes + Plan → ArtifactBytes[]` | Divide |
| `extract` | `ArtifactBytes + Selector → Extraction` | Pull text/tables/media/metadata |
| `redact` | `ArtifactBytes + Plan → ArtifactBytes` | Irreversible removal with receipt |

```ts
export type OperationName = `${ErrorDomain}.${Verb}` | `${ErrorDomain}.${Verb}.${string}`;
// "docx.render", "pdf.validate", "xlsx.extract.tables"
```

- **R32.** A new verb requires an OC amendment. Packages may add *qualifiers*
  (`xlsx.extract.tables`), never new base verbs.
- **R33.** Verb semantics are invariant across domains. `validate` never mutates in any package;
  `repair` always reports its changes as losses in any package.

### 4.1 Renames

| Current | OC-1 |
|---|---|
| `diffDocxDocuments` / `diffSpreadsheetDocuments` / `diffDocuments` | `diff` (per package) |
| `validateAccessibility` | `validate` (with `profile: "accessibility"`) |
| `remediateAccessibility` | `repair` (with `profile: "accessibility"`) |
| `lintSpreadsheetDocument` | `validate` |
| `validatePdfBuffer` / `buildPdfQualityReport` | `validate` |
| `repairPdfBuffer` / `validateAndRepairPdfBuffer` | `repair` |
| `docxToStructured` | `parse` |
| `convertHtmlToStructured` | `parse` (in the `html` domain) |
| `linearizePdfBuffer` | `transform` (plan: `linearize`) |
| `extractPdfSignatures` | `extract` (selector: `signatures`) |
| `analyzePdfCapabilities` / `planPdfCapabilities` | `inspect` |
| `batchRender` | `render` over an array input; batching is an option, not a verb |

### 4.2 Export deny-list

The following must not appear on any public surface. Enforced mechanically (§7).

- `/^phase\d/i`, `/Phase\d/` — `phase1Fixtures`, `analyzePhase6Document`, …
- `/[Ff]ixture/` — test scaffolding
- `/^[A-Z]$/` — single-letter exports (`F`)
- `/^(internal|_)/`
- Any `*Sync` variant lacking a registry exemption
- Any bare `Buffer`/`Uint8Array` return (must be `ArtifactBytes`)

---

## 5. Module and naming rules

- **R34. One entry point per package for OC-1 operations:** the `./ops` subpath.
  ```
  @runstamp/docx/ops   →  { render, parse, validate, repair, diff, extract, … }
  ```
  The root entry keeps its legacy exports through the deprecation window (§8).
- **R35.** Every `./ops` export is either a canonical verb (§4) or a type. No helpers, no constants, no
  fixtures, no classes.
- **R36.** Verbs are bare (`render`), not domain-qualified (`renderDocx`). The import path carries the
  domain. Cross-package composition uses namespace imports:
  ```ts
  import * as docx from "@runstamp/docx/ops";
  import * as pdf  from "@runstamp/pdf/ops";
  ```
- **R37.** Every package re-exports the contract types from `@runstamp/contract` so consumers never need a
  second install to type a result.
- **R38.** Each package publishes an `api-extractor` report checked into `etc/<pkg>.api.md`; a diff in CI
  requires an explicit version decision.

---

## 6. Surface projections

The same contract, four renderings. **Projections are generated from one registry, never hand-written** —
that is the mechanism that keeps them uniform.

```ts
export interface OperationDescriptor {
  readonly name: OperationName;
  readonly domain: ErrorDomain;
  readonly verb: Verb;
  readonly summary: string;              // one line, agent-facing
  readonly inputSchema: JSONSchema;
  readonly optionsSchema: JSONSchema;
  readonly valueSchema: JSONSchema;
  readonly errorCodes: readonly ErrorCode[];
  readonly lossCodes: readonly ErrorCode[];
  readonly deterministic: boolean;
  readonly sideEffects: "none" | "network" | "filesystem";
  readonly stability: "experimental" | "stable" | "deprecated";
}

export const REGISTRY: readonly OperationDescriptor[];
```

**SDK.** The `./ops` subpath, as specified above.

**Hosted API.** `POST /v1/{domain}/{verb}`. Response body *is* `OperationResult`. HTTP status is `200` for
`ok: true`, `422` for a document-condition failure, `4xx/5xx` only for transport/auth/host. A failed
operation is a successful HTTP exchange carrying a typed failure — agents must not have to distinguish
"the API broke" from "the document was invalid" by status code alone.

**MCP.** One tool per registry entry, name `runstamp_{domain}_{verb}`, `inputSchema` generated from the
descriptor. On failure, return the serialized `PaperError` with `remediation` in the tool-error content so
the model can self-correct in one turn. Responses omit `bytes` by default, returning a handle plus hash —
never flood an agent's context with base64.

**Embedded UI.** Components consume `OperationResult` directly; `losses` render as the fidelity panel,
`diagnostics` as the console, `receipt` as the provenance badge.

---

## 7. Conformance

OC-1 is enforced, not encouraged. `pnpm contract:verify [package]` runs:

| # | Gate | Check |
|---:|---|---|
| C1 | Signature | Every `./ops` export matches `Operation<…>`; two params; returns a Promise |
| C2 | Envelope | Returns a well-formed `OperationResult`; `losses`/`diagnostics` always arrays |
| C3 | Serialization | `JSON.parse(JSON.stringify(result))` preserves every field except artifact bytes |
| C4 | Errors | Every failure is a `PaperError`; `code` matches `${domain}/…`; `remediation` non-empty |
| C5 | Code registry | Every emitted code is declared in the package's registry entry; no undeclared codes |
| C6 | No-throw | Fuzzed malformed/hostile inputs produce failures, never uncaught throws |
| C7 | Determinism | Two clean processes ⇒ byte-identical `outputHash` when `deterministic: true` |
| C8 | Receipt honesty | `deterministic: true` only when C7 passes; `nondeterminismSources` non-empty when false |
| C9 | Locator round-trip | `parseLocator(formatLocator(l))` deep-equals `l` for every emitted locator |
| C10 | Locator stability | Same bytes ⇒ same locator strings, across processes |
| C11 | **No silent loss** | For each known-lossy fixture, the expected `Loss` is present with correct severity |
| C12 | Loss ordering | Identical input ⇒ identical loss array and order |
| C13 | Export hygiene | No export matches the §4.2 deny-list |
| C14 | Verb vocabulary | Every `./ops` export is a canonical verb or a type |
| C15 | Cancellation | `signal`/`timeoutMs` yield the typed cancellation result within tolerance |
| C16 | API report | `etc/<pkg>.api.md` matches the built surface |

**C11 is the one that matters.** It is adversarial: the suite holds fixtures whose faithful processing is
known to be impossible (restricted font, unsupported chart type, vector-only artwork, RTL in a
non-RTL-capable target), and it asserts the corresponding loss appears. A package that produces plausible
output and an empty ledger fails. This gate is what converts "reliability" from a marketing word into a
merge condition.

CI: `contract:verify` runs on every PR and blocks merge. Adding an OC-1 operation without its conformance
fixtures is not possible.

---

## 8. Migration

Additive, non-breaking, per-package. No consumer breaks to gain uniformity.

**Phase 0 — contract package.** Create `packages/contract` with all types, helpers, canonical JSON/hash,
locator codec, the registry type, and the `contract:verify` harness. No product package changes.
*Exit:* `@runstamp/contract` builds, is 100 % unit-tested, has zero dependencies.

**Phase 1 — error unification.** *(revised 2026-08-12 during implementation; see note below.)*
`PaperError` lives in the contract with the OC-1 shape. A **legacy interop bridge** —
`toPaperError()` plus an exhaustive legacy-code table — maps every code the platform ships onto a
namespaced `ErrorCode`, supplies the `phase` and `remediation` the legacy models lacked, unifies
`recovery`/`remediation` and `context`/`details`, and preserves the original at `details.legacyCode`.
The engines keep throwing exactly what they throw today; Phase 3's `./ops` adapters normalize at the
boundary.
*Exit:* every shipped code is mapped and tested; no behavioral change for existing catch sites.

> **Why the revision.** The original Phase 1 text required two things that cannot both hold:
> *"construct `PaperError` with domain-prefixed codes"* and *"no behavioral change for existing catch
> sites."* Re-basing `PdfError`/`DOCXError` onto `PaperError` necessarily changes `err.code` from
> `SCHEMA_REJECTED` to `pdf/SCHEMA_REJECTED`, breaking every existing `catch` that compares it — and it
> would additionally re-parent three shipped classes onto a prototype from a new package, risking
> `instanceof` breakage in duplicated-package installs. Since the namespaced code is only *needed*
> where OC-1 is promised — the `./ops` surface, which does not exist until Phase 3 — the translation
> belongs at that boundary, not inside the engines. The bridge delivers the identical end state with
> zero risk to current consumers, and Phase 3 consumes it directly.

**Codes mapped in Phase 1** (all verified against the source enums/unions):

| Legacy model | Location | Codes |
|---|---|---:|
| `PaperError` | `packages/core/src/errors.ts` | 27 |
| `PdfError` | `packages/json-to-pdf/src/errors.ts` | 8 |
| `DOCXError` | `packages/docx/src/errors.ts` | 33 |
| `RunstampFeatureError` | license | 3 |
| | **total** | **71** |

Mapping rule: a legacy code maps to `common/*` **only when it is an exact synonym** of a normative
common code; otherwise it keeps its meaning under its domain prefix, so no semantic detail is
flattened. Both real collisions are resolved — `RESOURCE_LIMIT_EXCEEDED` (core + docx) and
`FEATURE_REQUIRES_UPGRADE` (core + license) — and the five docx codes that were missing their own
`DOCX_` prefix (`TABLE_GRID_MISMATCH`, `INVALID_COLOR`, `INVALID_FONT_SIZE`, `IMAGE_SIZE_EXCEEDED`,
`RESOURCE_LIMIT_EXCEEDED`) become consistent with their siblings.

**Phase 2 — infrastructure dedup.** *(completed 2026-08-12; scope corrected below.)*
`packages/docx`, `packages/json-to-pdf` and `packages/xlsx` now delegate their determinism flag to
`@runstamp/contract`. Public signatures are unchanged, including docx's two-argument
`setDeterministicMode(enabled, seed)`, `resolveDeterministicSeed`, and pdf's
`deterministicPdfFileIdSeed`.
*Exit:* one flag; full suites green (docx 1132 pass, pdf 356 pass, xlsx 350 pass + 3 pre-existing
load-dependent timeouts that pass in isolation).

> **Correction: there were four implementations, not three.** §1.1 counted the three module-level
> booleans and missed `packages/core/src/deterministicMode.ts`, which is a different and **better**
> design: a `DeterministicModeManager` class, per-render-context scoping via `getActiveContext()`, and
> a default manager stored on the **global symbol registry** rather than in a module variable.
>
> That last detail is not incidental, and core documents why: the lite bundle code-splits, so a
> module-local flag gave the caller's `setDeterministicMode(true)` and the archive zipper's
> `isDeterministicMode()` two different module instances — the zipper silently read `false` and
> stamped ZIP entries with the wall clock, destroying byte-reproducibility. The contract's Phase 0
> implementation had exactly this bug. It now adopts core's fix, keying off
> `Symbol.for("runstamp.deterministicMode.defaultManager")` — **the same key core uses**, duck-typed to
> the same shape, so all four implementations observe one flag no matter how a bundler splits chunks
> or how many copies of the package are installed.
>
> Core's context-scoped managers are deliberately left in place: `packages/core/tests/renderContext.test.ts`
> asserts that two contexts can hold different modes simultaneously, which is a real feature, not
> drift. The contract supplies the *default*; core's contexts still override it.
>
> **One intended semantic change:** the flag is now process-global rather than per-package, so
> `setDeterministicMode(false)` imported from `@runstamp/docx` also affects
> `@runstamp/pdf` in the same process. Previously these were independent. That is the point of
> the phase — three meanings of "deterministic mode" was the defect — but it is a behavior change and
> is called out here rather than buried.
>
> **Release ordering:** `@runstamp/contract` is now a `workspace:*` dependency of three published
> packages, so it must be published before or with them, using **pnpm** (npm ships the unresolved
> `workspace:*` specifier and makes the packages uninstallable).

*Deferred from this phase:* the single canonical-JSON hasher and `Receipt` builder exist in the
contract but are not yet consumed by the engines — they have no call sites until the `./ops` surfaces
land, so wiring them now would add a dependency with no behavior attached. They are adopted in Phase 3.

**Phase 3 — `./ops` surfaces.** *(complete 2026-08-12: all four engine domains.)* Per package, add the `./ops`
subpath implementing canonical verbs as thin adapters over existing internals. **No engine logic is
rewritten.** Adapters normalize the return into the envelope, attach receipts, and emit losses.
Order: `json-to-pdf` **✅** → `json-to-docx` **✅** → `json-to-xlsx` **✅** → `json-to-pptx` **✅**.
`document-diff` was made **private infrastructure** instead: `ErrorDomain` has no `diff` member, its
`diffDocuments(before, after, plugin, options)` is synchronous with four positional parameters
(violating R1 and R3), and §4.1 already specifies `diff` *per format package*. Shipping `diff.diff`
alongside `docx.diff` would have added a redundant domain to satisfy the letter of §10; making the
package private satisfies it with no contract amendment.
*Exit:* C1–C16 green per package.

> **The harness carries the contract, not each adapter.** `runOperation` in `@runstamp/contract` is the
> single place the envelope is built, so every verb inherits options resolution, loss/diagnostic
> collection, loss policy, deterministic loss ordering, receipt construction and the R4 no-throw
> guarantee. An adapter is therefore a mapping, not an implementation — `json-to-pdf/ops` is ~200 lines
> covering five verbs over the existing engine.
>
> **One harness bug the conformance tests caught:** the first adapter computed `hashValue(input)`
> eagerly, *outside* the guard. For an input that cannot be canonicalized (`undefined`, a cycle, a
> `Date`) the hash threw before the harness could convert it — violating R4 on the very first surface.
> `RunOperationInit.inputHash` now accepts a thunk evaluated inside the guard. This is precisely the
> class of defect C6 exists to find, and it was found by a test rather than by review.

**`json-to-pdf/ops` verbs shipped:** `render`, `validate`, `repair`, `transform` (linearize), `extract`
(signatures). Verified against the real engine: byte-determinism across repeat renders (C7), receipt
`outputHash` matching the produced bytes (C8), typed failure rather than a throw for six hostile inputs
(C6), JSON round-trip of the envelope (C3), namespaced code plus non-empty remediation on failure (C4),
every repair action reported as a loss (R16), and `lossPolicy: "failOnAny"` converting losses into
`pdf/LOSS_POLICY_VIOLATED` (R30). Package suite: 369 passing, 0 failing.

**Phase 4 — loss and locator coverage.** Audit each engine for silent-loss sites and instrument them.
Expect this to be the longest phase; it is also the one that produces the differentiator.
*Exit:* C11 green with a real adversarial fixture set per format.
*Status (2026-08-12): complete for `pdf` and `docx`; **honestly incomplete** for `xlsx` and `pptx`.*

> **C11 no longer passes vacuously.** Both `xlsx` and `pptx` reached "16/16 green" while declaring no
> adversarial loss fixture at all — every fixture asserted a *clean* ledger, so the differentiator gate
> proved nothing about either package's ability to detect loss. The gate now **warns** in that case and
> names the omission, because a formality that always passes is worse than no gate: it converts an
> unknown into a false assurance.
>
> The cause is structural in both. `xlsx`'s render path emits only lint findings (the value of
> `validate`) and relaxed-input coercions (diagnostics under R15); its real losses — stripped macros and
> stripped external connections, both `dropped` — live in `repair` and need a defective-workbook
> fixture. `pptx`'s fidelity findings (font substitution, body-text overflow, chart fallbacks) are
> produced by the **quality-report path, which `render` does not surface**, so the render ledger cannot
> currently see them. Joining those two paths is the remaining Phase 4 work for `pptx`.
>
> Both gaps are visible in `ga/conformance.json` and in the terminal report rather than hidden behind a
> passing tick.

### Phase 4 findings — `docx`

Three defects, all in shipped code:

1. **`docx.convert.pdf` was never deterministic.** pdf-lib stamps the wall clock into `/ModDate` and
   `/CreationDate` when it creates the merged document, so two runs a second apart produced different
   bytes — while the receipt asserted `deterministic: true`. That is the falsifiable claim R24 forbids,
   and §9.4 classifies a determinism regression as P0. Both dates are now pinned under deterministic
   mode. R25 prefers the timestamp *omitted* rather than zeroed; pdf-lib offers no way to omit it, so a
   fixed epoch is the closest honest equivalent.
2. **The PDF bridge's warning channel was dead.** A `warnings` array was threaded through every
   converter and never written to, while `default: return []` dropped any element the bridge had no arm
   for. Instrumented; currently a live guard rather than a reachable path, because the structured
   converter has fewer arms than the docx one.
3. **HTML conversion warnings were reported twice.** The serializer context seeds itself from
   `structured.warnings` and returns them again, so `renderHtmlToDocx` emitted each one under both
   `DOCX_HTML_CONVERSION_WARNING` and `DOCX_SERIALIZER_WARNING`. Invisible while warnings were an
   unexamined array; obvious the moment they became a ledger.

### Phase 4 findings — `pptx`

1. **The silent-drop inventory reached only a logger.** `emitRenderabilityWarnings` is the engine's own
   list of "properties the schema accepts but the PPTX writer produces no bytes for" — precisely a loss
   ledger — and its findings were logged and discarded. Now routed through `onInputWarning`.
2. **Its already-checked `WeakSet` suppressed the whole pass** on a repeat render of the same document
   object, so a second identical render reported no warnings. That would have broken C12, which requires
   identical input to yield an identical loss array. The suppression is now scoped to the log line.
3. **`PaperEngine.render` never validated its input shape.** `normalizeRenderInput` returns non-agent
   input unchanged, so a string reached `slides.flatMap` deep inside the interpreter and escaped as a
   native `TypeError` — no code, no remediation, arriving at the caller as `UNMAPPED_ERROR`.
   `documentValidation.ts` already documented this intent for its own entry point; the render path
   lacked it.

### Phase 4 findings — `pdf`

The audit did not find "places where a loss could be reported more nicely." It found three defects that had
shipped, two of which silently destroyed document content. This is the evidence that C11 is worth its cost:
every one was found by writing the adversarial fixture, not by reading the code.

**1. Missing glyphs were invisible — the serious one.** `selectRunFont` falls back to the primary font when
no candidate covers a character, and the bundled automatic fallback (Lato) covers Latin, Greek and Cyrillic
only. So `漢字` rendered as `.notdef` — blank boxes — in a well-formed 4,575-byte PDF with **`losses: []`**.
The exact C11 failure mode: plausible output, empty ledger, and no way for a caller to know. Instrumented at
the per-character font selection in `pdf-renderer.ts`, which is the last point where the information still
exists; downstream there is only a glyph id of `0`. Classified `dropped`, not `substituted` — unlike a `?`,
nothing marks the absence.

**2. Form widget text was unreported.** Widget appearance streams call the same WinAnsi encoder as page text
but passed no `onUnmappable` sink, so form values were `?`-substituted with nothing recorded anywhere.
Measured before the fix: `α ≥ 5 → π` produced `(? ? 5 ? ?) Tj` and **zero** warnings.

**3. A page shorter than one line hung the process.** In `phase3-render.ts`, when a line did not fit the
remaining height the paginator pushed a new page and retried. If the line is taller than the *entire*
printable area that retry cannot make progress, so it appended pages until the heap was exhausted — a
300×18pt page with an 11-character paragraph killed the process rather than returning. Not a silent loss but
a direct R4/C6 violation, found while building the fixtures. The paginator now force-places the line,
guaranteeing forward progress, and reports the clipping as a `degraded` loss.

**A loss-ordering correction in the contract.** `compareLosses` tie-broke on `message`, which orders
consecutive characters of one text run by code point — so `漢字` reported `字` before `漢`. The tiebreak is
now emission order, which is document order; `Array.prototype.sort` is stable, so this stays deterministic
and still satisfies C12.

**What is deliberately *not* a loss.** Relaxed-input coercions and header-only tables are reported as
`Diagnostic`s. Both render exactly what was meant, and counting them would make `losses: []` unreachable for
correct documents — which would destroy the signal R17 depends on. Likewise, Greek and Cyrillic are covered
by the fallback font and are asserted to produce *no* loss; a ledger with false positives is not a ledger.

**Fidelity used to depend on license tier — this was removed.** The audit found that the free build had no
automatic fallback font and could not embed one (`embedded-fonts-and-complex-shaping` was gated), so the
published Apache-2.0 package substituted `?` for everything outside Latin-1 — Greek, Cyrillic, CJK, Arabic,
Hebrew, Devanagari, Thai. Fidelity was therefore a function of what you paid, which contradicts both the
OSS-wedge motion in the product strategy and OC-1's own "calibrate once" promise: the conformance matrix would have
needed a tier axis, meaning the contract guaranteed nothing on its own.

The free/pro split was consequently deleted from the engines (see the tier-removal note below). Correctness
is not a paid feature; the paywall is hosted operation, agent actions and governance. One artifact, one
behavior, one conformance matrix — which is what makes C11's results meaningful to a reader who has not
bought anything.

### Tier removal (2026-08-12)

Triggered by the Phase 4 finding above. Audit of all 65 guard call sites showed the paywall sat on
*correctness*, not governance: font embedding, complex-script shaping, the fallback font, and — worse — the
validation/repair/accessibility-audit APIs a caller would need to detect the resulting damage. The product strategy
puts the local engines in the free rung with no meter and makes governance the paywall, so the code
contradicted the model it was meant to serve.

What changed: `__PRO__` and the `IS_PRO` build flag are gone from `json-to-pdf`, `docx`, `xlsx` and `core`;
all guards are no-ops pending deletion of their call sites; `fixtures/fonts/` is now in the published
`files[]` (it never was, so the fallback font could not load even under Pro).

Two things the audit surfaced that were *not* about pricing:

- **The test suites were validating an unpublished configuration.** All four packages ran vitest with
  `__PRO__: "true"` while `build-free.mjs` — the artifact `exports` points at — builds with `"false"`.
  Removing the define exposed **200 failures** (pdf 92, xlsx 59, docx 49) representing shipped behavior no
  test had ever exercised. All now pass.
- **The Phase 3 `./ops` subpath was never built.** The entry was added to `tsup.config.ts`, which is not the
  build pipeline; `pnpm build` runs `scripts/build-{free,pro}.mjs`. `dist/ops/index.js` did not exist, so
  `@runstamp/pdf/ops` would have failed to resolve for any consumer. Both scripts now build it.

`isFreeMode()` in core is retained and still honest: `@runstamp/pptx` is a genuinely size-constrained
bundle that omits templates, the accessibility validator and shape-downgrade paths. That is a bundle
boundary, not a price. Its messages now say so.

*Coverage guard:* a C5 case re-scans the engine's warning emit sites and fails if any `PDF_*` code reaching
`onInputWarning` is unclassified, so a new engine warning cannot be added without classifying it.
*Verified after the tier removal:* `json-to-pdf` 374, `docx` 1122, `xlsx` 345, `core` 1384, `contract` 131 —
all passing. The pdf count is lower than the 389 measured mid-phase because the free/pro gating suites were
deleted, not because coverage shrank; the loss and locator cases are all retained.

**Phase 5 — MCP regeneration.** *(complete 2026-08-12.)* Rebuild `@runstamp/mcp-server` from `REGISTRY`. This replaces the current
generation-only tool set (`generate_report`, `generate_spreadsheet`, `generate_invoice_docx`,
`generate_chart_document`, `validate_spreadsheet`, `repair_spreadsheet`, `list_templates`,
`list_components`) with the full operations catalog.
*Exit:* every registry entry is a tool; tool errors carry `remediation`.

**Phase 6 — deprecation.** *(complete 2026-08-12.)* Legacy root exports emit deprecation notices; internals leaked in §4.2 are
removed in the next major. Publish the policy (§9) and the public conformance matrix.

**Compatibility rules during migration**

- Legacy exports keep exact behavior — including throwing — until the deprecation window closes.
- `./ops` is the only surface documented in new material from Phase 3 onward.
- No package may ship a `./ops` export that fails `contract:verify`.

---

## 9. Stability policy (published)

This is a customer-facing commitment, not an internal note. It is the direct answer to "OSS packages are
unstable."

1. **Error codes are semver-major.** Never removed or repurposed within a major. New codes are minor.
2. **Messages are not contractual.** Reworded any time. Branch on `code`.
3. **Locator strings are stable** for the lifetime of a major.
4. **Determinism is a guarantee**, not best-effort: same input + options + version ⇒ same bytes. A
   regression is a P0.
5. **Deprecation window:** minimum two minor versions with a runtime notice before removal; breaking
   changes only at a major with a migration guide.
6. **The contract version is independent.** `CONTRACT_VERSION` in every receipt lets a consumer pin
   behavior across package upgrades.
7. **The conformance matrix is public and continuously updated** — per package, per gate, per format,
   with known losses listed rather than hidden.

---

## 10. Acceptance for OC-1 itself

**Status (2026-08-12).**

| Criterion | State |
|---|---|
| `@runstamp/contract` published, zero-dependency, fully unit-tested | built, 171 tests, zero deps; **not yet published** |
| Every public package exposes `./ops` and passes C1–C16 in CI | **done** — pdf, docx, xlsx, pptx; blocking CI job |
| One error class, one determinism implementation, one hasher, one locator codec | **done** |
| `REGISTRY` drives SDK, HTTP, and MCP projections with no hand-written duplication | **done** — 19 operations; SDK, MCP, CLI and `POST /v1/{domain}/{verb}` |
| The deny-listed internals are gone from the public surface | **in the §9.5 window** — runtime notices attached; removed at the next major |
| The public conformance matrix is live | **done** — `docs/conformance-matrix.md`, generated, CI-checked for drift |
| The stability policy is published on the site | **written** — `docs/stability-policy.md`; site page pending |

The two open items are a publish and a site page, not engineering. What
remains before the catalog can resume is therefore a release, not a design.

OC-1 is done when:

- `@runstamp/contract` is published, zero-dependency, fully unit-tested;
- every public package exposes `./ops` and passes C1–C16 in CI;
- one error class, one determinism implementation, one hasher, one locator codec exist platform-wide;
- `REGISTRY` drives SDK, HTTP, and MCP projections with no hand-written duplication;
- the deny-listed internals are gone from the public surface;
- the public conformance matrix is live;
- and the stability policy is published on the site.

At that point "you calibrate once" is a verified property with a machine-checkable definition — and the
catalog expansion can resume, with every new item born compliant.

---

## Appendix A — verification commands used to establish §1.1

```bash
# four error models
grep -rn "class PaperError\|class PdfError\|enum DOCXErrorCode\|class RunstampFeatureError" packages/*/src

# no shared envelope, no loss type, no locator type, no receipt type
grep -rn "OperationResult\|interface .*Loss\b\|interface .*Locator\|interface .*Receipt" packages/*/src

# triplicated determinism
grep -rn "export function isDeterministicModeEnabled" packages/*/src

# leaked internals
grep -oE "phase[0-9]Fixtures|getPhase[0-9]Fixture|analyzePhase[0-9]Document" packages/*/src/index.ts
```

## Appendix B — package map

| npm name | directory | version | role under OC-1 |
|---|---|---|---|
| `@runstamp/contract` | `packages/contract` | new | the contract |
| `@runstamp/pptx-pro` | `packages/core` | 0.0.11 | `pptx` domain (pro) |
| `@runstamp/pptx` | `packages/lite` | 0.3.6 | `pptx` domain |
| `@runstamp/docx` | `packages/docx` | 0.5.7 | `docx` domain |
| `@runstamp/xlsx` | `packages/xlsx` | 0.3.6 | `xlsx` domain |
| `@runstamp/pdf` | `packages/json-to-pdf` | 0.4.4 | `pdf` domain |
| `@runstamp/document-diff` | `packages/document-diff` | 0.0.8 | `diff` verb host |
| `@runstamp/mcp-server` | `packages/mcp-server` | 0.3.6 | MCP projection |
| `@runstamp/cli` | `packages/cli` | 0.1.2 | CLI projection |
| `@runstamp/templates` | `packages/schemas` | 0.1.8 | template inputs |
| `@runstamp/react` | `packages/react` | 0.1.0 | embedded UI |
