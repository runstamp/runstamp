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

import type { ErrorCode } from "./types.js";

/** A required argument was missing or malformed at the API boundary. */
export const CONTRACT_VIOLATION = "common/CONTRACT_VIOLATION" as const;
/** Input failed schema validation. */
export const SCHEMA_REJECTED = "common/SCHEMA_REJECTED" as const;
/** A declared resource limit was exceeded. */
export const RESOURCE_LIMIT_EXCEEDED = "common/RESOURCE_LIMIT_EXCEEDED" as const;
/** The caller's AbortSignal fired. */
export const OPERATION_CANCELLED = "common/OPERATION_CANCELLED" as const;
/** The operation exceeded its time budget. */
export const OPERATION_TIMEOUT = "common/OPERATION_TIMEOUT" as const;
/** Two supplied options cannot be combined. */
export const OPTIONS_CONFLICT = "common/OPTIONS_CONFLICT" as const;
/** The input uses a feature this operation does not support. */
export const UNSUPPORTED_FEATURE = "common/UNSUPPORTED_FEATURE" as const;
/** The input's format version is outside the supported range. */
export const UNSUPPORTED_VERSION = "common/UNSUPPORTED_VERSION" as const;
/** The input bytes are damaged or not the claimed format. */
export const INPUT_CORRUPT = "common/INPUT_CORRUPT" as const;
/** The input is encrypted and no key was supplied. */
export const INPUT_ENCRYPTED = "common/INPUT_ENCRYPTED" as const;
/** A referenced asset was refused by the configured policy. */
export const ASSET_REJECTED = "common/ASSET_REJECTED" as const;
/** A referenced asset passed policy but could not be loaded or decoded. */
export const ASSET_FETCH_FAILED = "common/ASSET_FETCH_FAILED" as const;
/** Deterministic output was requested but cannot be produced here. */
export const DETERMINISM_UNAVAILABLE = "common/DETERMINISM_UNAVAILABLE" as const;
/** A declared operation exists but has no implementation on this path. */
export const NOT_IMPLEMENTED = "common/NOT_IMPLEMENTED" as const;

export const COMMON_ERROR_CODES: readonly ErrorCode[] = [
  CONTRACT_VIOLATION,
  SCHEMA_REJECTED,
  RESOURCE_LIMIT_EXCEEDED,
  OPERATION_CANCELLED,
  OPERATION_TIMEOUT,
  OPTIONS_CONFLICT,
  UNSUPPORTED_FEATURE,
  UNSUPPORTED_VERSION,
  INPUT_CORRUPT,
  INPUT_ENCRYPTED,
  ASSET_REJECTED,
  ASSET_FETCH_FAILED,
  DETERMINISM_UNAVAILABLE,
  NOT_IMPLEMENTED,
] as const;

/** True when `code` is one of the normative `common/*` codes. */
export function isCommonErrorCode(code: string): code is ErrorCode {
  return (COMMON_ERROR_CODES as readonly string[]).includes(code);
}
