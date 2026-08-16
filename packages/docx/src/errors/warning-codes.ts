/**
 * Central registry of public-facing warning / issue codes.
 *
 * Every code that surfaces to consumers through `DocxWarning.code`,
 * `DocxInputWarning.code`, or the public `ValidationIssue.code`
 * (from `validateDocxDocument()`) must be declared here.
 *
 * Not covered by this registry: subsystems that surface their own typed
 * code streams (accessibility `DocxAccessibilityViolationCode`, internal
 * `vlt-validator` issues, internal `DOCXWarningCode` factory codes).
 * Those have their own enums in their own modules — isolation by design.
 *
 * Category prefixes (informational — not enforced by the type system):
 *   DOCX_RELAXED_*      — legacy-shape coercions (relaxed-input.ts)
 *   DOCX_VALIDATE_*     — validateDocxDocument() issues
 *   DOCX_SERIALIZER_*   — emitted by the native OOXML serializer
 *   DOCX_HTML_*         — HTML adapter diagnostics
 *   DOCX_PDF_*          — PDF bridge diagnostics
 *   DOCX_HYDRATE_*      — template hydration diagnostics
 */

export const WARNING_CODES = [
  // -- Relaxed-input coercions --------------------------------------------
  "DOCX_RELAXED_THEME_STRING",
  "DOCX_RELAXED_CODE_BLOCK",
  "DOCX_RELAXED_MARGIN_TWIPS",
  "DOCX_RELAXED_PAGE_NUMBERS",
  "DOCX_RELAXED_META_KEY",
  "DOCX_RELAXED_CHART_POINTS",
  "DOCX_RELAXED_KIND_INJECTED",

  // -- validateDocxDocument() issues --------------------------------------
  "DOCX_VALIDATE_SCHEMA",
  "DOCX_VALIDATE_IMAGE_NO_SRC",
  "DOCX_VALIDATE_TABLE_EMPTY",
  "DOCX_VALIDATE_CHART_NO_DATA",
  "DOCX_VALIDATE_HEADING_EMPTY",

  // -- Serializer diagnostics ---------------------------------------------
  "DOCX_SERIALIZER_WARNING",
  "DOCX_STRICT_VALIDATOR_WARNING",

  // -- HTML adapter -------------------------------------------------------
  "DOCX_HTML_CONVERSION_WARNING",

  // -- PDF bridge ---------------------------------------------------------
  "DOCX_PDF_BRIDGE_FALLBACK",

  // -- Template hydration -------------------------------------------------
  "DOCX_HYDRATE_UNFILLED_PLACEHOLDER",
  "DOCX_HYDRATE_SPLIT_PLACEHOLDER",
] as const;

export type DocxWarningCode = (typeof WARNING_CODES)[number];

const WARNING_CODE_SET: ReadonlySet<string> = new Set(WARNING_CODES);

/**
 * Legacy → canonical remap. Keeps older ad-hoc codes accepted at runtime
 * while migrating call sites. Every entry here is a promise to eventually
 * delete the legacy code after consumers upgrade.
 */
const LEGACY_CODE_REMAP: Readonly<Record<string, DocxWarningCode>> = Object.freeze({
  SCHEMA_VALIDATION: "DOCX_VALIDATE_SCHEMA",
  IMAGE_NO_SRC: "DOCX_VALIDATE_IMAGE_NO_SRC",
  TABLE_EMPTY: "DOCX_VALIDATE_TABLE_EMPTY",
  CHART_NO_DATA: "DOCX_VALIDATE_CHART_NO_DATA",
  HEADING_EMPTY: "DOCX_VALIDATE_HEADING_EMPTY",
  SERIALIZER_WARNING: "DOCX_SERIALIZER_WARNING",
  HTML_CONVERSION_WARNING: "DOCX_HTML_CONVERSION_WARNING",
  PDF_BRIDGE_FALLBACK: "DOCX_PDF_BRIDGE_FALLBACK",
});

export function isDocxWarningCode(value: string): value is DocxWarningCode {
  return WARNING_CODE_SET.has(value);
}

/**
 * Normalize a warning code: canonical codes pass through; known legacy
 * strings are remapped; unknown codes throw (internal bug — a caller
 * added a code without registering it).
 */
export function resolveDocxWarningCode(code: string): DocxWarningCode {
  if (isDocxWarningCode(code)) {
    return code;
  }
  const remapped = LEGACY_CODE_REMAP[code];
  if (remapped) {
    return remapped;
  }
  throw new Error(
    `[docx] unknown warning code "${code}". ` +
    `Register it in src/errors/warning-codes.ts before emitting.`,
  );
}
