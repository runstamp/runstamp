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

import { PaperError, isPaperError } from "./errors.js";
import type { ErrorIssue } from "./errors.js";
import { lookupLegacyCode } from "./legacy-codes.js";
import type { LegacyCodeMapping, LegacyErrorModel } from "./legacy-codes.js";
import type { ErrorCode, ErrorDomain, ErrorPhase } from "./types.js";
import { ERROR_DOMAINS } from "./types.js";

/** Shape shared by every legacy error we know how to translate. */
interface LegacyErrorLike {
  readonly name?: unknown;
  readonly code?: unknown;
  readonly message?: unknown;
  /** `PaperError` (core) and `RunstampFeatureError`. */
  readonly remediation?: unknown;
  /** `DOCXError`. */
  readonly recovery?: unknown;
  /** `DOCXError`. */
  readonly context?: unknown;
  /** `PdfError`. */
  readonly details?: unknown;
  /** `PaperError` (core). */
  readonly issues?: unknown;
  readonly phase?: unknown;
}

export interface ToPaperErrorOptions {
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

const NAME_TO_MODEL: Readonly<Record<string, LegacyErrorModel>> = {
  PaperError: "core",
  PdfError: "pdf",
  DOCXError: "docx",
  RunstampFeatureError: "license",
  // The spreadsheet engine keys on class name; see XLSX_LEGACY_CODES.
  SpreadsheetValidationError: "xlsx",
  SpreadsheetTemplateParseError: "xlsx",
  SpreadsheetTemplateAssemblyError: "xlsx",
};

const DOMAIN_TO_MODEL: Readonly<Partial<Record<ErrorDomain, LegacyErrorModel>>> = {
  pptx: "core",
  pdf: "pdf",
  docx: "docx",
  license: "license",
  xlsx: "xlsx",
};

const FALLBACK_REMEDIATION =
  "This error was not recognized by the contract's legacy mapping. Inspect details.legacyCode and the message, and report it so a mapping can be added.";

function isRecord(value: unknown): value is LegacyErrorLike {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Convert legacy issues into OC-1 {@link ErrorIssue}s.
 *
 * Core's `PaperErrorIssue` carries positional extras (`slideIndex`, `blockIndex`,
 * `primitive`, `actual`, `minimum`) that OC-1 expresses through `locator`. Rather
 * than drop them before locators exist on that path, they are preserved verbatim
 * under `details` on the issue's `path`-addressed entry.
 */
function normalizeIssues(value: unknown): readonly ErrorIssue[] {
  if (!Array.isArray(value)) return [];
  const issues: ErrorIssue[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record === undefined) continue;
    const path = asString(record.path) ?? "";
    const message = asString(record.message) ?? "";
    if (message === "") continue;
    issues.push({
      path,
      message,
      ...(asString(record.expected) !== undefined ? { expected: asString(record.expected)! } : {}),
      ...(asString(record.received) !== undefined ? { received: asString(record.received)! } : {}),
      ...(asString(record.remediation) !== undefined
        ? { remediation: asString(record.remediation)! }
        : {}),
    });
  }
  return issues;
}

function resolveModel(error: LegacyErrorLike, options?: ToPaperErrorOptions): LegacyErrorModel | undefined {
  if (options?.model !== undefined) return options.model;
  const name = asString(error.name);
  if (name !== undefined && name in NAME_TO_MODEL) return NAME_TO_MODEL[name];
  if (options?.domain !== undefined) return DOMAIN_TO_MODEL[options.domain];
  return undefined;
}

/**
 * True when `code` is already namespaced against a known domain — i.e. the error
 * has already been through this translation, or was born OC-1 compliant.
 */
function isNamespacedCode(code: string): code is ErrorCode {
  const slash = code.indexOf("/");
  if (slash <= 0) return false;
  return (ERROR_DOMAINS as readonly string[]).includes(code.slice(0, slash));
}

/**
 * Normalize any thrown value into an OC-1 {@link PaperError}.
 *
 * Already-compliant `PaperError`s pass through untouched, so this is safe to
 * apply at every boundary without double-translating.
 */
export function toPaperError(value: unknown, options?: ToPaperErrorOptions): PaperError {
  // Already OC-1: a PaperError constructed by this package with a namespaced code.
  if (isPaperError(value) && isNamespacedCode(value.code)) return value;

  const domain = options?.domain ?? "common";

  if (!isRecord(value)) {
    return new PaperError({
      code: `${domain}/UNKNOWN_THROWN_VALUE` as ErrorCode,
      phase: options?.phase ?? "rendering",
      message: `A non-error value was thrown: ${String(value)}`,
      remediation:
        "An engine threw a non-Error value. This is a defect; report it with the input that triggered it.",
      details: { thrown: String(value) },
    });
  }

  const model = resolveModel(value, options);
  // Most legacy models carry a `code` field. The spreadsheet engine predates
  // that convention and distinguishes its errors purely by class, so fall back
  // to the constructor name — but only when the model's table actually declares
  // it, so a plain `Error` never becomes `xlsx/Error`.
  const explicitCode = asString(value.code);
  const namedCode = asString(value.name);
  const mappedByName =
    explicitCode === undefined && model !== undefined && namedCode !== undefined
      ? lookupLegacyCode(model, namedCode)
      : undefined;
  const legacyCode = explicitCode ?? (mappedByName !== undefined ? namedCode : undefined);
  const mapping: LegacyCodeMapping | undefined =
    mappedByName ??
    (model !== undefined && legacyCode !== undefined ? lookupLegacyCode(model, legacyCode) : undefined);

  const message = asString(value.message) ?? "An unknown error occurred.";

  // `remediation` (core/license) and `recovery` (docx) are the same concept under
  // two names; prefer whatever the error itself carried over the table default.
  const carried = asString(value.remediation) ?? asString(value.recovery);
  const remediation = carried ?? mapping?.remediation ?? FALLBACK_REMEDIATION;

  // `details` (pdf) and `context` (docx) are likewise the same bag under two names.
  const carriedDetails = asRecord(value.details) ?? asRecord(value.context) ?? {};
  const details: Record<string, unknown> = { ...carriedDetails };
  if (legacyCode !== undefined) details.legacyCode = legacyCode;
  if (model !== undefined) details.legacyModel = model;

  let code: ErrorCode;
  if (mapping !== undefined) {
    code = mapping.contractCode;
  } else if (legacyCode !== undefined && isNamespacedCode(legacyCode)) {
    code = legacyCode;
  } else if (legacyCode !== undefined) {
    code = `${domain}/${legacyCode}` as ErrorCode;
  } else {
    code = `${domain}/UNMAPPED_ERROR` as ErrorCode;
  }

  const phase =
    mapping?.phase ?? (asString(value.phase) as ErrorPhase | undefined) ?? options?.phase ?? "rendering";

  const issues = normalizeIssues(value.issues);

  return new PaperError({
    code,
    phase,
    message,
    remediation,
    issues,
    retryable: mapping?.retryable ?? false,
    details,
    cause: value,
  });
}
