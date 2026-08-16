/**
 * OC-1 conformance manifest for `@runstamp/xlsx` (OC-1 §7).
 *
 * Consumed by `pnpm contract:verify xlsx`. Plain ESM so the runner can import it
 * without a build step, and so the fixtures stay readable as data rather than
 * being buried in a test file.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { completeFixtureCoverage } from "@runstamp/contract/verify";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");

/**
 * Engine warning codes this package classifies into losses or diagnostics.
 *
 * Declared here rather than imported from `src/ops/losses.ts`: R35 keeps the
 * taxonomy off the `./ops` surface, and an independent declaration is what lets
 * C5 detect drift.
 */
const CLASSIFIED = [
  // Repair actions report the short form of a code; the taxonomy aliases them.
  "MACRO_STRIPPED",
  "EXTERNAL_CONNECTION_STRIPPED",
  "REMOVE_INVALID_DEFINED_NAMES",
  "DEFINED_NAME_INVALID",
  "REMOVE_INVALID_HYPERLINKS",
  "HYPERLINK_TARGET_INVALID",
  "MERGE_OVERLAP",
  "REPAIR_MERGES",
  "MERGE_RANGE_OUT_OF_BOUNDS",
  "SHARED_STRING_INDEX_OOB",
  "REPAIR_SHARED_STRING_INDEX",
  "STYLE_INDEX_OOB",
  "CLAMP_STYLE_INDEX",
  "INVALID_TABLE_REF",
  "CLIP_TABLE_REF",
  "CLIP_DATA_VALIDATION_RANGES",
  "INVALID_RANGE_REF",
  "SHEET_NAME_INVALID",
  "NORMALIZE_SHEET_NAMES",
  "DUPLICATE_SHEET_NAME",
  "DUPLICATE_TABLE_NAME",
  "NORMALIZE_DUPLICATE_TABLE_NAME",
  "MISSING_WORKSHEET_PART",
  "DIMENSION_MISMATCH",
  "FIX_CONTENT_TYPES",
  "MISSING_CONTENT_TYPE",
  "EXTRA_CONTENT_TYPE",
  "DEDUPE_RELATIONSHIP_IDS",
  "DUPLICATE_RELATIONSHIP_ID",
  "REMOVE_ORPHAN_RELATIONSHIPS",
  "RECALCULATE_DIMENSION",
  "ADD_FORMULA_CACHED_VALUES",
  "FORMULA_CACHED_VALUE_MISSING",
  "XLSX_RANGE_REF_INVALID_LOSS",
  "XLSX_SHEET_NAME_SUBSTITUTED",
  "XLSX_TABLE_NAME_SUBSTITUTED",
  // Render-time deviations that cost fidelity.
  "XLSX_MACRO_STRIPPED",
  "XLSX_EXTERNAL_CONNECTION_STRIPPED",
  "XLSX_FORMULA_REF_BROKEN",
  "XLSX_NAMED_RANGE_DEAD_REF",
  "XLSX_HYPERLINK_TARGET_INVALID",
  "XLSX_MERGE_OVERLAP",
  "XLSX_MERGE_RANGE_OUT_OF_BOUNDS",
  "XLSX_SHARED_STRING_INDEX_OOB",
  "XLSX_STYLE_INDEX_OOB",
  "XLSX_RELATIONSHIP_TARGET_MISSING",
  "XLSX_CHART_WORKBOOK_MISSING",
  "XLSX_TABLE_REF_INVALID",
  "XLSX_TABLE_RELATIONSHIP_BROKEN",
  "XLSX_WORKSHEET_DIMENSION_MISMATCH",
  // Observations: coercions that produce the workbook the caller meant, lint
  // findings that are the value of `validate`, and advisory scale reports.
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
];

const CLEAN = {
  sheets: [
    {
      name: "Sheet1",
      rows: [
        { cells: [{ value: "Name" }, { value: "Amount" }] },
        { cells: [{ value: "Alice" }, { value: 100 }] },
      ],
    },
  ],
};

/**
 * A rendered workbook for the projected structured-workflow verbs, which take
 * `{ workbookBase64 }` rather than raw bytes.
 */
const { render: renderWorkbook } = await import(resolve(pkg, "dist/ops/index.js"));
const renderedWorkbook = await renderWorkbook(CLEAN);
if (!renderedWorkbook.ok) {
  throw new Error(`Conformance manifest could not render its workflow fixture: ${renderedWorkbook.error.message}`);
}
const workflowRequest = { workbookBase64: Buffer.from(renderedWorkbook.value.bytes).toString("base64") };

/** @type {import("@runstamp/contract/verify").ConformanceManifest} */
export default {
  package: "@runstamp/xlsx",
  domain: "xlsx",
  ops: resolve(pkg, "dist/ops/index.js"),
  descriptor: resolve(pkg, "dist/ops/descriptor.js"),

  fixtures: await completeFixtureCoverage(resolve(pkg, "dist/ops/descriptor.js"), [
    {
      name: "clean-workbook",
      verb: "render",
      input: CLEAN,
      expect: "ok",
      // R17: the positive fidelity claim. Without it the ledger is unfalsifiable.
      lossFree: true,
    },
    {
      name: "formulas-are-evaluated",
      verb: "render",
      // Formula evaluation was gated behind the removed Pro tier: the free build
      // stored formulas without computing them. Nothing is lost now, so the
      // ledger stays empty.
      input: {
        sheets: [
          {
            name: "Calc",
            rows: [
              { cells: [{ value: 2 }, { value: 3 }, { formula: "A1+B1" }] },
            ],
          },
        ],
      },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "legacy-shapes-are-coerced-not-lost",
      verb: "render",
      // R15's dividing line. `merges` and `meta.subject` are legacy spellings of
      // `mergedCells` and `meta.description`; the workbook produced is exactly
      // the one the caller meant, so these are diagnostics and the ledger stays
      // empty. Counting them would make `losses: []` unreachable for correct
      // input and destroy the signal the ledger carries.
      input: {
        meta: { subject: "Pipeline review" },
        sheets: [{ name: "S", rows: [{ cells: [{ value: "a" }, {}] }], merges: ["A1:B1"] }],
      },
      options: { render: { relaxed: true } },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "rejected-schema",
      verb: "render",
      // R4: bad data is a document condition, so it arrives as a typed failure
      // with an actionable remediation rather than as a throw. Before the xlsx
      // legacy table existed this surfaced as UNMAPPED_ERROR with the generic
      // "report it so a mapping can be added" text — an error a caller could not
      // act on, which R10 forbids.
      input: "not a workbook",
      expect: "fail",
      code: "common/SCHEMA_REJECTED",
    },
    {
      name: "merge-consuming-a-populated-cell",
      verb: "render",
      // Excel cannot represent a merge that swallows a populated cell, so this
      // is a document condition rather than a loss: refusing is more faithful
      // than silently discarding the cell.
      input: {
        sheets: [{ name: "S", rows: [{ cells: [{ value: "a" }, { value: "b" }] }], mergedCells: ["A1:B1"] }],
      },
      expect: "fail",
      code: "common/SCHEMA_REJECTED",
    },
    {
      name: "repair-strips-macros-and-connections",
      verb: "repair",
      // The adversarial case C11 exists for. This workbook carries a VBA
      // project and a live external connection; repair has to rewrite the
      // package and cannot preserve either, so both are gone from the output.
      // A caller who is told only "repaired: true" has silently lost the
      // automation their workbook depended on.
      input: readFileSync(resolve(here, "fixtures/macro-and-connection.xlsm")),
      expect: "ok",
      losses: [
        { code: "xlsx/MACRO_STRIPPED", severity: "dropped", count: 1 },
        { code: "xlsx/EXTERNAL_CONNECTION_STRIPPED", severity: "dropped", count: 1 },
      ],
    },
    {
      // C18: `validate` had no fixture, so nothing in the kit ever invoked it.
      name: "validate-a-clean-workbook",
      verb: "validate",
      input: CLEAN,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "validate-reports-a-hostile-workbook",
      kind: "hostile",
      verb: "validate",
      input: { sheets: "not-an-array" },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "validate-reports-the-null-boundary",
      kind: "boundary",
      verb: "validate",
      input: null,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "inspect-a-clean-workbook",
      verb: "inspect",
      input: CLEAN,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "parse-a-workbook-into-the-structured-model",
      verb: "parse",
      input: workflowRequest,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "transform-maps-a-workbook",
      verb: "transform",
      input: workflowRequest,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "convert-exports-a-workbook",
      verb: "convert",
      input: workflowRequest,
      expect: "ok",
      lossFree: true,
    },
  ]),

  codeScan: {
    files: [
      resolve(pkg, "src/relaxed-input.ts"),
      resolve(pkg, "src/quality/lint.ts"),
      resolve(pkg, "src/quality/shared-quality.ts"),
      resolve(pkg, "src/quality/workbook-quality.ts"),
    ],
    pattern: String.raw`["'](XLSX_[A-Z0-9_]+)["']`,
    classified: CLASSIFIED,
  },

  surfaces: {
    ops: resolve(pkg, "dist/ops/index.d.ts"),
    root: resolve(pkg, "dist/index.d.ts"),
  },

  apiReport: resolve(pkg, "etc/json-to-xlsx.api.md"),
};
