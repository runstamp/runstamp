// src/errors.ts — Structured error types for Runstamp

/**
 * Error phases in the PaperEngine pipeline.
 */
export type ErrorPhase =
  | "validation"
  | "compilation"
  | "layout"
  | "typography"
  | "media"
  | "chart"
  | "serialization"
  | "archive"
  | "wasm-init"
  | "font"
  | "template"
  | "rendering";

/**
 * Structured error codes for machine-parseable error handling.
 */
export type PaperErrorCode =
  | "VALIDATION_FAILED"
  | "AGENT_INPUT_INVALID"
  | "AGENT_LAYOUT_VALIDATION_FAILED"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "RENDER_CANCELLED"
  | "WASM_INIT_FAILED"
  | "FONT_NOT_FOUND"
  | "PPTX_FONT_EMBEDDING_UNAVAILABLE"
  | "MEDIA_FETCH_FAILED"
  | "MEDIA_CORRUPT"
  | "RENDER_TIMEOUT"
  | "QUEUE_TIMEOUT"
  | "QUEUE_FULL"
  | "COMPATIBILITY_CONTRACT_VIOLATION"
  | "PPTX_VISUAL_FALLBACK_MISSING"
  | "PPTX_CHART_FALLBACK_MISSING"
  | "STRUCTURAL_VALIDATION_FAILED"
  | "DESKTOP_VALIDATION_FAILED"
  | "VALIDATION_BACKEND_UNAVAILABLE"
  | "CANVAS_UNAVAILABLE"
  | "INVALID_SLIDE_INDEX"
  | "FEATURE_REQUIRES_UPGRADE"
  | "REGION_TOO_SMALL"
  | "CONTENT_PAGINATED"
  | "CONTENT_CLIPPED"
  | "REGION_COLLISION"
  | "LOCKED_TOKEN_VIOLATION";

/**
 * A single structured issue attached to a PaperError. When the error
 * originates from Zod validation, each issue becomes one entry; `path`
 * is the dotted/indexed schema path, and `remediation` is a one-sentence
 * hint for consumers (including LLM agents) on how to self-correct.
 */
export interface PaperErrorIssue {
  path: string;
  code?: string;
  message: string;
  expected?: string;
  received?: string;
  remediation?: string;
  /** Slide index (0-based) for layout/composition issues. */
  slideIndex?: number;
  /** Composition-block index within `slide.composition.blocks[]`. */
  blockIndex?: number;
  /** Composition primitive name (e.g. "metricStack", "matrixTable"). */
  primitive?: string;
  /** Actual region dimensions in the input. */
  actual?: { colSpan?: number; rowSpan?: number };
  /** Recommended minimum dimensions for the offending primitive. */
  minimum?: { colSpan?: number; rowSpan?: number };
}

/**
 * Base error class for all Runstamp errors. Provides structured fields
 * for programmatic error handling — consumers can switch on `code` or
 * `phase` instead of string-matching error messages.
 *
 * `path` and `remediation` are populated whenever the error can be traced
 * to a specific input location (Zod validation, agent compile). `issues`
 * carries the full list of validation problems when more than one applies.
 */
export class PaperError extends Error {
  readonly code: PaperErrorCode;
  readonly phase: ErrorPhase;
  readonly slideIndex?: number;
  readonly nodeId?: string;
  readonly path?: string[];
  readonly remediation?: string;
  readonly issues?: PaperErrorIssue[];

  constructor(
    message: string,
    opts: {
      code: PaperErrorCode;
      phase: ErrorPhase;
      slideIndex?: number;
      nodeId?: string;
      path?: string[];
      remediation?: string;
      issues?: PaperErrorIssue[];
      cause?: unknown;
    },
  ) {
    super(message, { cause: opts.cause });
    this.name = "PaperError";
    this.code = opts.code;
    this.phase = opts.phase;
    this.slideIndex = opts.slideIndex;
    this.nodeId = opts.nodeId;
    this.path = opts.path;
    this.remediation = opts.remediation;
    this.issues = opts.issues;
  }
}

/**
 * Thrown when a pro-only feature is used without a valid license.
 * Consumer-facing — provides the feature name and upgrade URL for
 * actionable error messages in CLI output and CI logs.
 */
export class RunstampFeatureError extends Error {
  public readonly code: "FEATURE_REQUIRES_UPGRADE" | "LICENSE_REQUIRED" | "LICENSE_INVALID";
  public readonly phase = "license";
  public readonly feature: string;
  public readonly upgradeUrl = "https://runstamp.com/pricing";
  public readonly remediation: string;
  constructor(
    message: string,
    feature?: string,
    code: "FEATURE_REQUIRES_UPGRADE" | "LICENSE_REQUIRED" | "LICENSE_INVALID" = "FEATURE_REQUIRES_UPGRADE",
  ) {
    super(message);
    this.name = "RunstampFeatureError";
    this.code = code;
    this.feature = feature ?? "unknown";
    this.remediation = `Provide a valid Runstamp Pro license for "${this.feature}" or visit ${this.upgradeUrl}.`;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, string> {
    return {
      name: this.name,
      code: this.code,
      phase: this.phase,
      message: this.message,
      feature: this.feature,
      upgradeUrl: this.upgradeUrl,
      remediation: this.remediation,
    };
  }
}

/**
 * Deprecated alias for {@link RunstampFeatureError}, kept for one release so
 * existing `instanceof` checks and imports keep working across the Runstamp
 * rename. Note that `error.name` is now `"RunstampFeatureError"` — code that
 * compares the string rather than using `instanceof` must be updated.
 *
 * @deprecated Use `RunstampFeatureError`.
 */
export const PaperJSXFeatureError = RunstampFeatureError;
