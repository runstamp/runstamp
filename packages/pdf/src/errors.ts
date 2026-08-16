/**
 * Structured errors for @runstamp/pdf.
 *
 * Every error thrown by the engine that isn't a license-tier issue
 * (RunstampFeatureError lives in @runstamp/license) carries a stable
 * `code` so callers can branch programmatically without string-matching
 * messages. Messages may change between versions; codes will not.
 *
 * New codes are added when a new throw site is introduced. Don't add
 * codes speculatively — every code in the union has a real emit site.
 */

export type PdfErrorCode =
  /** Document failed Zod schema validation. Default behavior; opt out via options.relaxed. */
  | "SCHEMA_REJECTED"
  /** A layout cannot make forward progress within the requested page metrics. */
  | "LAYOUT_IMPOSSIBLE"
  /** Structured page margins leave no positive printable content area. */
  | "PAGE_MARGINS_INVALID"
  /** Container nesting exceeded the engine's documented safety cap. */
  | "LAYOUT_RECURSION_LIMIT"
  /** Two options requested that cannot be combined (e.g. signature + linearize, encryption + PDF/A). */
  | "OPTIONS_CONFLICT"
  /** A PDF/A conformance constraint was violated (non-embedded font, external URI, non-RGB JPEG, etc.). */
  | "PDFA_VIOLATION"
  /** A binary source was rejected by the configured asset loading policy. */
  | "ASSET_SOURCE_REJECTED"
  /** A binary source matched policy but could not be loaded or decoded. */
  | "ASSET_SOURCE_FAILED";

export interface PdfErrorDetails {
  [key: string]: unknown;
}

export class PdfError extends Error {
  readonly code: PdfErrorCode;
  readonly details?: PdfErrorDetails;

  constructor(
    code: PdfErrorCode,
    message: string,
    details?: PdfErrorDetails,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "PdfError";
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    // Maintain a clean prototype chain when the class is downleveled.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isPdfError(value: unknown): value is PdfError {
  return value instanceof PdfError;
}
