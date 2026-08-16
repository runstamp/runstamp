/**
 * `@runstamp/contract` — the Runstamp Operation Contract (OC-1).
 *
 * One result envelope, one error model, one loss ledger, one locator, one receipt,
 * shared by every Runstamp document operation across every surface: SDK, hosted
 * API, MCP agent tools and embedded UI.
 *
 * Specification: `docs/architecture/operation-contract.md`.
 *
 * This package has **zero runtime dependencies** and must never import another
 * `@runstamp/*` package — every product package depends on it, so it cannot be
 * allowed to pull in an engine.
 */

export { CONTRACT_VERSION } from "./version.js";
export type { ContractVersion } from "./version.js";

export {
  ERROR_DOMAINS,
  LOCATOR_KINDS,
  LOSS_SEVERITY_ORDER,
  VERBS,
} from "./types.js";
export type {
  DiagnosticSeverity,
  ErrorCode,
  ErrorDomain,
  ErrorPhase,
  LocatorKind,
  LossPolicy,
  LossSeverity,
  NondeterminismSource,
  OperationName,
  SideEffects,
  Stability,
  Verb,
} from "./types.js";

export { PaperError, contractViolation, isPaperError, paperErrorFromJSON } from "./errors.js";
export type { ErrorIssue, PaperErrorInit, PaperErrorJSON } from "./errors.js";

export {
  ASSET_FETCH_FAILED,
  ASSET_REJECTED,
  COMMON_ERROR_CODES,
  CONTRACT_VIOLATION,
  DETERMINISM_UNAVAILABLE,
  INPUT_CORRUPT,
  INPUT_ENCRYPTED,
  NOT_IMPLEMENTED,
  OPERATION_CANCELLED,
  OPERATION_TIMEOUT,
  OPTIONS_CONFLICT,
  RESOURCE_LIMIT_EXCEEDED,
  SCHEMA_REJECTED,
  UNSUPPORTED_FEATURE,
  UNSUPPORTED_VERSION,
  isCommonErrorCode,
} from "./codes.js";

export { fail, isFail, isOk, ok, unwrap } from "./result.js";
export type {
  FailureParts,
  Operation,
  OperationFailure,
  OperationResult,
  OperationSuccess,
  SuccessParts,
} from "./result.js";

export { createDiagnostic } from "./diagnostics.js";
export type { Diagnostic, DiagnosticInit } from "./diagnostics.js";

export {
  compareLosses,
  createLoss,
  hasDroppedLoss,
  lossSeverityRank,
  sortLosses,
} from "./loss.js";
export type { Loss, LossInit } from "./loss.js";

export { compareLocators, formatLocator, parseLocator } from "./locator.js";
export type { Locator, LocatorRange, LocatorSegment } from "./locator.js";

export { buildReceipt } from "./receipt.js";
export type { BuildReceiptInit, EngineIdentity, Receipt, ToolVersion } from "./receipt.js";

export {
  DEFAULT_DETERMINISTIC,
  DEFAULT_LOSS_POLICY,
  isDeterministicModeEnabled,
  resetDeterministicMode,
  resolveOptions,
  setDeterministicMode,
} from "./options.js";
export type { EffectiveOptions, OperationOptions, ResourceLimits } from "./options.js";

export { MEDIA_TYPES, createArtifactBytes, requireBytes } from "./artifact.js";
export type { ArtifactBytes } from "./artifact.js";

export { canonicalJson, hashBytes, hashValue, sha256Hex } from "./canonical.js";

export { deprecate, resetDeprecationNotices } from "./deprecate.js";

export { runOperation } from "./run.js";
export type {
  OperationContext,
  OperationOutcome,
  RunOperationInit,
} from "./run.js";

export { defineOperations, isVerb, parseOperationName } from "./registry.js";
export type { JSONSchema, OperationDescriptor, QualifierBinding } from "./registry.js";

// Legacy interop — the Phase 1 migration bridge. Removed with the legacy
// surfaces at the next major; new code should not depend on it.
export { toPaperError } from "./interop.js";
export type { ToPaperErrorOptions } from "./interop.js";
export {
  CORE_LEGACY_CODES,
  DOCX_LEGACY_CODES,
  LEGACY_CODE_TABLES,
  LICENSE_LEGACY_CODES,
  PDF_LEGACY_CODES,
  XLSX_LEGACY_CODES,
  lookupLegacyCode,
} from "./legacy-codes.js";
export type { LegacyCodeMapping, LegacyErrorModel } from "./legacy-codes.js";
