/**
 * OC-1 conformance manifest for `@runstamp/pdf` (OC-1 §7).
 *
 * Consumed by `pnpm contract:verify pdf`. Plain ESM so the runner can import it
 * without a build step, and so the fixtures stay readable as data rather than
 * being buried inside a test file.
 *
 * Every lossy fixture here corresponds to a defect the Phase 4 audit found in
 * shipped code; the clean fixtures exist so `losses: []` keeps meaning something.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { completeFixtureCoverage } from "@runstamp/contract/verify";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");

/**
 * Engine warning codes this package classifies into losses or diagnostics.
 *
 * Declared here rather than imported from `src/ops/losses.ts` on purpose: R35
 * keeps `CLASSIFIED_ENGINE_CODES` off the `./ops` surface, and an independent
 * declaration is what lets C5 detect drift. Add a code to the taxonomy without
 * adding it here and the gate fails — which is the point.
 */
const CLASSIFIED = [
  "PDF_WINANSI_UNMAPPABLE",
  "PDF_FONT_GLYPH_MISSING",
  "PDF_PAGE_SIZE_CLAMPED",
  "PDF_ELEMENT_PAGE_OVERFLOW",
  "PDF_UNBREAKABLE_TOKEN_WRAPPED",
  "PDF_SCHEMA_VALIDATION_FAILED",
  "PDF_RELAXED_TABLE_ROWS",
  "PDF_RELAXED_LIST_ITEMS",
  "PDF_TABLE_HEADER_ONLY",
];

const page = { size: "Letter", margin: 72 };

/**
 * Bytes for the byte-input verbs, produced by the package's own `render`.
 *
 * Generated rather than committed so the fixture can never drift from what the
 * engine actually emits — a stale committed PDF would let `validate` and
 * `repair` pass against a file the current writer no longer produces. `render`
 * is deterministic (C7), so this is stable across runs and processes.
 */
const { render } = await import(resolve(pkg, "dist/ops/index.js"));
const rendered = await render({
  page,
  meta: { title: "conformance" },
  children: [{ type: "paragraph", value: "Byte-input fixture." }],
});
if (!rendered.ok) {
  throw new Error(`Conformance manifest could not render its byte fixture: ${rendered.error.message}`);
}
const pdfBytes = Buffer.from(rendered.value.bytes);

/**
 * A document with something worth redacting, for the projected evidence verbs.
 *
 * The evidence extension takes `{ pdfBase64, query }` rather than raw bytes, so
 * these fixtures address it in its own shape.
 */
const evidence = await render({
  page,
  meta: { title: "evidence" },
  children: [{ type: "paragraph", value: "Confidential: ACME-1234" }],
});
if (!evidence.ok) {
  throw new Error(`Conformance manifest could not render its evidence fixture: ${evidence.error.message}`);
}
const evidenceRequest = {
  pdfBase64: Buffer.from(evidence.value.bytes).toString("base64"),
  query: "ACME",
};

/** @type {import("@runstamp/contract/verify").ConformanceManifest} */
export default {
  package: "@runstamp/pdf",
  domain: "pdf",
  ops: resolve(pkg, "dist/ops/index.js"),
  descriptor: resolve(pkg, "dist/ops/descriptor.js"),

  fixtures: await completeFixtureCoverage(resolve(pkg, "dist/ops/descriptor.js"), [
    {
      name: "clean-ascii",
      verb: "render",
      input: {
        page,
        meta: { title: "clean" },
        children: [{ type: "paragraph", value: "Plain ASCII text." }],
      },
      expect: "ok",
      // R17: the positive fidelity claim. Without this the ledger is unfalsifiable.
      lossFree: true,
    },
    {
      name: "covered-scripts",
      verb: "render",
      // Greek and Cyrillic ARE in the bundled Lato fallback, so reporting them
      // would be a false positive. A ledger with false positives is not a ledger.
      input: { page, children: [{ type: "paragraph", value: "α β Привет" }] },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "rejected-schema",
      verb: "render",
      // R4: bad data is a document condition, so it arrives as a typed failure
      // with an actionable remediation rather than as a throw.
      input: "not a document",
      expect: "fail",
      code: "common/SCHEMA_REJECTED",
    },
    {
      name: "cjk-without-glyph-coverage",
      verb: "render",
      // The audit's most serious finding: a well-formed PDF with the text simply
      // absent, previously reported as `losses: []`.
      input: { page, children: [{ type: "paragraph", value: "漢字" }] },
      expect: "ok",
      losses: [{ code: "pdf/TEXT_GLYPH_MISSING", severity: "dropped", count: 2 }],
    },
    {
      name: "form-widget-unmappable-text",
      verb: "render",
      // Widget appearance streams used the WinAnsi encoder with no warning sink.
      input: { children: [{ name: "note", type: "form-text", value: "α ≥ 5" }] },
      expect: "ok",
      losses: [{ code: "pdf/TEXT_CHARACTER_UNMAPPABLE", severity: "substituted", count: 2 }],
    },
    {
      name: "page-size-out-of-range",
      verb: "render",
      input: {
        page: { size: { width: 20_000, height: 20_000 }, margin: 72 },
        children: [{ type: "paragraph", value: "oversized" }],
      },
      expect: "ok",
      losses: [{ code: "pdf/PAGE_SIZE_CLAMPED", severity: "degraded" }],
    },
    {
      name: "element-taller-than-page",
      verb: "render",
      input: { page, children: [{ type: "container", style: { height: 5000 }, children: [] }] },
      expect: "ok",
      losses: [{ code: "pdf/ELEMENT_OVERFLOWS_PAGE", severity: "degraded" }],
    },
    {
      name: "unbreakable-token",
      verb: "render",
      input: { page, children: [{ type: "paragraph", value: "x".repeat(400) }] },
      expect: "ok",
      losses: [{ code: "pdf/TOKEN_WRAPPED", severity: "degraded" }],
    },
    {
      name: "page-shorter-than-one-line",
      verb: "render",
      // Not a loss but a C6 case: this looped until the heap was exhausted before
      // the paginator learned to make forward progress.
      // margin 2 leaves 14pt of printable height, which is less than one line
      // box; with margin 0 the line fits and there is nothing to report.
      input: {
        page: { size: { width: 300, height: 18 }, margin: 2 },
        children: [{ type: "paragraph", value: "hello world" }],
      },
      expect: "ok",
      losses: [{ code: "pdf/ELEMENT_OVERFLOWS_PAGE", severity: "degraded" }],
    },

    // The byte-input verbs. Until C18 was written, `render` was the only verb
    // with a fixture, so four of this package's five operations were certified
    // by nothing — and a receipt bug in `extract` sat unnoticed because no gate
    // ever invoked it.
    {
      name: "validate-clean-pdf",
      verb: "validate",
      input: pdfBytes,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "repair-rebuilds-xref",
      verb: "repair",
      // Repair always rewrites the cross-reference table from scanned offsets,
      // and says so. R16: a rewrite the caller cannot see is a silent loss.
      input: pdfBytes,
      expect: "ok",
      losses: [{ code: "pdf/REPAIR_APPLIED", severity: "substituted" }],
    },
    {
      name: "transform-linearize",
      verb: "transform",
      input: pdfBytes,
      options: { plan: { kind: "linearize" } },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "extract-signatures-from-unsigned",
      verb: "extract",
      // An unsigned document yields an empty record set, not a failure: absence
      // of signatures is an answer, not an error (R4).
      input: pdfBytes,
      options: { selector: "signatures" },
      expect: "ok",
      lossFree: true,
    },

    // The verbs projected from the embedded evidence extension. These were
    // implemented and tested inside this package all along and reachable
    // through no contract at all until they were given verbs.
    {
      name: "redact-strips-graphics-and-metadata",
      verb: "redact",
      // Sanitizing to remove located text cannot carry non-text graphics or
      // source metadata across, and canonical geometry is not the source's exact
      // font metrics. All three are real losses and the caller is told before
      // they distribute the file.
      input: evidenceRequest,
      expect: "ok",
      losses: [
        { code: "pdf/PDF_GRAPHICS_NOT_PRESERVED", severity: "dropped" },
        { code: "pdf/PDF_METADATA_STRIPPED", severity: "dropped" },
        { code: "pdf/PDF_GEOMETRY_APPROXIMATED", severity: "degraded" },
      ],
    },
    {
      name: "convert-exports-a-sanitized-derivative",
      verb: "convert",
      input: evidenceRequest,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "inspect-evidence-structure",
      verb: "inspect",
      // Three read-only operations share this verb, so the call must say which.
      options: { operation: "evidence" },
      input: evidenceRequest,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "find-text-in-pdf-evidence",
      verb: "inspect",
      options: { operation: "find" },
      input: evidenceRequest,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "preview-pdf-redaction",
      verb: "inspect",
      options: { operation: "redaction-preview" },
      input: evidenceRequest,
      expect: "ok",
      lossFree: true,
    },
  ]),

  codeScan: {
    files: [
      resolve(pkg, "src/engine.ts"),
      resolve(pkg, "src/edge-policy.ts"),
      resolve(pkg, "src/relaxed-input.ts"),
      resolve(pkg, "src/phases/phase3-layout.ts"),
    ],
    pattern: String.raw`\bcode:\s*"(PDF_[A-Z0-9_]+)"`,
    classified: CLASSIFIED,
  },

  surfaces: {
    ops: resolve(pkg, "dist/ops/index.d.ts"),
    root: resolve(pkg, "dist/index.d.ts"),
  },

  apiReport: resolve(pkg, "etc/json-to-pdf.api.md"),
};
