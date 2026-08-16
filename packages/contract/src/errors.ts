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

import type { ErrorCode, ErrorDomain, ErrorPhase } from "./types.js";
// Type-only import: erased at runtime, so locator.ts may import this module back
// without creating a cycle.
import type { Locator } from "./locator.js";

/** One structured problem attached to a {@link PaperError}. */
export interface ErrorIssue {
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
export interface PaperErrorJSON {
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

export interface PaperErrorInit {
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

export class PaperError extends Error {
  readonly code: ErrorCode;
  readonly phase: ErrorPhase;
  readonly remediation: string;
  readonly issues: readonly ErrorIssue[];
  readonly retryable: boolean;
  // `declare` suppresses the class-field definition. Under `useDefineForClassFields`
  // (implied by target ES2022) a plain optional field is materialized as
  // `locator: undefined`, so `"locator" in error` would be true even when absent,
  // leaking `undefined` keys across the JSON boundary.
  declare readonly locator?: Locator;
  declare readonly details?: Readonly<Record<string, unknown>>;

  constructor(init: PaperErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = "PaperError";
    this.code = init.code;
    this.phase = init.phase;
    this.remediation = init.remediation;
    this.issues = init.issues ?? [];
    this.retryable = init.retryable ?? false;
    if (init.locator !== undefined) this.locator = init.locator;
    if (init.details !== undefined) this.details = init.details;
    // Keep a correct prototype chain when this class is downleveled, matching the
    // existing pattern in packages/json-to-pdf/src/errors.ts.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** The domain segment of {@link code}. */
  get domain(): ErrorDomain {
    return this.code.slice(0, this.code.indexOf("/")) as ErrorDomain;
  }

  toJSON(): PaperErrorJSON {
    const json: {
      -readonly [K in keyof PaperErrorJSON]: PaperErrorJSON[K];
    } = {
      name: "PaperError",
      code: this.code,
      phase: this.phase,
      message: this.message,
      remediation: this.remediation,
      issues: this.issues,
      retryable: this.retryable,
    };
    if (this.locator !== undefined) json.locator = this.locator;
    if (this.details !== undefined) json.details = this.details;
    return json;
  }
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
export function isPaperError(value: unknown): value is PaperError {
  if (value instanceof PaperError) return true;
  if (!(value instanceof Error) || value.name !== "PaperError") return false;
  const candidate = value as Partial<PaperError>;
  return typeof candidate.code === "string" && typeof candidate.remediation === "string";
}

/**
 * Rebuild a {@link PaperError} from its wire form.
 *
 * `stack` and `cause` are not carried across the boundary; every other field
 * round-trips exactly (OC-1 R13).
 */
export function paperErrorFromJSON(json: PaperErrorJSON): PaperError {
  return new PaperError({
    code: json.code,
    phase: json.phase,
    message: json.message,
    remediation: json.remediation,
    issues: json.issues ?? [],
    retryable: json.retryable ?? false,
    ...(json.locator !== undefined ? { locator: json.locator } : {}),
    ...(json.details !== undefined ? { details: json.details } : {}),
  });
}

/**
 * The contract's own violation error: a required argument was missing, an
 * argument had the wrong type at the boundary, or an internal invariant broke.
 *
 * Per OC-1 §3.3.1 this is one of the few conditions that is *thrown* rather than
 * returned, because a caller could not have produced it with valid code.
 */
export function contractViolation(
  message: string,
  details?: Readonly<Record<string, unknown>>,
): PaperError {
  return new PaperError({
    code: "common/CONTRACT_VIOLATION",
    phase: "input",
    message,
    remediation:
      "This indicates a programming error rather than a data problem. Check the arguments passed to the operation against its documented signature.",
    ...(details !== undefined ? { details } : {}),
  });
}
