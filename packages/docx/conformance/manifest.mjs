/**
 * OC-1 conformance manifest for `@runstamp/docx` (OC-1 §7).
 *
 * Consumed by `pnpm contract:verify docx`. Plain ESM so the runner can import it
 * without a build step, and so the fixtures stay readable as data rather than
 * being buried in a test file.
 *
 * The lossy fixtures are documents whose faithful conversion is known to be
 * impossible; the clean ones exist so `losses: []` keeps meaning something.
 */

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
 * C5 detect drift. Add a code to the engine without adding it here and the gate
 * fails, which is the point.
 */
const CLASSIFIED = [
  "DOCX_RELAXED_THEME_STRING",
  "DOCX_RELAXED_CODE_BLOCK",
  "DOCX_RELAXED_MARGIN_TWIPS",
  "DOCX_RELAXED_PAGE_NUMBERS",
  "DOCX_RELAXED_META_KEY",
  "DOCX_RELAXED_CHART_POINTS",
  "DOCX_RELAXED_KIND_INJECTED",
  "DOCX_VALIDATE_SCHEMA",
  "DOCX_VALIDATE_IMAGE_NO_SRC",
  "DOCX_VALIDATE_TABLE_EMPTY",
  "DOCX_VALIDATE_CHART_NO_DATA",
  "DOCX_VALIDATE_HEADING_EMPTY",
  "DOCX_SERIALIZER_WARNING",
  "DOCX_STRICT_VALIDATOR_WARNING",
  "DOCX_HTML_CONVERSION_WARNING",
  "DOCX_PDF_BRIDGE_FALLBACK",
  "DOCX_HYDRATE_UNFILLED_PLACEHOLDER",
  "DOCX_HYDRATE_SPLIT_PLACEHOLDER",
];

const paragraph = (text) => ({ type: "paragraph", text });

const CLEAN = {
  type: "DocxDocument",
  pageSize: "letter",
  pages: [{ elements: [paragraph("Plain ASCII text.")] }],
};

/**
 * Two rendered documents for `diff`, produced by the package's own `render`.
 *
 * Generated rather than committed for the same reason as the PDF byte fixtures:
 * a stale binary would let the gate pass against output the current writer no
 * longer produces. `render` is deterministic (C7), so these are stable.
 */
const { render: renderForDiff } = await import(resolve(pkg, "dist/ops/index.js"));
const renderBytes = async (document) => {
  const result = await renderForDiff(document);
  if (!result.ok) throw new Error(`Conformance manifest could not render its diff fixture: ${result.error.message}`);
  return Buffer.from(result.value.bytes);
};
const diffPair = [
  await renderBytes(CLEAN),
  await renderBytes({ ...CLEAN, pages: [{ elements: [paragraph("Plain ASCII text, revised.")] }] }),
];

/**
 * A rendered document for the projected controlled-document verbs, which take
 * `{ artifactBase64 }` rather than raw bytes.
 */
const controlledRequest = {
  artifactBase64: (await renderBytes({
    ...CLEAN,
    pages: [{ elements: [paragraph("Confidential: ACME-1234")] }],
  })).toString("base64"),
};
const { importControlledDocx } = await import(resolve(pkg, "dist/index.js"));
const controlledDocument = await importControlledDocx(Buffer.from(controlledRequest.artifactBase64, "base64"));
const controlledFind = await (await import(resolve(pkg, "dist/ops/index.js"))).inspect(
  { document: controlledDocument, query: "ACME" },
  { operation: "find" },
);
if (!controlledFind.ok) throw new Error(`Conformance manifest could not find its controlled text: ${controlledFind.error.message}`);
const controlledLocators = controlledFind.value.output.matches.map((match) => match.locator);

/** @type {import("@runstamp/contract/verify").ConformanceManifest} */
export default {
  package: "@runstamp/docx",
  domain: "docx",
  ops: resolve(pkg, "dist/ops/index.js"),
  descriptor: resolve(pkg, "dist/ops/descriptor.js"),

  fixtures: await completeFixtureCoverage(resolve(pkg, "dist/ops/descriptor.js"), [
    {
      name: "clean-document",
      verb: "render",
      input: {
        type: "DocxDocument",
        pageSize: "letter",
        pages: [{ elements: [paragraph("Plain ASCII text.")] }],
      },
      expect: "ok",
      // R17: the positive fidelity claim. Without it the ledger is unfalsifiable.
      lossFree: true,
    },
    {
      name: "clean-table",
      verb: "render",
      // Table conversion was gated behind the removed Pro tier; a table now
      // renders as a table rather than being flattened to text, so nothing is
      // lost and the ledger stays empty.
      input: {
        type: "DocxDocument",
        pageSize: "letter",
        pages: [
          {
            elements: [
              {
                type: "table",
                rows: [
                  { isHeader: true, cells: [{ text: "Name" }, { text: "Value" }] },
                  { cells: [{ text: "Alpha" }, { text: "1" }] },
                ],
              },
            ],
          },
        ],
      },
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
      code: "docx/DOC_INVALID",
    },
    {
      name: "clean-html",
      verb: "transform",
      input: "<h1>Title</h1><p>A paragraph the adapter represents exactly.</p>",
      expect: "ok",
      lossFree: true,
    },
    {
      name: "html-with-unrepresentable-element",
      verb: "transform",
      // Word has no equivalent for an arbitrary custom element. The adapter
      // keeps the text and drops the element, which is a real degradation the
      // caller has no other way to learn about.
      input: "<p>Kept.</p><custom-tag>Wrapped content</custom-tag>",
      expect: "ok",
      losses: [{ code: "docx/HTML_CONSTRUCT_UNSUPPORTED", severity: "degraded", count: 1 }],
    },
    {
      name: "html-image-without-source",
      verb: "transform",
      // The image is skipped entirely: the reader sees a document with a figure
      // simply missing, and before this the ledger said nothing.
      input: '<p>Before.</p><img src=""><p>After.</p>',
      expect: "ok",
      losses: [{ code: "docx/HTML_CONSTRUCT_UNSUPPORTED", severity: "degraded", count: 1 }],
    },
    {
      name: "clean-convert-to-pdf",
      verb: "convert",
      options: { to: "pdf" },
      input: {
        type: "DocxDocument",
        pageSize: "letter",
        pages: [{ elements: [paragraph("Converted faithfully.")] }],
      },
      expect: "ok",
      lossFree: true,
    },

    // C18: `parse`, `validate` and `diff` were registered operations with no
    // fixture, so half this package's catalog was certified by nothing.
    {
      name: "parse-a-clean-document",
      verb: "parse",
      input: CLEAN,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "validate-a-clean-document",
      verb: "validate",
      input: CLEAN,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "validate-reports-a-hostile-document",
      kind: "hostile",
      verb: "validate",
      input: { type: "not-a-docx-document" },
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
      name: "diff-two-revisions",
      verb: "diff",
      // A tracked-change artifact between two renders that differ by one run of
      // text. `author`/`date` are pinned because a diff that stamped "now" would
      // be non-deterministic, and C7 would say so.
      input: diffPair,
      options: { author: "conformance", date: "2026-01-01T00:00:00.000Z" },
      expect: "ok",
      lossFree: true,
    },

    // Projected from the embedded controlled-document extension. Redaction and
    // controlled round-trip shipped inside this package and were reachable
    // through no contract at all until they were given verbs.
    {
      name: "inspect-a-controlled-document",
      verb: "inspect",
      options: { operation: "controlled" },
      input: controlledRequest,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "find-text-in-a-controlled-document",
      verb: "inspect",
      options: { operation: "find" },
      input: { document: controlledDocument, query: "ACME" },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "preview-controlled-document-redaction",
      verb: "inspect",
      options: { operation: "redaction-preview" },
      input: { document: controlledDocument, locators: controlledLocators },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "redact-controlled-document-text",
      verb: "redact",
      input: { document: controlledDocument, locators: controlledLocators },
      expect: "ok",
    },
    {
      name: "redact-requires-a-plan",
      verb: "redact",
      // No redaction plan means nothing to apply. Reported as a typed failure
      // with a remediation rather than as a silently unmodified document.
      input: controlledRequest,
      expect: "fail",
    },
  ]),

  codeScan: {
    files: [resolve(pkg, "src/render.ts"), resolve(pkg, "src/relaxed-input.ts")],
    pattern: String.raw`\bcode:\s*['"](DOCX_[A-Z0-9_]+)['"]`,
    classified: CLASSIFIED,
  },

  surfaces: {
    ops: resolve(pkg, "dist/ops/index.d.ts"),
    root: resolve(pkg, "dist/index.d.ts"),
  },

  apiReport: resolve(pkg, "etc/json-to-docx.api.md"),
};
