/**
 * Fidelity taxonomy for the `xlsx` domain (OC-1 §3.5).
 *
 * Two channels feed this. `SpreadsheetInputWarning` reports coercions applied to
 * the caller's document before rendering; `SpreadsheetRepairAction` reports what
 * the repair pipeline changed or removed from an existing workbook. Anything
 * unrecognised becomes a `degraded` loss rather than silence — R17 makes an
 * empty ledger a positive claim, so an unclassified condition must not slip
 * through it.
 *
 * The dividing line follows R15. The relaxed-input coercions rewrite a legacy
 * spelling into the modern one and produce exactly the workbook the caller
 * meant, so they are `Diagnostic`s; counting them would make `losses: []`
 * unreachable for correct input and destroy the signal the ledger carries.
 */

import { createDiagnostic, createLoss, parseLocator } from "@runstamp/contract";
import type { Diagnostic, ErrorCode, Locator, Loss, LossSeverity } from "@runstamp/contract";

/** The shape both spreadsheet warning channels reduce to. */
export interface EngineWarning {
  code: string;
  message: string;
  path?: string;
  from?: unknown;
  to?: unknown;
}

interface TaxonomyEntry {
  contractCode: ErrorCode;
  severity: LossSeverity;
  subject: string;
  avoidable: boolean;
  remediation?: string;
}

/**
 * Repair actions and render-time deviations that cost fidelity.
 *
 * The two `*_STRIPPED` entries are `dropped`, not `degraded`: the macro project
 * and the external connection are removed outright, and a workbook that silently
 * loses its macros is the exact case a regulated caller needs told about.
 */
const TAXONOMY: Readonly<Record<string, TaxonomyEntry>> = {
  XLSX_MACRO_STRIPPED: {
    contractCode: "xlsx/MACRO_STRIPPED",
    severity: "dropped",
    subject: "macro project",
    avoidable: false,
    remediation:
      "Keep the original .xlsm if the macros are required; repair cannot preserve a macro project it has to rewrite.",
  },
  XLSX_EXTERNAL_CONNECTION_STRIPPED: {
    contractCode: "xlsx/EXTERNAL_CONNECTION_STRIPPED",
    severity: "dropped",
    subject: "external data connection",
    avoidable: false,
    remediation:
      "Re-create the connection in the repaired workbook, or keep the original if the live link is required.",
  },
  XLSX_FORMULA_REF_BROKEN: {
    contractCode: "xlsx/FORMULA_REFERENCE_BROKEN",
    severity: "degraded",
    subject: "formula reference",
    avoidable: true,
    remediation: "Point the formula at a range that exists in the workbook.",
  },
  XLSX_NAMED_RANGE_DEAD_REF: {
    contractCode: "xlsx/NAMED_RANGE_DEAD",
    severity: "degraded",
    subject: "named range",
    avoidable: true,
    remediation: "Redefine or remove the named range so it resolves to a live reference.",
  },
  XLSX_HYPERLINK_TARGET_INVALID: {
    contractCode: "xlsx/HYPERLINK_TARGET_INVALID",
    severity: "degraded",
    subject: "hyperlink",
    avoidable: true,
    remediation: "Correct the hyperlink target so it is a well-formed URL or in-workbook reference.",
  },
  XLSX_MERGE_OVERLAP: {
    contractCode: "xlsx/MERGE_OVERLAP",
    severity: "degraded",
    subject: "merged range",
    avoidable: true,
    remediation: "Make the merged ranges disjoint; Excel cannot represent overlapping merges.",
  },
  XLSX_MERGE_RANGE_OUT_OF_BOUNDS: {
    contractCode: "xlsx/MERGE_OUT_OF_BOUNDS",
    severity: "degraded",
    subject: "merged range",
    avoidable: true,
    remediation: "Bring the merged range inside the sheet's used dimensions.",
  },
  XLSX_SHARED_STRING_INDEX_OOB: {
    contractCode: "xlsx/SHARED_STRING_INDEX_INVALID",
    severity: "degraded",
    subject: "cell text",
    avoidable: false,
  },
  XLSX_STYLE_INDEX_OOB: {
    contractCode: "xlsx/STYLE_INDEX_INVALID",
    severity: "degraded",
    subject: "cell style",
    avoidable: false,
  },
  XLSX_RELATIONSHIP_TARGET_MISSING: {
    contractCode: "xlsx/RELATIONSHIP_TARGET_MISSING",
    severity: "degraded",
    subject: "workbook part",
    avoidable: false,
  },
  XLSX_CHART_WORKBOOK_MISSING: {
    contractCode: "xlsx/CHART_DATA_MISSING",
    severity: "degraded",
    subject: "chart",
    avoidable: false,
  },
  XLSX_TABLE_REF_INVALID: {
    contractCode: "xlsx/TABLE_REFERENCE_INVALID",
    severity: "degraded",
    subject: "table",
    avoidable: true,
    remediation: "Point the table at a range inside the sheet's used dimensions.",
  },
  XLSX_TABLE_RELATIONSHIP_BROKEN: {
    contractCode: "xlsx/TABLE_RELATIONSHIP_BROKEN",
    severity: "degraded",
    subject: "table",
    avoidable: false,
  },
  XLSX_RANGE_REF_INVALID_LOSS: {
    contractCode: "xlsx/RANGE_REFERENCE_CLIPPED",
    severity: "degraded",
    subject: "range reference",
    avoidable: true,
    remediation: "Point the range at cells inside the sheet's used dimensions.",
  },
  XLSX_SHEET_NAME_SUBSTITUTED: {
    contractCode: "xlsx/SHEET_NAME_SUBSTITUTED",
    severity: "substituted",
    subject: "sheet name",
    avoidable: true,
    remediation: "Use a unique sheet name under 32 characters without \\ / * ? : [ ].",
  },
  XLSX_TABLE_NAME_SUBSTITUTED: {
    contractCode: "xlsx/TABLE_NAME_SUBSTITUTED",
    severity: "substituted",
    subject: "table name",
    avoidable: true,
    remediation: "Give each table a unique name.",
  },
  XLSX_WORKSHEET_DIMENSION_MISMATCH: {
    contractCode: "xlsx/DIMENSION_MISMATCH",
    severity: "degraded",
    subject: "worksheet dimensions",
    avoidable: false,
  },
};


/**
 * Repair actions report the short form of a code (`MACRO_STRIPPED`), while
 * input warnings report the prefixed form (`XLSX_RELAXED_MERGES`). Both reach
 * `classifyWarning`, so the short vocabulary is mapped here.
 *
 * Severity follows what the caller actually loses. Removing a macro project or
 * an external connection is `dropped` — the content is gone, and a workbook
 * that silently loses its macros is exactly the case a regulated caller needs
 * told about. Renaming a sheet or clamping a style index is `substituted`: the
 * cell is still there, wearing something else. Repairs that only fix OOXML
 * plumbing — content types, relationship ids, a stale dimension record — lose
 * no user content at all and are diagnostics, because counting them would make
 * `losses: []` unreachable for a workbook that merely needed tidying.
 */
const REPAIR_ACTION_ALIASES: Readonly<Record<string, string>> = {
  MACRO_STRIPPED: "XLSX_MACRO_STRIPPED",
  EXTERNAL_CONNECTION_STRIPPED: "XLSX_EXTERNAL_CONNECTION_STRIPPED",
  REMOVE_INVALID_DEFINED_NAMES: "XLSX_NAMED_RANGE_DEAD_REF",
  DEFINED_NAME_INVALID: "XLSX_NAMED_RANGE_DEAD_REF",
  REMOVE_INVALID_HYPERLINKS: "XLSX_HYPERLINK_TARGET_INVALID",
  HYPERLINK_TARGET_INVALID: "XLSX_HYPERLINK_TARGET_INVALID",
  MERGE_OVERLAP: "XLSX_MERGE_OVERLAP",
  REPAIR_MERGES: "XLSX_MERGE_OVERLAP",
  MERGE_RANGE_OUT_OF_BOUNDS: "XLSX_MERGE_RANGE_OUT_OF_BOUNDS",
  SHARED_STRING_INDEX_OOB: "XLSX_SHARED_STRING_INDEX_OOB",
  REPAIR_SHARED_STRING_INDEX: "XLSX_SHARED_STRING_INDEX_OOB",
  STYLE_INDEX_OOB: "XLSX_STYLE_INDEX_OOB",
  CLAMP_STYLE_INDEX: "XLSX_STYLE_INDEX_OOB",
  INVALID_TABLE_REF: "XLSX_TABLE_REF_INVALID",
  CLIP_TABLE_REF: "XLSX_TABLE_REF_INVALID",
  CLIP_DATA_VALIDATION_RANGES: "XLSX_RANGE_REF_INVALID_LOSS",
  INVALID_RANGE_REF: "XLSX_RANGE_REF_INVALID_LOSS",
  SHEET_NAME_INVALID: "XLSX_SHEET_NAME_SUBSTITUTED",
  NORMALIZE_SHEET_NAMES: "XLSX_SHEET_NAME_SUBSTITUTED",
  DUPLICATE_SHEET_NAME: "XLSX_SHEET_NAME_SUBSTITUTED",
  DUPLICATE_TABLE_NAME: "XLSX_TABLE_NAME_SUBSTITUTED",
  NORMALIZE_DUPLICATE_TABLE_NAME: "XLSX_TABLE_NAME_SUBSTITUTED",
  MISSING_WORKSHEET_PART: "XLSX_RELATIONSHIP_TARGET_MISSING",
  DIMENSION_MISMATCH: "XLSX_WORKSHEET_DIMENSION_MISMATCH",
};

/**
 * Codes that are observations, not fidelity deviations.
 *
 * The relaxed-input coercions produce the workbook the caller meant. The
 * `XLSX_LINT_*` findings are the *value* of `validate` rather than a loss from
 * rendering, and the advisory codes report scale or portability characteristics
 * of output that is otherwise exactly right.
 */
const DIAGNOSTIC_CODES: ReadonlySet<string> = new Set([
  "XLSX_RELAXED_FREEZE_PANE",
  "XLSX_RELAXED_MERGES",
  "XLSX_RELAXED_META_SUBJECT",
  "XLSX_RELAXED_PRESET_NAME",
  "XLSX_LINT_AUTOFILTER_INVALID_REF",
  "XLSX_LINT_AUTOFILTER_OUT_OF_BOUNDS",
  "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE",
  "XLSX_LINT_CF_REF_INVALID",
  "XLSX_LINT_CF_REF_OUT_OF_BOUNDS",
  "XLSX_LINT_CHART_CROSSES_PAGE_BREAK",
  "XLSX_LINT_CHART_EMPTY_SERIES",
  "XLSX_LINT_COLUMN_WIDTH_CAPPED",
  "XLSX_LINT_SHEET_NAME_DUPLICATE",
  "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS",
  "XLSX_LINT_SHEET_NAME_RESERVED",
  "XLSX_LINT_SHEET_NAME_TOO_LONG",
  "XLSX_LINT_WIDE_PRINT_RANGE",
  "XLSX_DATE_BEFORE_1900",
  "XLSX_DUPLICATE_SHEET_NAME",
  "XLSX_FORMULA_CACHED_VALUE_MISSING",
  "XLSX_GOOGLE_SHEETS_IMPORT_RISK",
  "XLSX_HIGH_UNIQUE_STRING_COUNT",
  "XLSX_LARGE_FILE_WARNING",
  "XLSX_NUMBERS_COMPATIBILITY_WARNING",
  "XLSX_RANGE_REF_INVALID",
  "XLSX_SHEET_NAME_INVALID",
  "XLSX_STREAM_MODE_RECOMMENDED",
  "XLSX_STYLE_CARDINALITY_EXCESSIVE",
  "XLSX_TABLE_NAME_DUPLICATE",
  // Repairs that only correct OOXML plumbing: no authored content changes.
  "FIX_CONTENT_TYPES",
  "MISSING_CONTENT_TYPE",
  "EXTRA_CONTENT_TYPE",
  "DEDUPE_RELATIONSHIP_IDS",
  "DUPLICATE_RELATIONSHIP_ID",
  "REMOVE_ORPHAN_RELATIONSHIPS",
  "RECALCULATE_DIMENSION",
  "ADD_FORMULA_CACHED_VALUES",
  "FORMULA_CACHED_VALUE_MISSING",
]);

const UNCLASSIFIED: TaxonomyEntry = {
  contractCode: "xlsx/UNCLASSIFIED_CONDITION",
  severity: "degraded",
  subject: "workbook",
  avoidable: false,
};

/** Path segment names the spreadsheet model uses → OC-1 locator kinds. */
const SEGMENT_KINDS: Readonly<Record<string, string>> = {
  sheets: "sheet",
  rows: "row",
  cells: "cell",
  columns: "column",
  charts: "chart",
  tables: "table",
};

const PATH_TOKEN = /([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?/g;

/**
 * Build a locator from an engine path such as `sheets[0].rows[3].cells[2]`.
 *
 * Returns `undefined` when the path addresses nothing structural — a locator
 * promises the caller can navigate to the position, and a fabricated one is
 * worse than none (R22 binds the address to specific bytes).
 */
export function locatorFromEnginePath(path: string, artifact: string): Locator | undefined {
  const segments: { kind: string; index: number }[] = [];
  for (const match of path.matchAll(PATH_TOKEN)) {
    const kind = SEGMENT_KINDS[match[1] ?? ""];
    const index = match[2];
    if (kind !== undefined && index !== undefined) {
      segments.push({ kind, index: Number(index) });
    }
  }
  if (segments.length === 0) return undefined;

  const text = `${artifact}/xlsx:${segments
    .map((segment) => `${segment.kind}[${String(segment.index)}]`)
    .join("/")}`;
  // Round-tripping through the codec keeps C9 true by construction.
  return parseLocator(text);
}

export interface ClassifiedWarning {
  loss?: Loss;
  diagnostic?: Diagnostic;
}

export function classifyWarning(warning: EngineWarning, artifact: string): ClassifiedWarning {
  const code = REPAIR_ACTION_ALIASES[warning.code] ?? warning.code;
  const locator =
    warning.path === undefined ? undefined : locatorFromEnginePath(warning.path, artifact);

  if (DIAGNOSTIC_CODES.has(code)) {
    return {
      diagnostic: createDiagnostic({
        code: `xlsx/${code}` as ErrorCode,
        severity: "info",
        phase: "input",
        message: warning.message,
        ...(locator !== undefined ? { locator } : {}),
        details: { path: warning.path ?? null, engineCode: warning.code },
      }),
    };
  }

  const entry = TAXONOMY[code] ?? UNCLASSIFIED;

  return {
    loss: createLoss({
      code: entry.contractCode,
      severity: entry.severity,
      subject: entry.subject,
      message: warning.message,
      ...(locator !== undefined ? { locator } : {}),
      ...(warning.from !== undefined ? { expected: String(warning.from) } : {}),
      ...(warning.to !== undefined ? { actual: String(warning.to) } : {}),
      avoidable: entry.avoidable,
      // R19: an avoidable loss the caller cannot act on is not actionable.
      ...(entry.remediation !== undefined ? { remediation: entry.remediation } : {}),
      details: { path: warning.path ?? null, engineCode: warning.code },
    }),
  };
}

/** Loss codes this package can emit, for the C5 registry check. */
export const XLSX_LOSS_CODES: readonly ErrorCode[] = [
  ...new Set(Object.values(TAXONOMY).map((entry) => entry.contractCode)),
  UNCLASSIFIED.contractCode,
];

/** Engine warning codes this package classifies, for the C5 coverage check. */
export const CLASSIFIED_ENGINE_CODES: readonly string[] = [
  ...Object.keys(TAXONOMY),
  ...Object.keys(REPAIR_ACTION_ALIASES),
  ...DIAGNOSTIC_CODES,
];
