/**
 * The conformance manifest (OC-1 §7).
 *
 * A package declares what it ships and what its known-lossy fixtures must
 * produce; `verifyPackage` turns that declaration into gate results. The
 * declaration is the point — a package that ships an operation without
 * conformance fixtures cannot be verified, which is what makes "adding an OC-1
 * operation without its fixtures is not possible" true rather than aspirational.
 */

import type { ErrorDomain, LossSeverity, OperationName, Verb } from "../types.js";
import type { OperationOptions } from "../options.js";

/** A loss the suite asserts must be present for a fixture (C11). */
export interface ExpectedLoss {
  /** Full contract code, e.g. `pdf/TEXT_GLYPH_MISSING`. */
  readonly code: string;
  readonly severity: LossSeverity;
  /** Exact number of occurrences, when the count itself is meaningful. */
  readonly count?: number;
}

export interface ConformanceFixture {
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
export interface CodeScanConfig {
  /** Absolute paths to engine sources that emit warning codes. */
  readonly files: readonly string[];
  /** Capturing regex source matching one emitted code per match group 1. */
  readonly pattern: string;
  /** Every code the package classifies. An emitted code outside this set fails. */
  readonly classified: readonly string[];
}

export interface SurfaceConfig {
  /** Built `.d.ts` for the `./ops` subpath. Deny-list violations are errors. */
  readonly ops?: string;
  /** Built `.d.ts` for the root entry. Violations are warnings until the next major. */
  readonly root?: string;
}

export interface ConformanceManifest {
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

export const GATE_IDS = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
  "C10",
  "C11",
  "C12",
  "C13",
  "C14",
  "C15",
  "C16",
  "C17",
  "C18",
] as const;

export type GateId = (typeof GATE_IDS)[number];

export const GATE_TITLES: Readonly<Record<GateId, string>> = {
  C1: "Signature",
  C2: "Envelope",
  C3: "Serialization",
  C4: "Errors",
  C5: "Code registry",
  C6: "No-throw",
  C7: "Determinism",
  C8: "Receipt honesty",
  C9: "Locator round-trip",
  C10: "Locator stability",
  C11: "No silent loss",
  C12: "Loss ordering",
  C13: "Export hygiene",
  C14: "Verb vocabulary",
  C15: "Cancellation",
  C16: "API report",
  C17: "Operation identity",
  C18: "Operation coverage",
};

export type GateStatus = "pass" | "fail" | "warn" | "skip";

export interface GateResult {
  readonly gate: GateId;
  readonly title: string;
  readonly status: GateStatus;
  /** One line when passing; the reason when not. */
  readonly summary: string;
  /** Specific violations, each independently actionable. */
  readonly details?: readonly string[];
}

export interface VerifyReport {
  readonly package: string;
  readonly domain: ErrorDomain;
  readonly contractVersion: string;
  readonly gates: readonly GateResult[];
  readonly ok: boolean;
}
