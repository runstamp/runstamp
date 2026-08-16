/**
 * Artifact payloads (OC-1 §3.9).
 *
 * Operations that produce a file return {@link ArtifactBytes}, never a bare
 * `Uint8Array`/`Buffer` (R31), so the hash and media type always travel with the
 * bytes and no caller has to re-derive them.
 */

import { hashBytes } from "./canonical.js";
import { SCHEMA_REJECTED } from "./codes.js";
import { PaperError, contractViolation } from "./errors.js";

export interface ArtifactBytes {
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
export const MEDIA_TYPES = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  html: "text/html",
} as const satisfies Record<string, string>;

export function createArtifactBytes(
  bytes: Uint8Array,
  mediaType: string,
  extension: string,
): ArtifactBytes {
  if (!(bytes instanceof Uint8Array)) {
    throw contractViolation("Artifact bytes must be a Uint8Array.", {
      received: typeof bytes,
    });
  }
  if (extension.startsWith(".")) {
    throw contractViolation(
      `Artifact extension must not include a leading dot, received "${extension}".`,
      { extension },
    );
  }
  return {
    bytes,
    mediaType,
    extension,
    byteLength: bytes.byteLength,
    hash: hashBytes(bytes),
  };
}

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
export function requireBytes(input: unknown, expected = "the document bytes"): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new PaperError({
    message: `This operation reads ${expected}, but received ${describe(input)}.`,
    code: SCHEMA_REJECTED,
    phase: "validation",
    remediation:
      "Pass the file contents as a Uint8Array, Buffer or ArrayBuffer. If you have a document object, render it first and pass the resulting bytes.",
    details: { received: describe(input) },
  });
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return `an object${value.constructor?.name === undefined ? "" : ` (${value.constructor.name})`}`;
  return `a ${typeof value}`;
}
