/**
 * Legacy error-code tables — the OC-1 Phase 1 migration aid.
 *
 * The platform shipped four error models with 71 codes between them, in three
 * mutually incompatible shapes. This module maps every one of them onto a
 * namespaced {@link ErrorCode}, supplies the `phase` and `remediation` the legacy
 * models lacked, and records the original code so nothing is lost.
 *
 * Two genuine collisions are resolved here:
 *
 * - `RESOURCE_LIMIT_EXCEEDED` was emitted by both `PaperError` (core) and
 *   `DOCXError`. Both mean the same thing, so both map to
 *   `common/RESOURCE_LIMIT_EXCEEDED` — and because it is now a *common* code, a
 *   consumer can finally branch on it portably.
 * - `FEATURE_REQUIRES_UPGRADE` was emitted by both `PaperError` and
 *   `RunstampFeatureError`. Both map to `license/FEATURE_REQUIRES_UPGRADE`.
 *
 * Mapping rule: a legacy code maps to `common/*` **only when it is an exact
 * synonym** of a normative common code. Otherwise it keeps its meaning under its
 * domain prefix, so no semantic detail is flattened. The original string is always
 * preserved at `details.legacyCode`.
 *
 * @remarks This module exists to retire the legacy surfaces and is removed with
 * them at the next major. New code should never consult it.
 */

import type { ErrorCode, ErrorPhase } from "./types.js";

export interface LegacyCodeMapping {
  readonly contractCode: ErrorCode;
  readonly phase: ErrorPhase;
  /** Supplied here for models that had no remediation concept at all (PdfError). */
  readonly remediation: string;
  readonly retryable?: boolean;
}

/** `PaperError` from `packages/core` (`@runstamp/pptx`). 27 codes. */
export const CORE_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>> = {
  VALIDATION_FAILED: {
    contractCode: "common/SCHEMA_REJECTED",
    phase: "validation",
    remediation: "Correct the reported issues in the document and retry.",
  },
  AGENT_INPUT_INVALID: {
    contractCode: "pptx/AGENT_INPUT_INVALID",
    phase: "validation",
    remediation: "Correct the agent input against the published agent schema and retry.",
  },
  AGENT_LAYOUT_VALIDATION_FAILED: {
    contractCode: "pptx/AGENT_LAYOUT_VALIDATION_FAILED",
    phase: "layout",
    remediation: "Adjust the offending region's size or content so it satisfies the layout rules.",
  },
  RESOURCE_LIMIT_EXCEEDED: {
    contractCode: "common/RESOURCE_LIMIT_EXCEEDED",
    phase: "rendering",
    remediation: "Reduce document complexity or raise the corresponding value in options.limits.",
  },
  RENDER_CANCELLED: {
    contractCode: "common/OPERATION_CANCELLED",
    phase: "rendering",
    remediation: "The caller's AbortSignal fired. Retry without aborting to obtain output.",
    retryable: true,
  },
  WASM_INIT_FAILED: {
    contractCode: "pptx/WASM_INIT_FAILED",
    phase: "compilation",
    remediation: "Verify the WASM asset is reachable and the host permits WebAssembly compilation.",
  },
  FONT_NOT_FOUND: {
    contractCode: "pptx/FONT_NOT_FOUND",
    phase: "font",
    remediation: "Register the font with the engine or choose a font that is already available.",
  },
  PPTX_FONT_EMBEDDING_UNAVAILABLE: {
    contractCode: "pptx/FONT_EMBEDDING_UNAVAILABLE",
    phase: "font",
    remediation:
      "Supply a font whose embedding permissions allow it, or disable font embedding for this render.",
  },
  MEDIA_FETCH_FAILED: {
    contractCode: "common/ASSET_FETCH_FAILED",
    phase: "media",
    remediation: "Verify the media URL is reachable, or embed the asset as a data URI.",
    retryable: true,
  },
  MEDIA_CORRUPT: {
    contractCode: "pptx/MEDIA_CORRUPT",
    phase: "media",
    remediation: "Replace the media asset; its bytes could not be decoded as the declared type.",
  },
  RENDER_TIMEOUT: {
    contractCode: "common/OPERATION_TIMEOUT",
    phase: "rendering",
    remediation: "Increase options.timeoutMs or reduce document complexity.",
    retryable: true,
  },
  QUEUE_TIMEOUT: {
    contractCode: "common/OPERATION_TIMEOUT",
    phase: "rendering",
    remediation: "The render queue did not free a slot in time. Retry, or raise the queue timeout.",
    retryable: true,
  },
  QUEUE_FULL: {
    contractCode: "pptx/QUEUE_FULL",
    phase: "rendering",
    remediation: "Retry after in-flight renders drain, or raise the queue capacity.",
    retryable: true,
  },
  COMPATIBILITY_CONTRACT_VIOLATION: {
    contractCode: "pptx/COMPATIBILITY_CONTRACT_VIOLATION",
    phase: "serialization",
    remediation: "Remove the feature that breaks the declared compatibility contract.",
  },
  PPTX_VISUAL_FALLBACK_MISSING: {
    contractCode: "pptx/VISUAL_FALLBACK_MISSING",
    phase: "rendering",
    remediation: "Provide a visual fallback for the element, or remove the element.",
  },
  PPTX_CHART_FALLBACK_MISSING: {
    contractCode: "pptx/CHART_FALLBACK_MISSING",
    phase: "chart",
    remediation: "Provide a chart fallback image, or use a natively supported chart type.",
  },
  STRUCTURAL_VALIDATION_FAILED: {
    contractCode: "pptx/STRUCTURAL_VALIDATION_FAILED",
    phase: "validation",
    remediation: "Inspect the reported structural issues in the generated package and retry.",
  },
  DESKTOP_VALIDATION_FAILED: {
    contractCode: "pptx/DESKTOP_VALIDATION_FAILED",
    phase: "validation",
    remediation: "The reference desktop application rejected the output. Inspect the attached report.",
  },
  VALIDATION_BACKEND_UNAVAILABLE: {
    contractCode: "pptx/VALIDATION_BACKEND_UNAVAILABLE",
    phase: "validation",
    remediation: "Start the validation backend, or run without desktop validation enabled.",
    retryable: true,
  },
  CANVAS_UNAVAILABLE: {
    contractCode: "pptx/CANVAS_UNAVAILABLE",
    phase: "rendering",
    remediation: "Install the optional canvas dependency, or disable features that rasterize.",
  },
  INVALID_SLIDE_INDEX: {
    contractCode: "pptx/INVALID_SLIDE_INDEX",
    phase: "input",
    remediation: "Pass a slide index within the deck's bounds.",
  },
  FEATURE_REQUIRES_UPGRADE: {
    contractCode: "license/FEATURE_REQUIRES_UPGRADE",
    phase: "policy",
    remediation: "Provide a valid Runstamp Pro license for this feature, or remove its use.",
  },
  REGION_TOO_SMALL: {
    contractCode: "pptx/REGION_TOO_SMALL",
    phase: "layout",
    remediation: "Increase the region's colSpan/rowSpan to at least the reported minimum.",
  },
  CONTENT_PAGINATED: {
    contractCode: "pptx/CONTENT_PAGINATED",
    phase: "layout",
    remediation: "Reduce content or enlarge the region to keep it on a single slide.",
  },
  CONTENT_CLIPPED: {
    contractCode: "pptx/CONTENT_CLIPPED",
    phase: "layout",
    remediation: "Reduce content or enlarge the region so nothing is clipped.",
  },
  REGION_COLLISION: {
    contractCode: "pptx/REGION_COLLISION",
    phase: "layout",
    remediation: "Adjust the composition so the overlapping regions no longer intersect.",
  },
  LOCKED_TOKEN_VIOLATION: {
    contractCode: "pptx/LOCKED_TOKEN_VIOLATION",
    phase: "template",
    remediation: "Remove the override of a locked brand token, or unlock it in the brand pack.",
  },
};

/** `PdfError` from `packages/json-to-pdf`. 8 codes, none of which had a remediation. */
export const PDF_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>> = {
  SCHEMA_REJECTED: {
    contractCode: "common/SCHEMA_REJECTED",
    phase: "validation",
    remediation: "Correct the reported schema issues, or pass options.relaxed to opt out.",
  },
  LAYOUT_IMPOSSIBLE: {
    contractCode: "pdf/LAYOUT_IMPOSSIBLE",
    phase: "layout",
    remediation: "Enlarge the page, reduce margins, or shrink the content that cannot fit.",
  },
  PAGE_MARGINS_INVALID: {
    contractCode: "pdf/PAGE_MARGINS_INVALID",
    phase: "layout",
    remediation: "Reduce the page margins so a positive printable area remains.",
  },
  LAYOUT_RECURSION_LIMIT: {
    contractCode: "pdf/LAYOUT_RECURSION_LIMIT",
    phase: "layout",
    remediation: "Flatten the container nesting below the documented depth cap.",
  },
  OPTIONS_CONFLICT: {
    contractCode: "common/OPTIONS_CONFLICT",
    phase: "input",
    remediation: "Remove one of the two conflicting options; they cannot be combined.",
  },
  PDFA_VIOLATION: {
    contractCode: "pdf/PDFA_VIOLATION",
    phase: "serialization",
    remediation: "Embed the offending font, remove the external URI, or disable PDF/A conformance.",
  },
  ASSET_SOURCE_REJECTED: {
    contractCode: "common/ASSET_REJECTED",
    phase: "media",
    remediation: "Allow the asset source in the asset policy, or inline the asset as a data URI.",
  },
  ASSET_SOURCE_FAILED: {
    contractCode: "common/ASSET_FETCH_FAILED",
    phase: "media",
    remediation: "Verify the asset is reachable and decodable as its declared type.",
    retryable: true,
  },
};

/**
 * `DOCXError` from `packages/docx`. 33 codes.
 *
 * Keyed by the enum's *value*, which is what reaches a consumer's `err.code`.
 * Five values were missing the `DOCX_` prefix their siblings carry
 * (`TABLE_GRID_MISMATCH`, `INVALID_COLOR`, `INVALID_FONT_SIZE`,
 * `RESOURCE_LIMIT_EXCEEDED`, `IMAGE_SIZE_EXCEEDED`); namespacing removes the
 * inconsistency without changing the legacy strings themselves.
 */
export const DOCX_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>> = {
  DOCX_DOC_INVALID: {
    contractCode: "docx/DOC_INVALID",
    phase: "validation",
    remediation: "Correct the document structure against the DOCX input schema.",
  },
  DOCX_DOC_NO_PAGES: {
    contractCode: "docx/DOC_NO_PAGES",
    phase: "validation",
    remediation: "Add at least one page to the document.",
  },
  DOCX_DOC_NO_DIMENSIONS: {
    contractCode: "docx/DOC_NO_DIMENSIONS",
    phase: "validation",
    remediation: "Declare page width and height on the document.",
  },
  DOCX_DOC_INVALID_DIMENSIONS: {
    contractCode: "docx/DOC_INVALID_DIMENSIONS",
    phase: "validation",
    remediation: "Use positive, finite page dimensions.",
  },
  DOCX_ELEMENT_UNKNOWN: {
    contractCode: "docx/ELEMENT_UNKNOWN",
    phase: "compilation",
    remediation: "Remove the unrecognized element, or replace it with a supported one.",
  },
  DOCX_ELEMENT_INVALID: {
    contractCode: "docx/ELEMENT_INVALID",
    phase: "compilation",
    remediation: "Correct the element's properties against its documented shape.",
  },
  DOCX_ELEMENT_MISSING_CONTENT: {
    contractCode: "docx/ELEMENT_MISSING_CONTENT",
    phase: "compilation",
    remediation: "Give the element content, or remove it.",
  },
  DOCX_ELEMENT_NOT_IMPLEMENTED: {
    contractCode: "docx/ELEMENT_NOT_IMPLEMENTED",
    phase: "compilation",
    remediation: "Replace the element with a supported equivalent; it is not yet implemented.",
  },
  DOCX_IMAGE_FETCH_FAILED: {
    contractCode: "common/ASSET_FETCH_FAILED",
    phase: "media",
    remediation: "Verify the image URL is reachable, or embed the image as a data URI.",
    retryable: true,
  },
  DOCX_IMAGE_TIMEOUT: {
    contractCode: "docx/IMAGE_TIMEOUT",
    phase: "media",
    remediation: "Increase the image fetch timeout, or embed the image as a data URI.",
    retryable: true,
  },
  DOCX_IMAGE_TOO_LARGE: {
    contractCode: "docx/IMAGE_TOO_LARGE",
    phase: "media",
    remediation: "Downscale the image, or raise the image size limit in options.limits.",
  },
  DOCX_IMAGE_INVALID_FORMAT: {
    contractCode: "docx/IMAGE_INVALID_FORMAT",
    phase: "media",
    remediation: "Convert the image to a supported format (PNG, JPEG, GIF, BMP).",
  },
  DOCX_IMAGE_DECODE_FAILED: {
    contractCode: "docx/IMAGE_DECODE_FAILED",
    phase: "media",
    remediation: "Replace the image; its bytes could not be decoded.",
  },
  DOCX_IMAGE_CONVERSION_FAILED: {
    contractCode: "docx/IMAGE_CONVERSION_FAILED",
    phase: "media",
    remediation: "Supply the image in a format that does not require conversion.",
  },
  DOCX_CHART_NO_DATA: {
    contractCode: "docx/CHART_NO_DATA",
    phase: "chart",
    remediation: "Provide at least one data series for the chart.",
  },
  DOCX_CHART_RENDER_FAILED: {
    contractCode: "docx/CHART_RENDER_FAILED",
    phase: "chart",
    remediation: "Simplify the chart definition, or supply a fallback image.",
  },
  DOCX_CHART_INVALID_TYPE: {
    contractCode: "docx/CHART_INVALID_TYPE",
    phase: "chart",
    remediation: "Use one of the supported chart types.",
  },
  DOCX_SHAPE_NOT_SUPPORTED: {
    contractCode: "docx/SHAPE_NOT_SUPPORTED",
    phase: "compilation",
    remediation: "Replace the shape with a supported shape, or an image.",
  },
  DOCX_SHAPE_RENDER_FAILED: {
    contractCode: "docx/SHAPE_RENDER_FAILED",
    phase: "rendering",
    remediation: "Simplify the shape definition, or replace it with an image.",
  },
  DOCX_TABLE_INVALID_STRUCTURE: {
    contractCode: "docx/TABLE_INVALID_STRUCTURE",
    phase: "compilation",
    remediation: "Ensure every row declares the same number of grid columns.",
  },
  DOCX_TABLE_CELL_MERGE_ERROR: {
    contractCode: "docx/TABLE_CELL_MERGE_ERROR",
    phase: "compilation",
    remediation: "Correct the row/column spans so merged cells do not overlap or exceed the grid.",
  },
  TABLE_GRID_MISMATCH: {
    contractCode: "docx/TABLE_GRID_MISMATCH",
    phase: "compilation",
    remediation: "Align the table's column definitions with the cells present in each row.",
  },
  DOCX_STYLE_NOT_FOUND: {
    contractCode: "docx/STYLE_NOT_FOUND",
    phase: "template",
    remediation: "Define the referenced style, or reference one that exists.",
  },
  DOCX_STYLE_INVALID: {
    contractCode: "docx/STYLE_INVALID",
    phase: "template",
    remediation: "Correct the style definition against the supported style properties.",
  },
  INVALID_COLOR: {
    contractCode: "docx/INVALID_COLOR",
    phase: "typography",
    remediation: "Use a supported color form such as a #RRGGBB hex string.",
  },
  INVALID_FONT_SIZE: {
    contractCode: "docx/INVALID_FONT_SIZE",
    phase: "typography",
    remediation: "Use a positive, finite font size within the supported range.",
  },
  RESOURCE_LIMIT_EXCEEDED: {
    contractCode: "common/RESOURCE_LIMIT_EXCEEDED",
    phase: "serialization",
    remediation: "Reduce document complexity or raise the corresponding value in options.limits.",
  },
  IMAGE_SIZE_EXCEEDED: {
    contractCode: "docx/IMAGE_SIZE_EXCEEDED",
    phase: "media",
    remediation: "Downscale the image, or raise the image size limit in options.limits.",
  },
  DOCX_DEPENDENCY_MISSING: {
    contractCode: "docx/DEPENDENCY_MISSING",
    phase: "compilation",
    remediation: "Install the optional dependency this feature requires.",
  },
  DOCX_DEPENDENCY_VERSION: {
    contractCode: "docx/DEPENDENCY_VERSION",
    phase: "compilation",
    remediation: "Upgrade the dependency to a version within the supported range.",
  },
  DOCX_INTERNAL_ERROR: {
    contractCode: "docx/INTERNAL_ERROR",
    phase: "rendering",
    remediation: "This is a defect in the engine. Report it with the input that triggered it.",
  },
  DOCX_SERIALIZATION_FAILED: {
    contractCode: "docx/SERIALIZATION_FAILED",
    phase: "serialization",
    remediation: "Inspect the reported package part; the OOXML package could not be written.",
  },
  DOCX_RENDER_ABORTED: {
    contractCode: "common/OPERATION_CANCELLED",
    phase: "rendering",
    remediation: "The caller's AbortSignal fired. Retry without aborting to obtain output.",
    retryable: true,
  },
};

/** `RunstampFeatureError` from `packages/license`. 3 codes. */
export const LICENSE_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>> = {
  FEATURE_REQUIRES_UPGRADE: {
    contractCode: "license/FEATURE_REQUIRES_UPGRADE",
    phase: "policy",
    remediation: "Provide a valid Runstamp Pro license for this feature, or remove its use.",
  },
  LICENSE_REQUIRED: {
    contractCode: "license/LICENSE_REQUIRED",
    phase: "policy",
    remediation: "Supply a Runstamp license key.",
  },
  LICENSE_INVALID: {
    contractCode: "license/LICENSE_INVALID",
    phase: "policy",
    remediation: "Supply a valid, unexpired Runstamp license key.",
  },
};

/**
 * `@runstamp/xlsx` error classes.
 *
 * The spreadsheet engine predates the shared error model and throws plain
 * `Error` subclasses keyed by class name rather than a `code` field, so the
 * class name *is* the legacy code here. Each carries an `issues` array that the
 * `./ops` adapter surfaces in `details`.
 */
export const XLSX_LEGACY_CODES: Readonly<Record<string, LegacyCodeMapping>> = {
  SpreadsheetValidationError: {
    contractCode: "common/SCHEMA_REJECTED",
    phase: "validation",
    remediation:
      "Correct the reported issues in `details.issues`; each names the path in the document that failed.",
  },
  SpreadsheetTemplateParseError: {
    contractCode: "xlsx/TEMPLATE_PARSE_FAILED",
    phase: "template",
    remediation:
      "Open the template in Excel and re-save it, or remove the unsupported part named in `details.issues`.",
  },
  SpreadsheetTemplateAssemblyError: {
    contractCode: "xlsx/TEMPLATE_ASSEMBLY_FAILED",
    phase: "template",
    remediation:
      "Check that every placeholder in the template has a matching value and that the named ranges still resolve.",
  },
};

/** Which legacy table applies to an error, selected by its originating model. */
export type LegacyErrorModel = "core" | "pdf" | "docx" | "license" | "xlsx";

export const LEGACY_CODE_TABLES: Readonly<
  Record<LegacyErrorModel, Readonly<Record<string, LegacyCodeMapping>>>
> = {
  core: CORE_LEGACY_CODES,
  pdf: PDF_LEGACY_CODES,
  docx: DOCX_LEGACY_CODES,
  license: LICENSE_LEGACY_CODES,
  xlsx: XLSX_LEGACY_CODES,
};

export function lookupLegacyCode(
  model: LegacyErrorModel,
  legacyCode: string,
): LegacyCodeMapping | undefined {
  return LEGACY_CODE_TABLES[model][legacyCode];
}
