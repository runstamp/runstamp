import { O as OperationName, V as Verb, c as OperationOptions, s as LossSeverity, b as ErrorDomain } from '../options-soAllhqJ.js';

/**
 * The conformance manifest (OC-1 §7).
 *
 * A package declares what it ships and what its known-lossy fixtures must
 * produce; `verifyPackage` turns that declaration into gate results. The
 * declaration is the point — a package that ships an operation without
 * conformance fixtures cannot be verified, which is what makes "adding an OC-1
 * operation without its fixtures is not possible" true rather than aspirational.
 */

/** A loss the suite asserts must be present for a fixture (C11). */
interface ExpectedLoss {
    /** Full contract code, e.g. `pdf/TEXT_GLYPH_MISSING`. */
    readonly code: string;
    readonly severity: LossSeverity;
    /** Exact number of occurrences, when the count itself is meaningful. */
    readonly count?: number;
}
interface ConformanceFixture {
    /** Stable identifier, used in reports and to name the failure. */
    readonly name: string;
    /** Exact descriptor identity exercised by this fixture. */
    readonly operation: OperationName;
    /** The evidence class this fixture contributes to operation coverage. */
    readonly kind: "nominal" | "hostile" | "boundary";
    /** Which verb to invoke. Must be a canonical verb exported by `./ops`. */
    readonly verb: Verb;
    readonly input: unknown;
    readonly options?: OperationOptions & Record<string, unknown>;
    /** What the envelope must report. */
    readonly expect: "ok" | "fail";
    /** On `expect: "fail"`, the exact namespaced code required. */
    readonly code?: string;
    /**
     * Losses that must appear. Extra losses are permitted — a fixture asserts what
     * it knows, not what it forbids.
     */
    readonly losses?: readonly ExpectedLoss[];
    /**
     * Assert `losses` is exactly empty. R17 makes this a positive claim of full
     * fidelity, so every format needs at least one: a ledger that can only ever
     * grow carries no information.
     */
    readonly lossFree?: boolean;
    /**
     * Skip the two-process determinism check for this fixture. Requires a reason,
     * because C8 makes `deterministic: true` falsifiable and silently opting out
     * would defeat it.
     */
    readonly nondeterministic?: string;
}
/** Source scan backing C5 until descriptors land (Stage 2). */
interface CodeScanConfig {
    /** Absolute paths to engine sources that emit warning codes. */
    readonly files: readonly string[];
    /** Capturing regex source matching one emitted code per match group 1. */
    readonly pattern: string;
    /** Every code the package classifies. An emitted code outside this set fails. */
    readonly classified: readonly string[];
}
interface SurfaceConfig {
    /** Built `.d.ts` for the `./ops` subpath. Deny-list violations are errors. */
    readonly ops?: string;
    /** Built `.d.ts` for the root entry. Violations are warnings until the next major. */
    readonly root?: string;
}
interface ConformanceManifest {
    /** npm package name, e.g. `@runstamp/pdf`. */
    readonly package: string;
    readonly domain: ErrorDomain;
    /**
     * Module specifier for the package's `./ops/descriptor` subpath.
     *
     * When present, C5 becomes descriptor-driven: every code an operation actually
     * emits must be declared in its descriptor, which is what makes the generated
     * MCP and HTTP projections trustworthy. `codeScan` stays as the complementary
     * check that no engine code escapes classification in the first place.
     */
    readonly descriptor?: string;
    /**
     * Module specifier for the built `./ops` surface — normally an absolute path to
     * `dist/ops/index.js`. Imported dynamically so the contract never takes a static
     * dependency on an engine (§3.0).
     */
    readonly ops: string;
    readonly fixtures: readonly ConformanceFixture[];
    /**
     * Values that must produce a typed failure rather than an uncaught throw.
     * Merged with the kit's shared hostile corpus.
     */
    readonly hostileInputs?: readonly unknown[];
    /** Which verb the hostile corpus is fed to. Defaults to `render`. */
    readonly hostileVerb?: Verb;
    readonly codeScan?: CodeScanConfig;
    readonly surfaces?: SurfaceConfig;
    /** `etc/<pkg>.api.md`, compared against the built surface (C16). */
    readonly apiReport?: string;
}
declare const GATE_IDS: readonly ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C18"];
type GateId = (typeof GATE_IDS)[number];
declare const GATE_TITLES: Readonly<Record<GateId, string>>;
type GateStatus = "pass" | "fail" | "warn" | "skip";
interface GateResult {
    readonly gate: GateId;
    readonly title: string;
    readonly status: GateStatus;
    /** One line when passing; the reason when not. */
    readonly summary: string;
    /** Specific violations, each independently actionable. */
    readonly details?: readonly string[];
}
interface VerifyReport {
    readonly package: string;
    readonly domain: ErrorDomain;
    readonly contractVersion: string;
    readonly gates: readonly GateResult[];
    readonly ok: boolean;
}

/**
 * The shared hostile-input corpus for gate C6.
 *
 * Every value here is something a caller can produce with valid code and bad
 * data, so R4 makes each one a *result*, not a throw. The set is deliberately
 * weighted toward values that break serialization and hashing rather than
 * values that break rendering: the first `./ops` adapter shipped an eager
 * `hashValue(input)` outside the harness guard, and `undefined`, a cycle and a
 * `Date` were exactly what exposed it.
 */
declare const HOSTILE_INPUTS: readonly unknown[];

/**
 * Gate implementations for C1–C18 (OC-1 §7).
 *
 * Each gate takes the loaded `./ops` namespace plus the package's conformance
 * manifest and returns a `GateResult`. Gates never throw for a conformance
 * failure — a thrown gate is a bug in the kit, the same distinction R4 draws for
 * operations.
 */

/**
 * Build the committed surface record for a package.
 *
 * Deliberately the export *names* rather than full api-extractor output: R38's
 * purpose is that a surface change cannot land without an explicit decision, and
 * a diffable name set delivers that today without adding a toolchain to every
 * package. Signatures can be layered in later without changing the gate.
 */
declare function buildApiReport(manifest: ConformanceManifest): Promise<string>;

type ConformanceFixtureSeed = Omit<ConformanceFixture, "operation" | "kind"> & Partial<Pick<ConformanceFixture, "operation" | "kind">>;
/**
 * Complete the initial-GA operation corpus without weakening its executable
 * nature. Existing package-specific cases remain the nominal/loss evidence;
 * missing hostile and lower-boundary cases are real calls using a malformed
 * object and `null`, respectively. Both must return a typed failure.
 */
declare function completeFixtureCoverage(descriptorModule: string, seeds: readonly ConformanceFixtureSeed[]): Promise<readonly ConformanceFixture[]>;

/**
 * `@runstamp/contract/verify` — the OC-1 conformance kit (§7).
 *
 * `pnpm contract:verify` runs this against every package that ships an `./ops`
 * surface, and CI blocks on the result. It is published rather than kept as a
 * repo script on purpose: every catalog extension has to be able to prove its own
 * compliance without this monorepo, which is what "every expansion item must be
 * born OC-1 compliant" requires.
 *
 * The kit imports the package under test dynamically, so the contract keeps its
 * normative zero-dependency, no-engine-imports guarantee.
 */

/**
 * Run C1–C18 against one package.
 *
 * Never throws for a conformance failure — the report *is* the outcome. A thrown
 * error means the kit could not load the surface at all, which is reported as a
 * failure of every gate rather than an exception, so a broken build shows up as
 * red gates instead of a stack trace.
 */
declare function verifyPackage(manifest: ConformanceManifest): Promise<VerifyReport>;
/** Render a report for a terminal. Returned rather than printed, so callers compose. */
declare function formatReport(report: VerifyReport): string;
/**
 * Convenience for packages that want the gates inside their own vitest run.
 * Returns one `[name, result]` pair per gate so a suite can assert per gate and
 * report them individually rather than as one opaque boolean.
 */
declare function gateCases(report: VerifyReport): readonly (readonly [string, GateResult])[];
/** Narrow a fixture list to those a given gate will actually exercise. */
declare function lossyFixtures(manifest: ConformanceManifest): readonly ConformanceFixture[];

export { type ConformanceFixture, type ConformanceFixtureSeed, type ConformanceManifest, type ExpectedLoss, GATE_IDS, GATE_TITLES, type GateId, type GateResult, type GateStatus, HOSTILE_INPUTS, type VerifyReport, buildApiReport, completeFixtureCoverage, formatReport, gateCases, lossyFixtures, verifyPackage };
